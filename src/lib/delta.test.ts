/**
 * Unit tests for delta.ts — chain walking and multi-hop update logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findDeltaChain, tryDeltaUpdate } from './delta';
import type { CardsData } from '../types/card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DeltaEntry = {
  from_version: string;
  to_version: string;
  patch_size: number;
  total_operations: number;
};

function makeDeltas(chain: [string, string][]): DeltaEntry[] {
  return chain.map(([from, to]) => ({
    from_version: from,
    to_version: to,
    patch_size: 100,
    total_operations: 1,
  }));
}

function makeCardsData(version: string, dataHash: string): CardsData {
  return {
    version,
    data_hash: dataHash,
    total_cards: 1,
    cards: {
      '1': {
        id: '1',
        asset_id: '100001',
        name: 'Test Card',
        playable: true,
      } as any,
    },
  };
}

// ---------------------------------------------------------------------------
// findDeltaChain
// ---------------------------------------------------------------------------

describe('findDeltaChain', () => {
  it('returns empty array when from === to', () => {
    const result = findDeltaChain(makeDeltas([['V1', 'V2']]), 'V1', 'V1');
    expect(result).toEqual([]);
  });

  it('returns single hop for direct V1→V2', () => {
    const deltas = makeDeltas([['V1', 'V2']]);
    const chain = findDeltaChain(deltas, 'V1', 'V2');
    expect(chain).not.toBeNull();
    expect(chain!.length).toBe(1);
    expect(chain![0].from_version).toBe('V1');
    expect(chain![0].to_version).toBe('V2');
  });

  it('walks multi-hop chain V1→V2→V3→V4', () => {
    const deltas = makeDeltas([['V1', 'V2'], ['V2', 'V3'], ['V3', 'V4']]);
    const chain = findDeltaChain(deltas, 'V1', 'V4');
    expect(chain).not.toBeNull();
    expect(chain!.length).toBe(3);
    expect(chain!.map(d => d.to_version)).toEqual(['V2', 'V3', 'V4']);
  });

  it('returns null when no outgoing edge exists from start', () => {
    const deltas = makeDeltas([['V2', 'V3']]);
    const result = findDeltaChain(deltas, 'V1', 'V3');
    expect(result).toBeNull();
  });

  it('returns null when chain does not reach target', () => {
    const deltas = makeDeltas([['V1', 'V2']]);
    const result = findDeltaChain(deltas, 'V1', 'V5');
    expect(result).toBeNull();
  });

  it('cycle guard: returns null on a looping chain', () => {
    // V1→V2→V1 (cycle): findDeltaChain starting from V1 targeting V3 would loop
    const deltas: DeltaEntry[] = [
      { from_version: 'V1', to_version: 'V2', patch_size: 10, total_operations: 1 },
      { from_version: 'V2', to_version: 'V1', patch_size: 10, total_operations: 1 },
    ];
    const result = findDeltaChain(deltas, 'V1', 'V3');
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tryDeltaUpdate (integration with mocked fetch + manifest)
// ---------------------------------------------------------------------------

describe('tryDeltaUpdate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when manifest fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const cached = makeCardsData('v1', 'hash1');
    const result = await tryDeltaUpdate(cached, 'hash2');
    expect(result).toBeNull();
  });

  it('returns null when no delta path exists in manifest', async () => {
    // Manifest has V2→V3 but user is on V1
    const manifest = {
      data_hash: 'hash3',
      version: 'v3',
      generated_at: '2026-01-01T00:00:00',
      files: {},
      delta: {
        current_version: 'hash3',
        oldest_supported_version: null,
        available_deltas: [
          { from_version: 'hash2', to_version: 'hash3', file: '/data/delta/hash2_to_hash3.json', size_bytes: 100, operations: 1 },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => manifest,
    } as any);

    const cached = makeCardsData('v1', 'hash1');
    const result = await tryDeltaUpdate(cached, 'hash3');
    expect(result).toBeNull();
  });

  it('applies chained two-hop delta and returns updated data', async () => {
    const v1Data = makeCardsData('v1', 'hash1');
    const _v2Data = makeCardsData('v2', 'hash2');
    const _v3Data = makeCardsData('v3', 'hash3');

    // Manifest shows V1→V2 and V2→V3
    const manifest = {
      data_hash: 'hash3',
      version: 'v3',
      generated_at: '2026-01-01T00:00:00',
      files: {},
      delta: {
        current_version: 'hash3',
        oldest_supported_version: null,
        available_deltas: [
          { from_version: 'hash1', to_version: 'hash2', file: '/data/delta/hash1_to_hash2.json', size_bytes: 50, operations: 1 },
          { from_version: 'hash2', to_version: 'hash3', file: '/data/delta/hash2_to_hash3.json', size_bytes: 50, operations: 1 },
        ],
      },
    };

    // Delta V1→V2: replace version
    const deltaV1V2 = {
      from_version: 'hash1',
      to_version: 'hash2',
      generated_at: '2026-01-01T00:00:00',
      patch: [
        { op: 'replace', path: '/version', value: 'v2' },
        { op: 'replace', path: '/data_hash', value: 'hash2' },
      ],
      stats: { total_operations: 2, add_operations: 0, remove_operations: 0, replace_operations: 2 },
    };

    // Delta V2→V3: replace version
    const deltaV2V3 = {
      from_version: 'hash2',
      to_version: 'hash3',
      generated_at: '2026-01-01T00:00:00',
      patch: [
        { op: 'replace', path: '/version', value: 'v3' },
        { op: 'replace', path: '/data_hash', value: 'hash3' },
      ],
      stats: { total_operations: 2, add_operations: 0, remove_operations: 0, replace_operations: 2 },
    };

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => manifest } as any)  // manifest
      .mockResolvedValueOnce({ ok: true, json: async () => deltaV1V2 } as any) // hop 1
      .mockResolvedValueOnce({ ok: true, json: async () => deltaV2V3 } as any); // hop 2

    const result = await tryDeltaUpdate(v1Data, 'hash3');
    expect(result).not.toBeNull();
    expect(result!.version).toBe('v3');
    expect(result!.data_hash).toBe('hash3');
  });

  // ---------------------------------------------------------------------------
  // Locale version-check short-circuit
  //
  // Non-English locale indexes share the English data_hash (set via
  // external_data_hash in the Python pipeline).  These tests verify that
  // tryDeltaUpdate() fires the "already at target version" early-return for
  // locale-cached data, so non-English users don't re-download the full index
  // on every page load when data hasn't changed.
  // ---------------------------------------------------------------------------

  it('returns cachedData immediately when locale data_hash matches English target (no fetch)', async () => {
    // Simulate a Japanese-locale cached index that carries the English data_hash
    const jaData = makeCardsData('v3', 'en_hash_abc');
    // fetch must NOT be called at all
    global.fetch = vi.fn();

    const result = await tryDeltaUpdate(jaData, 'en_hash_abc');
    expect(result).toBe(jaData);
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });

  it('falls back for locale data when data_hash differs from English target', async () => {
    // Locale cached data has its own (locale-computed) hash — no delta chain exists
    const jaCached = makeCardsData('v2', 'ja_computed_hash');
    const manifest = {
      data_hash: 'en_hash_new',
      version: 'v3',
      generated_at: '2026-01-01T00:00:00',
      files: {},
      delta: {
        current_version: 'en_hash_new',
        oldest_supported_version: null,
        available_deltas: [
          // Only English deltas exist — no path from 'ja_computed_hash'
          { from_version: 'en_hash_old', to_version: 'en_hash_new', file: '/data/delta/en_old_to_new.json', size_bytes: 50, operations: 1 },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => manifest,
    } as any);

    const result = await tryDeltaUpdate(jaCached, 'en_hash_new');
    // No chain from 'ja_computed_hash' → returns null → caller falls back to full fetch
    expect(result).toBeNull();
  });

  it('returns null when applied delta produces wrong data_hash (integrity check)', async () => {
    const v1Data = makeCardsData('v1', 'hash1');
    const manifest = {
      data_hash: 'hash2', version: 'v2', generated_at: '2026-01-01T00:00:00', files: {},
      delta: {
        current_version: 'hash2', oldest_supported_version: null,
        available_deltas: [
          { from_version: 'hash1', to_version: 'hash2', file: '/data/delta/h1_to_h2.json', size_bytes: 50, operations: 1 },
        ],
      },
    };
    const corruptDelta = {
      from_version: 'hash1', to_version: 'hash2', generated_at: '2026-01-01T00:00:00',
      patch: [{ op: 'replace', path: '/data_hash', value: 'wrong_hash' }],
      stats: { total_operations: 1, add_operations: 0, remove_operations: 0, replace_operations: 1 },
    };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => manifest } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => corruptDelta } as any);

    const result = await tryDeltaUpdate(v1Data, 'hash2');
    expect(result).toBeNull(); // 'wrong_hash' !== 'hash2'
  });

  it('returns null when delta does not update data_hash (missing op)', async () => {
    const v1Data = makeCardsData('v1', 'hash1');
    const manifest = {
      data_hash: 'hash2', version: 'v2', generated_at: '2026-01-01T00:00:00', files: {},
      delta: {
        current_version: 'hash2', oldest_supported_version: null,
        available_deltas: [
          { from_version: 'hash1', to_version: 'hash2', file: '/data/delta/h1_to_h2.json', size_bytes: 50, operations: 1 },
        ],
      },
    };
    const incompleteDelta = {
      from_version: 'hash1', to_version: 'hash2', generated_at: '2026-01-01T00:00:00',
      patch: [{ op: 'replace', path: '/version', value: 'v2' }], // /data_hash not updated
      stats: { total_operations: 1, add_operations: 0, remove_operations: 0, replace_operations: 1 },
    };
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => manifest } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => incompleteDelta } as any);

    const result = await tryDeltaUpdate(v1Data, 'hash2');
    expect(result).toBeNull(); // data_hash still 'hash1', expected 'hash2'
  });

  it('returns null when cachedData has no version info', async () => {
    const noVersionData = {
      version: undefined,
      data_hash: undefined,
      total_cards: 0,
      cards: {},
    } as any;
    global.fetch = vi.fn();
    const result = await tryDeltaUpdate(noVersionData, 'en_hash_abc');
    expect(result).toBeNull();
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled();
  });
});
