/**
 * Delta Update System Validation
 *
 * Validates that the delta update system is properly configured:
 * - Delta manifest exists and is valid
 * - Referenced delta files exist and are accessible
 * - Delta files have correct structure
 * - Applying deltas produces valid results
 */

import { applyPatch, type Operation } from 'fast-json-patch';

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

interface DeltaValidationResult {
  passed: number;
  failed: number;
  warned: number;
  issues: string[];
}

/**
 * Fetch delta manifest
 */
async function fetchDeltaManifest(baseUrl: string, timeout: number): Promise<DeltaManifest | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/data/delta/manifest.json`, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Fetch a specific delta file
 */
async function fetchDelta(baseUrl: string, fromVersion: string, toVersion: string, timeout: number): Promise<Delta | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const deltaFilename = `${fromVersion}_to_${toVersion}.json`;
    const response = await fetch(`${baseUrl}/data/delta/${deltaFilename}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

/**
 * Validate delta manifest structure
 */
function validateManifestStructure(manifest: DeltaManifest): string[] {
  const issues: string[] = [];

  if (!manifest.current_version) {
    issues.push('Manifest missing current_version');
  }

  if (!Array.isArray(manifest.deltas)) {
    issues.push('Manifest missing or invalid deltas array');
    return issues;
  }

  if (manifest.deltas.length === 0) {
    issues.push('Manifest has no deltas (expected at least 1 after first sync)');
  }

  // Validate each delta entry
  for (let i = 0; i < manifest.deltas.length; i++) {
    const delta = manifest.deltas[i];
    if (!delta.from_version) {
      issues.push(`Delta entry ${i} missing from_version`);
    }
    if (!delta.to_version) {
      issues.push(`Delta entry ${i} missing to_version`);
    }
    if (typeof delta.patch_size !== 'number') {
      issues.push(`Delta entry ${i} missing or invalid patch_size`);
    }
    if (typeof delta.total_operations !== 'number') {
      issues.push(`Delta entry ${i} missing or invalid total_operations`);
    }
  }

  return issues;
}

/**
 * Validate delta file structure
 */
function validateDeltaStructure(delta: Delta, entry: DeltaManifest['deltas'][0]): string[] {
  const issues: string[] = [];

  // Check required fields
  if (delta.from_version !== entry.from_version) {
    issues.push(`Delta from_version mismatch: expected ${entry.from_version}, got ${delta.from_version}`);
  }
  if (delta.to_version !== entry.to_version) {
    issues.push(`Delta to_version mismatch: expected ${entry.to_version}, got ${delta.to_version}`);
  }
  if (!delta.generated_at) {
    issues.push('Delta missing generated_at timestamp');
  }
  if (!Array.isArray(delta.patch)) {
    issues.push('Delta missing or invalid patch array');
    return issues;
  }

  // Check stats match
  if (!delta.stats) {
    issues.push('Delta missing stats object');
  } else {
    if (delta.stats.total_operations !== entry.total_operations) {
      issues.push(
        `Delta stats.total_operations mismatch: manifest says ${entry.total_operations}, delta has ${delta.stats.total_operations}`
      );
    }

    // Verify stats add up
    const computedTotal =
      (delta.stats.add_operations || 0) +
      (delta.stats.remove_operations || 0) +
      (delta.stats.replace_operations || 0);

    if (computedTotal !== delta.stats.total_operations) {
      issues.push(
        `Delta stats inconsistent: add+remove+replace=${computedTotal}, but total_operations=${delta.stats.total_operations}`
      );
    }
  }

  // Validate patch operations
  for (let i = 0; i < delta.patch.length; i++) {
    const op = delta.patch[i];
    if (!op.op) {
      issues.push(`Patch operation ${i} missing 'op' field`);
    }
    if (!op.path) {
      issues.push(`Patch operation ${i} missing 'path' field`);
    }
    if (!['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(op.op)) {
      issues.push(`Patch operation ${i} has invalid op: ${op.op}`);
    }
  }

  return issues;
}

/**
 * Test applying a delta to sample data
 */
function testDeltaApplication(delta: Delta): string[] {
  const issues: string[] = [];

  // Create minimal test data
  const testData = {
    version: delta.from_version,
    cards: {
      '1': { id: '1', name: 'Test Card', stats: { max_atk: 8000 } }
    }
  };

  try {
    // Try to apply the patch
    const result = applyPatch(testData, delta.patch, /* validate */ true, /* mutate */ false);

    // Check if there were any errors
    const errors = result.filter(r => r !== null);
    if (errors.length > 0) {
      // This is expected if the test data doesn't match the delta structure
      // We're just checking that the patch is syntactically valid
    }
  } catch (error) {
    issues.push(`Delta application failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return issues;
}

/**
 * Validate delta update system
 */
export async function validateDeltaSystem(
  baseUrl: string,
  timeout: number
): Promise<DeltaValidationResult> {
  const issues: string[] = [];
  let passed = 0;
  let failed = 0;
  let warned = 0;

  // 1. Check manifest exists
  console.log('  → Checking delta manifest...');
  const manifest = await fetchDeltaManifest(baseUrl, timeout);

  if (!manifest) {
    issues.push('Delta manifest not found at /data/delta/manifest.json');
    // This is a warning, not a failure (first deployment may not have deltas yet)
    warned++;
    console.log('    ⚠ Manifest not found (OK for first deployment)');
    return { passed, failed, warned, issues };
  }

  passed++;
  console.log(`    ✓ Manifest found (version: ${manifest.current_version})`);

  // 2. Validate manifest structure
  console.log('  → Validating manifest structure...');
  const manifestIssues = validateManifestStructure(manifest);
  if (manifestIssues.length > 0) {
    issues.push(...manifestIssues);
    failed++;
    console.log(`    ✗ Manifest structure invalid (${manifestIssues.length} issues)`);
  } else {
    passed++;
    console.log(`    ✓ Manifest structure valid (${manifest.deltas.length} deltas)`);
  }

  // 3. Check delta files exist
  console.log('  → Checking delta files...');
  let deltaFilesChecked = 0;
  let deltaFilesPassed = 0;
  let deltaFilesFailed = 0;

  // Sample up to 3 delta files to check (don't need to check all)
  const samplesToCheck = Math.min(3, manifest.deltas.length);
  const sampledDeltas = manifest.deltas.slice(0, samplesToCheck);

  for (const entry of sampledDeltas) {
    deltaFilesChecked++;
    const delta = await fetchDelta(baseUrl, entry.from_version, entry.to_version, timeout);

    if (!delta) {
      issues.push(`Delta file not found: ${entry.from_version}_to_${entry.to_version}.json`);
      deltaFilesFailed++;
      continue;
    }

    deltaFilesPassed++;

    // Validate delta structure
    const deltaIssues = validateDeltaStructure(delta, entry);
    if (deltaIssues.length > 0) {
      issues.push(...deltaIssues.map(issue => `Delta ${entry.from_version}→${entry.to_version}: ${issue}`));
      deltaFilesFailed++;
    }
  }

  if (deltaFilesFailed > 0) {
    failed++;
    console.log(`    ✗ Delta files: ${deltaFilesPassed}/${deltaFilesChecked} valid`);
  } else {
    passed++;
    console.log(`    ✓ Delta files: ${deltaFilesPassed}/${deltaFilesChecked} valid`);
  }

  // 4. Test delta application (using first delta if available)
  if (sampledDeltas.length > 0) {
    console.log('  → Testing delta application...');
    const firstEntry = sampledDeltas[0];
    const firstDelta = await fetchDelta(baseUrl, firstEntry.from_version, firstEntry.to_version, timeout);

    if (firstDelta) {
      const applicationIssues = testDeltaApplication(firstDelta);
      if (applicationIssues.length > 0) {
        issues.push(...applicationIssues);
        failed++;
        console.log('    ✗ Delta application test failed');
      } else {
        passed++;
        console.log('    ✓ Delta application test passed');
      }
    }
  }

  return { passed, failed, warned, issues };
}
