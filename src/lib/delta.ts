/**
 * Delta update system for incremental card index updates.
 *
 * Instead of downloading the full 1.28MB cards_index.json on every update,
 * this module fetches small delta files (typically 10-50KB) containing only
 * the changes since the last version.
 */

import type { CardsData } from '../types/card';
import { applyPatch, type Operation } from 'rfc6902';

/**
 * Unified manifest format at /data/manifest.json
 * Contains version, file paths, and delta info in one place.
 */
interface UnifiedManifest {
  version: string;
  data_hash?: string;
  generated_at: string;
  files: Record<string, { cards_index: string; cards_index_base: string }>;
  delta?: {
    current_version: string;
    oldest_supported_version: string | null;
    available_deltas: Array<{
      from_version: string;
      to_version: string;
      file: string;
      size_bytes: number;
      operations: number;
    }>;
  };
}

/**
 * Normalized delta manifest interface for internal use.
 */
interface DeltaManifest {
  current_version: string;
  oldest_supported_version: string | null;
  deltas: Array<{
    from_version: string;
    to_version: string;
    patch_size: number;
    total_operations: number;
  }>;
}

interface Delta {
  from_version: string;
  to_version: string;
  generated_at: string;
  patch: Operation[];
  stats: {
    total_operations: number;
    add_operations: number;
    remove_operations: number;
    replace_operations: number;
  };
}

/**
 * Convert unified manifest delta section to normalized format
 */
function convertUnifiedToDeltaManifest(unified: UnifiedManifest): DeltaManifest | null {
  if (!unified.delta) {
    return null;
  }

  return {
    current_version: unified.delta.current_version,
    oldest_supported_version: unified.delta.oldest_supported_version,
    deltas: unified.delta.available_deltas.map(d => ({
      from_version: d.from_version,
      to_version: d.to_version,
      patch_size: d.size_bytes,
      total_operations: d.operations,
    })),
  };
}

/**
 * Get the unified manifest, reusing the globally pre-fetched promise when available.
 * The inline script in BaseLayout starts fetching manifest.json immediately at HTML parse time;
 * this function awaits that in-flight promise rather than issuing a second request.
 */
async function getManifest(): Promise<UnifiedManifest | null> {
  if (typeof window !== 'undefined' && window.__otogiManifestPromise) {
    return window.__otogiManifestPromise as Promise<UnifiedManifest | null>;
  }
  // Fallback: fetch ourselves (dev environment, SSR, or inline script disabled)
  try {
    const r = await fetch('/data/manifest.json', { cache: 'no-cache' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/**
 * Fetch delta manifest to check available deltas.
 */
async function fetchDeltaManifest(): Promise<DeltaManifest | null> {
  try {
    const unified = await getManifest();

    if (unified) {
      const deltaManifest = convertUnifiedToDeltaManifest(unified);
      if (deltaManifest) {
        console.log('[Delta] Using unified manifest');
        return deltaManifest;
      }
    }

    console.log('[Delta] No delta info in manifest');
    return null;
  } catch (error) {
    console.warn('[Delta] Failed to fetch manifest:', error);
    return null;
  }
}

/**
 * Fetch a specific delta file
 */
async function fetchDelta(fromVersion: string, toVersion: string): Promise<Delta | null> {
  try {
    const deltaFilename = `${fromVersion}_to_${toVersion}.json`;
    const response = await fetch(`/data/delta/${deltaFilename}`, {
      cache: 'force-cache' // Delta files are immutable
    });

    if (!response.ok) {
      console.warn(`[Delta] Failed to fetch delta ${deltaFilename}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('[Delta] Failed to fetch delta:', error);
    return null;
  }
}

/**
 * Apply delta patch to cached data using jsonpatch.
 *
 * @param cachedData - Current cached cards index
 * @param delta - Delta containing patch operations
 * @returns Updated cards index, or null if patch fails
 */
function applyDeltaPatch(cachedData: CardsData, delta: Delta): CardsData | null {
  try {
    // Clone the cached data to avoid mutation
    const dataCopy = JSON.parse(JSON.stringify(cachedData)) as CardsData;

    // Apply the jsonpatch operations (rfc6902 mutates in place).
    // rfc6902 v5 returns Array<Error | null> — one entry per operation,
    // where null = success and an Error object = failure.
    // We must check for any non-null entry, NOT errors.length > 0.
    const errors = applyPatch(dataCopy, delta.patch);
    const failures = errors.filter(e => e !== null);

    if (failures.length > 0) {
      console.error('[Delta] Patch application had errors:', failures);
      return null;
    }

    console.log(`[Delta] Successfully applied ${delta.stats.total_operations} operations`);
    return dataCopy;
  } catch (error) {
    console.error('[Delta] Failed to apply patch:', error);
    return null;
  }
}

/**
 * Find a chain of delta hops from `from` to `to`.
 *
 * The manifest stores sequential single-step deltas (V1→V2, V2→V3, …).
 * This function walks the chain so that a client on V1 with a manifest
 * showing V2→V3, V3→V4 can still reach V4 via two hops.
 *
 * @param deltas - Available deltas from the manifest
 * @param from - Starting version (user's current cached version)
 * @param to - Target version
 * @returns Ordered array of delta hops to apply, or null if no path exists
 */
export function findDeltaChain(
  deltas: DeltaManifest['deltas'],
  from: string,
  to: string
): DeltaManifest['deltas'] | null {
  if (from === to) return [];
  const path: DeltaManifest['deltas'] = [];
  let current = from;
  const visited = new Set<string>();
  while (current !== to) {
    if (visited.has(current)) return null; // cycle guard
    visited.add(current);
    const next = deltas.find(d => d.from_version === current);
    if (!next) return null; // no outgoing edge
    path.push(next);
    current = next.to_version;
  }
  return path;
}

/**
 * Try to update cached data using delta files.
 *
 * @param cachedData - Current cached cards index
 * @param targetVersion - Target version we want to reach
 * @returns Updated data if delta found and applied, null otherwise
 */
export async function tryDeltaUpdate(
  cachedData: CardsData,
  targetVersion: string
): Promise<CardsData | null> {
  const currentVersion = cachedData.data_hash ?? cachedData.version;

  if (!currentVersion) {
    console.log('[Delta] No version in cached data, skipping delta update');
    return null;
  }

  if (currentVersion === targetVersion) {
    console.log(`[Delta] Already at target version ${targetVersion}`);
    return cachedData; // Already up to date
  }

  console.log(`[Delta] Attempting delta update: ${currentVersion} -> ${targetVersion}`);

  // Fetch manifest to check available deltas
  const manifest = await fetchDeltaManifest();
  if (!manifest) {
    console.log('[Delta] No manifest available, falling back to full fetch');
    return null;
  }

  // Check if our cached version is supported
  if (manifest.oldest_supported_version &&
      currentVersion < manifest.oldest_supported_version) {
    console.log(`[Delta] Cached version ${currentVersion} too old (oldest: ${manifest.oldest_supported_version})`);
    return null;
  }

  // Find a chain of deltas from currentVersion to targetVersion.
  // The manifest stores sequential single-step deltas (V1→V2, V2→V3, …).
  // A user on V1 with a manifest showing V2→V3, V3→V4 needs chain-walking,
  // not a single-hop lookup.
  const chain = findDeltaChain(manifest.deltas, currentVersion, targetVersion);

  if (!chain) {
    console.log(`[Delta] No delta path from ${currentVersion} to ${targetVersion}`);
    return null;
  }

  console.log(`[Delta] Walking chain: ${[currentVersion, ...chain.map(d => d.to_version)].join(' → ')}`);

  // Fetch and apply each hop sequentially
  let workingData: CardsData = cachedData;
  for (const hop of chain) {
    console.log(`[Delta] Fetching hop ${hop.from_version} → ${hop.to_version} (${(hop.patch_size / 1024).toFixed(1)} KB, ${hop.total_operations} ops)`);
    const delta = await fetchDelta(hop.from_version, hop.to_version);
    if (!delta) {
      console.log(`[Delta] Failed to fetch hop ${hop.from_version} → ${hop.to_version}, falling back`);
      return null;
    }
    const patched = applyDeltaPatch(workingData, delta);
    if (!patched) {
      console.error(`[Delta] Failed to apply hop ${hop.from_version} → ${hop.to_version}, falling back`);
      return null;
    }
    workingData = patched;
  }

  console.log(`[Delta] ✓ Updated to version ${targetVersion} via ${chain.length}-hop chain`);
  return workingData;
}

/**
 * Calculate size savings from using delta vs full download.
 *
 * @param fullSize - Size of full index in bytes
 * @param deltaSize - Size of delta in bytes
 * @returns Percentage saved (0-100)
 */
export function calculateSavings(fullSize: number, deltaSize: number): number {
  if (fullSize === 0) return 0;
  return Math.round((1 - deltaSize / fullSize) * 100);
}

/**
 * Get the current version from the unified manifest.
 *
 * Used by cards.ts to determine target version for delta updates.
 *
 * @returns Current version string, or null if manifest not available
 */
export async function getCurrentVersion(): Promise<string | null> {
  try {
    const manifest = await getManifest();

    if (manifest) {
      // Prefer data_hash (content identity) for delta versioning
      if (manifest.data_hash) {
        return manifest.data_hash;
      }
      if (manifest.version) {
        return manifest.version;
      }
      // Fall back to delta.current_version if version not at top level
      if (manifest.delta?.current_version) {
        return manifest.delta.current_version;
      }
    }
  } catch (error) {
    console.warn('[Delta] Could not get version from manifest:', error);
  }

  return null;
}
