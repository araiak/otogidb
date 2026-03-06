import { describe, it, expect } from 'vitest';
import {
  formatScore,
  buildTiers,
  buildChartData,
  linearRegression,
  buildTrendData,
} from '../eventRankings';
import type { EventCutoff } from '../eventRankings';

// --- Fixtures ---

function makeEvent(
  name: string,
  type: 'tower' | 'story',
  cutoffs: Record<string, { rank_min: number; rank_max: number; cutoff_score: number }[]>,
): EventCutoff {
  const periods: EventCutoff['periods'] = {};
  for (const [period, cuts] of Object.entries(cutoffs)) {
    periods[period] = { cutoffs: cuts };
  }
  return {
    event_id: name,
    event_name: name,
    start_date: '2025-01-01',
    event_type: type,
    participation: null,
    periods,
  };
}

const TOWER_CUTOFFS = [
  { rank_min: 1,   rank_max: 40,  cutoff_score: 21_000_000_000 },
  { rank_min: 41,  rank_max: 80,  cutoff_score: 11_000_000_000 },
  { rank_min: 81,  rank_max: 160, cutoff_score:  3_000_000_000 },
  { rank_min: 161, rank_max: 240, cutoff_score:  2_000_000_000 },
  { rank_min: 241, rank_max: 400, cutoff_score:    500_000_000 },
  { rank_min: 401, rank_max: 800, cutoff_score:     50_000_000 },
];

const STORY_CUTOFFS = [
  { rank_min: 1,   rank_max: 70,  cutoff_score: 1_500_000 },
  { rank_min: 71,  rank_max: 140, cutoff_score:   800_000 },
  { rank_min: 141, rank_max: 210, cutoff_score:   400_000 },
  { rank_min: 211, rank_max: 420, cutoff_score:   100_000 },
  { rank_min: 421, rank_max: 700, cutoff_score:    20_000 },
];

// =============================================================================
// formatScore
// =============================================================================

describe('formatScore', () => {
  it('formats billions with 2 decimal places', () => {
    expect(formatScore(21_506_416_592)).toBe('21.51B');
  });

  it('formats exact billions', () => {
    expect(formatScore(3_000_000_000)).toBe('3.00B');
  });

  it('formats millions with 1 decimal place', () => {
    expect(formatScore(1_500_000)).toBe('1.5M');
  });

  it('formats exact millions', () => {
    expect(formatScore(10_000_000)).toBe('10.0M');
  });

  it('formats thousands with 1 decimal place', () => {
    expect(formatScore(28_000)).toBe('28.0K');
  });

  it('formats sub-thousand as plain number', () => {
    expect(formatScore(999)).toBe('999');
  });

  it('formats zero', () => {
    expect(formatScore(0)).toBe('0');
  });
});

// =============================================================================
// buildTiers
// =============================================================================

describe('buildTiers', () => {
  it('assigns T1, T2, ... in ascending rank_min order', () => {
    const event = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'overall');

    expect(tiers.map(t => t.key)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6']);
    expect(tiers[0].rank_min).toBe(1);
    expect(tiers[0].rank_max).toBe(40);
    expect(tiers[5].rank_min).toBe(401);
    expect(tiers[5].rank_max).toBe(800);
  });

  it('builds correct rangeLabel strings', () => {
    const event = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'overall');

    expect(tiers[0].rangeLabel).toBe('#1–40');
    expect(tiers[1].rangeLabel).toBe('#41–80');
  });

  it('deduplicates identical ranges across multiple events', () => {
    const e1 = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const e2 = makeEvent('B', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([e1, e2], 'overall');

    expect(tiers).toHaveLength(6);
  });

  it('returns empty array when no events have the period', () => {
    const event = makeEvent('A', 'tower', { first_half: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'overall');

    expect(tiers).toHaveLength(0);
  });

  it('returns empty array for empty events list', () => {
    expect(buildTiers([], 'overall')).toHaveLength(0);
  });

  it('handles events with different bracket sizes (new event has fewer tiers)', () => {
    // Future event introduces different range — T1 is still the top bracket
    const cutoffsNew = [
      { rank_min: 1,  rank_max: 50,  cutoff_score: 5_000_000_000 },
      { rank_min: 51, rank_max: 100, cutoff_score: 1_000_000_000 },
    ];
    const e1 = makeEvent('Old', 'tower', { overall: TOWER_CUTOFFS });
    const e2 = makeEvent('New', 'tower', { overall: cutoffsNew });
    const tiers = buildTiers([e1, e2], 'overall');

    // All unique ranges included, sorted by rank_min
    expect(tiers[0].key).toBe('T1');
    expect(tiers[0].rank_min).toBe(1);
    // The two T1-candidates (#1-40 and #1-50) both have rank_min=1,
    // only the first seen is deduplicated by range key
    const rangeKeys = tiers.map(t => t.rangeLabel);
    expect(rangeKeys).toContain('#1–40');
    expect(rangeKeys).toContain('#1–50');
  });
});

// =============================================================================
// buildChartData
// =============================================================================

describe('buildChartData', () => {
  it('produces one row per event with name field', () => {
    const e1 = makeEvent('Event A', 'tower', { overall: TOWER_CUTOFFS });
    const e2 = makeEvent('Event B', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([e1, e2], 'overall');
    const rows = buildChartData([e1, e2], 'overall', tiers);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Event A');
    expect(rows[1].name).toBe('Event B');
  });

  it('maps scores to correct tier keys', () => {
    const event = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'overall');
    const [row] = buildChartData([event], 'overall', tiers);

    expect(row['T1']).toBe(21_000_000_000);
    expect(row['T2']).toBe(11_000_000_000);
    expect(row['T6']).toBe(50_000_000);
  });

  it('omits tier key when event has no matching bracket', () => {
    // Event A has 6 tiers, Event B has only 2 (different ranges)
    const cutoffsB = [
      { rank_min: 1,  rank_max: 50,  cutoff_score: 5_000_000_000 },
      { rank_min: 51, rank_max: 100, cutoff_score: 1_000_000_000 },
    ];
    const eA = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const eB = makeEvent('B', 'tower', { overall: cutoffsB });
    const tiers = buildTiers([eA, eB], 'overall');
    const rows = buildChartData([eA, eB], 'overall', tiers);

    // Event A should not have keys for B's unique ranges
    const rowA = rows[0];
    expect(rowA['T1']).toBe(21_000_000_000); // #1-40, A's range
    expect(rowA).not.toHaveProperty(
      tiers.find(t => t.rangeLabel === '#1–50')?.key ?? '__none__',
    );
  });

  it('returns empty rows for events with no data in that period', () => {
    const event = makeEvent('A', 'tower', { first_half: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'first_half');
    const rows = buildChartData([event], 'overall', tiers);

    expect(rows[0].name).toBe('A');
    expect(Object.keys(rows[0])).toEqual(['name']); // only name, no tier scores
  });
});

// =============================================================================
// linearRegression
// =============================================================================

describe('linearRegression', () => {
  it('returns null for fewer than 2 points', () => {
    expect(linearRegression([])).toBeNull();
    expect(linearRegression([{ x: 0, y: 5 }])).toBeNull();
  });

  it('returns null when all x values are the same (zero denominator)', () => {
    const points = [{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 1, y: 6 }];
    expect(linearRegression(points)).toBeNull();
  });

  it('computes exact slope and intercept for a perfect line y = 2x + 1', () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
      { x: 3, y: 7 },
    ];
    const result = linearRegression(points);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeCloseTo(2, 10);
    expect(result!.intercept).toBeCloseTo(1, 10);
  });

  it('computes slope and intercept for a declining line', () => {
    const points = [
      { x: 0, y: 10 },
      { x: 1, y: 8 },
      { x: 2, y: 6 },
    ];
    const result = linearRegression(points);
    expect(result!.slope).toBeCloseTo(-2, 10);
    expect(result!.intercept).toBeCloseTo(10, 10);
  });

  it('handles two points (minimum valid case)', () => {
    const result = linearRegression([{ x: 0, y: 0 }, { x: 4, y: 8 }]);
    expect(result!.slope).toBeCloseTo(2, 10);
    expect(result!.intercept).toBeCloseTo(0, 10);
  });

  it('handles large score values without overflow', () => {
    const points = [
      { x: 0, y: 21_000_000_000 },
      { x: 1, y: 25_000_000_000 },
      { x: 2, y: 29_000_000_000 },
    ];
    const result = linearRegression(points);
    expect(result!.slope).toBeCloseTo(4_000_000_000, -3);
    expect(result!.intercept).toBeCloseTo(21_000_000_000, -3);
  });
});

// =============================================================================
// buildTrendData
// =============================================================================

describe('buildTrendData', () => {
  it('produces trend values for active tiers', () => {
    const event = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([event, makeEvent('B', 'tower', { overall: [
      { rank_min: 1, rank_max: 40, cutoff_score: 25_000_000_000 },
      { rank_min: 41, rank_max: 80, cutoff_score: 13_000_000_000 },
    ] })], 'overall');
    const chartData = buildChartData(
      [event, makeEvent('B', 'tower', { overall: [
        { rank_min: 1, rank_max: 40, cutoff_score: 25_000_000_000 },
        { rank_min: 41, rank_max: 80, cutoff_score: 13_000_000_000 },
      ] })],
      'overall',
      tiers,
    );

    const activeTiers = new Set(['T1']);
    const trends = buildTrendData(chartData, tiers, activeTiers);

    expect(trends).toHaveLength(2);
    expect(trends[0]).toHaveProperty('trend_T1');
    expect(trends[1]).toHaveProperty('trend_T1');
    expect(trends[0]).not.toHaveProperty('trend_T2'); // T2 not active
  });

  it('skips trend for inactive tiers', () => {
    const event = makeEvent('A', 'tower', { overall: TOWER_CUTOFFS });
    const tiers = buildTiers([event], 'overall');
    const chartData = buildChartData([event], 'overall', tiers);

    const trends = buildTrendData(chartData, tiers, new Set<string>());
    expect(Object.keys(trends[0])).toHaveLength(0);
  });
});
