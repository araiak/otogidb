/**
 * Delta update system for incremental card index updates.
 *
 * Instead of downloading the full 1.28MB cards_index.json on every update,
 * this module fetches small delta files (typically 10-50KB) containing only
 * the changes since the last version.
 */

import type { CardsData } from '../types/card';
import jsonpatch from 'fast-json-patch';
import type { Operation } from 'fast-json-patch';

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
 * Fetch delta manifest to check available deltas
 */
async function fetchDeltaManifest(): Promise<DeltaManifest | null> {
  try {
    const response = await fetch('/data/delta/manifest.json', {
      cache: 'no-cache' // Always check for new manifest
    });

    if (!response.ok) {
      console.log('[Delta] No manifest found');
      return null;
    }

    return await response.json();
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

    // Apply the jsonpatch operations
    const patchResult = jsonpatch.applyPatch(dataCopy, delta.patch, /* validate */ true, /* mutate */ true);

    // Check for errors in patch application
    if (patchResult.some(result => result !== null)) {
      console.error('[Delta] Patch application had errors:', patchResult);
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
  const currentVersion = cachedData.version;

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

  // Find delta from current to target version
  const deltaEntry = manifest.deltas.find(
    d => d.from_version === currentVersion && d.to_version === targetVersion
  );

  if (!deltaEntry) {
    console.log(`[Delta] No delta found from ${currentVersion} to ${targetVersion}`);
    return null;
  }

  // Fetch and apply delta
  console.log(`[Delta] Fetching delta (${(deltaEntry.patch_size / 1024).toFixed(1)} KB, ${deltaEntry.total_operations} ops)`);
  const delta = await fetchDelta(currentVersion, targetVersion);

  if (!delta) {
    console.log('[Delta] Failed to fetch delta, falling back to full fetch');
    return null;
  }

  // Apply delta patch
  const updatedData = applyDeltaPatch(cachedData, delta);

  if (!updatedData) {
    console.error('[Delta] Failed to apply delta, falling back to full fetch');
    return null;
  }

  console.log(`[Delta] ✓ Updated to version ${targetVersion} via delta`);
  return updatedData;
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
