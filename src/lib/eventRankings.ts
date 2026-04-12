/**
 * Pure utility functions for the Event Rankings chart.
 * Extracted here so they can be unit tested independently of React.
 */

// --- Types ---

export interface Cutoff {
  rank_min: number;
  rank_max: number;
  cutoff_score: number;
}

export interface EventPeriod {
  cutoffs: Cutoff[];
}

export interface EventCutoff {
  event_id: string;
  event_name: string;
  start_date: string;
  event_type: 'tower' | 'story';
  participation: number | null;
  periods: Record<string, EventPeriod>;
}

export interface EventCutoffsData {
  generated_at: string;
  events: EventCutoff[];
}

export interface Tier {
  key: string;        // "T1", "T2", ...
  rank_min: number;
  rank_max: number;
  rangeLabel: string; // "#1–40"
}

// --- Score formatting ---

export function formatScore(score: number): string {
  if (score >= 1_000_000_000) return (score / 1_000_000_000).toFixed(2) + 'B';
  if (score >= 1_000_000) return (score / 1_000_000).toFixed(1) + 'M';
  if (score >= 1_000) return (score / 1_000).toFixed(1) + 'K';
  return score.toLocaleString();
}

// --- Tier construction ---

/**
 * Build a sorted Tier list from a set of events for a given period.
 * Tiers are numbered T1, T2, ... in ascending rank_min order.
 * Duplicate rank ranges across events are deduplicated.
 */
export function buildTiers(events: EventCutoff[], period: string): Tier[] {
  const seen = new Map<string, Cutoff>();
  for (const event of events) {
    for (const c of event.periods[period]?.cutoffs ?? []) {
      const key = `${c.rank_min}-${c.rank_max}`;
      if (!seen.has(key)) seen.set(key, c);
    }
  }
  const sorted = [...seen.values()].sort((a, b) => a.rank_min - b.rank_min);
  return sorted.map((c, i) => ({
    key: `T${i + 1}`,
    rank_min: c.rank_min,
    rank_max: c.rank_max,
    rangeLabel: `#${c.rank_min}–${c.rank_max}`,
  }));
}

// --- Chart data construction ---

/**
 * Build chart rows: one row per event, columns keyed by tier.key.
 * Tiers that have no matching cutoff in a given event are omitted (no data point).
 */
export function buildChartData(
  events: EventCutoff[],
  period: string,
  tiers: Tier[],
): Record<string, string | number>[] {
  return events.map(event => {
    const row: Record<string, string | number> = { name: event.event_name };
    const cutoffs = event.periods[period]?.cutoffs ?? [];
    for (const tier of tiers) {
      const match = cutoffs.find(
        c => c.rank_min === tier.rank_min && c.rank_max === tier.rank_max,
      );
      if (match) row[tier.key] = match.cutoff_score;
    }
    return row;
  });
}

// --- Linear regression ---

/**
 * Compute simple linear regression over {x, y} points.
 * Returns null if fewer than 2 points or if all x values are identical.
 */
export function linearRegression(
  points: { x: number; y: number }[],
): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// --- Trend data construction ---

export function buildTrendData(
  chartData: Record<string, string | number>[],
  tiers: Tier[],
  activeTiers: Set<string>,
): Record<string, number | undefined>[] {
  return chartData.map((row, idx) => {
    const trendRow: Record<string, number | undefined> = {};
    for (const tier of tiers) {
      if (!activeTiers.has(tier.key)) continue;
      const points = chartData
        .map((r, i) => ({ x: i, y: r[tier.key] as number }))
        .filter(p => p.y != null && !isNaN(p.y));
      const reg = linearRegression(points);
      if (reg) trendRow[`trend_${tier.key}`] = reg.slope * idx + reg.intercept;
    }
    return trendRow;
  });
}

// --- Next-event predictions ---

/**
 * Extrapolate the trend line one step beyond the last data point to predict
 * the cutoff score for the next event. Returns null for a tier if there are
 * fewer than 2 data points or if the predicted value is non-positive.
 */
export function buildNextEventPredictions(
  chartData: Record<string, string | number>[],
  tiers: Tier[],
): Record<string, number | null> {
  const nextIdx = chartData.length;
  const predictions: Record<string, number | null> = {};
  for (const tier of tiers) {
    const points = chartData
      .map((r, i) => ({ x: i, y: r[tier.key] as number }))
      .filter(p => p.y != null && !isNaN(p.y));
    const reg = linearRegression(points);
    if (reg) {
      const value = Math.round(reg.slope * nextIdx + reg.intercept);
      predictions[tier.key] = value > 0 ? value : null;
    } else {
      predictions[tier.key] = null;
    }
  }
  return predictions;
}

// --- Next-event prediction ranges ---

export interface PredictionRange {
  predicted: number;
  low: number;
  high: number;
  /** Standard deviation of residuals from the trend line. */
  stdDev: number;
  /** Number of historical data points used. */
  n: number;
}

/**
 * Extrapolate the trend line one step ahead and express uncertainty as ±1
 * standard deviation of the residuals from that trend line (using n−2 degrees
 * of freedom, which is the standard error for a simple linear regression).
 *
 * Returns null for a tier when there are fewer than 3 data points (need at
 * least n−2 = 1 degree of freedom) or if the predicted value is non-positive.
 */
export function buildNextEventPredictionRanges(
  chartData: Record<string, string | number>[],
  tiers: Tier[],
): Record<string, PredictionRange | null> {
  const nextIdx = chartData.length;
  const ranges: Record<string, PredictionRange | null> = {};

  for (const tier of tiers) {
    const points = chartData
      .map((r, i) => ({ x: i, y: r[tier.key] as number }))
      .filter(p => p.y != null && !isNaN(p.y));

    const reg = linearRegression(points);
    if (!reg || points.length < 3) {
      ranges[tier.key] = null;
      continue;
    }

    const predicted = Math.round(reg.slope * nextIdx + reg.intercept);
    if (predicted <= 0) {
      ranges[tier.key] = null;
      continue;
    }

    // Residual standard deviation (n−2 degrees of freedom for linear regression)
    const n = points.length;
    const sumSqResiduals = points.reduce((sum, p) => {
      const fitted = reg.slope * p.x + reg.intercept;
      return sum + (p.y - fitted) ** 2;
    }, 0);
    const stdDev = Math.sqrt(sumSqResiduals / (n - 2));

    ranges[tier.key] = {
      predicted,
      low: Math.max(1, Math.round(predicted - stdDev)),
      high: Math.round(predicted + stdDev),
      stdDev: Math.round(stdDev),
      n,
    };
  }

  return ranges;
}
