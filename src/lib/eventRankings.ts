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

// --- Log Y-axis domain ---

/**
 * Decade-aligned domain and ticks for a log-scaled Y axis.
 *
 * Recharts' `domain={['auto','auto']}` on a log scale silently yields no ticks
 * for some data ranges (it nice-rounds linearly), which blanks the axis. Pinning
 * the domain to whole powers of ten and supplying the ticks ourselves keeps the
 * axis labelled whatever the data spans. Returns null when there is nothing
 * positive to plot (a log scale cannot show <= 0).
 */
export function buildLogAxis(
  values: number[],
): { domain: [number, number]; ticks: number[] } | null {
  const positive = values.filter(v => typeof v === 'number' && isFinite(v) && v > 0);
  if (!positive.length) return null;
  const max = Math.max(...positive);
  const lo = Math.floor(Math.log10(Math.min(...positive)));
  const hi = Math.floor(Math.log10(max));
  const ticks: number[] = [];
  for (let e = lo; e <= hi; e++) ticks.push(10 ** e);
  // Top of the axis is the data itself, not the next decade up, so a max that
  // just clears a power of ten does not waste half the plot on empty space.
  return { domain: [10 ** lo, max], ticks };
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

// --- Log-space fitting ---

/**
 * Cutoff scores grow multiplicatively, and the chart plots them on a log axis,
 * so every trend and prediction is fitted to log(score) and mapped back with
 * exp(). A single blowout event (an anniversary, say) then shifts the line by a
 * ratio instead of dragging a raw-value fit hundreds of thousands of points —
 * and the fitted line is positive by construction, which a log axis requires.
 */
function logPoints(
  chartData: Record<string, string | number>[],
  tierKey: string,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  chartData.forEach((row, i) => {
    const y = row[tierKey];
    if (typeof y === 'number' && isFinite(y) && y > 0) points.push({ x: i, y: Math.log(y) });
  });
  return points;
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
      const reg = linearRegression(logPoints(chartData, tier.key));
      if (reg) trendRow[`trend_${tier.key}`] = Math.exp(reg.slope * idx + reg.intercept);
    }
    return trendRow;
  });
}

// --- Next-event predictions ---

/**
 * Extrapolate the log-space trend one step beyond the last data point to
 * predict the cutoff score for the next event. Returns null for a tier with
 * fewer than 2 usable data points.
 */
export function buildNextEventPredictions(
  chartData: Record<string, string | number>[],
  tiers: Tier[],
): Record<string, number | null> {
  const nextIdx = chartData.length;
  const predictions: Record<string, number | null> = {};
  for (const tier of tiers) {
    const reg = linearRegression(logPoints(chartData, tier.key));
    predictions[tier.key] = reg
      ? Math.round(Math.exp(reg.slope * nextIdx + reg.intercept))
      : null;
  }
  return predictions;
}

// --- Next-event prediction ranges ---

export interface PredictionRange {
  predicted: number;
  low: number;
  high: number;
  /** Residual spread as a ratio: the range is predicted ÷ and × this factor. */
  stdDev: number;
  /** Number of historical data points used. */
  n: number;
}

/**
 * Extrapolate the log-space trend one step ahead and express uncertainty as ±1
 * standard deviation of the residuals from that trend line (using n−2 degrees
 * of freedom, which is the standard error for a simple linear regression).
 * Because the fit is logarithmic the interval is multiplicative, so a noisy
 * tier widens the range proportionally instead of by a flat score offset.
 *
 * Returns null for a tier with fewer than 3 usable data points (need at least
 * n−2 = 1 degree of freedom).
 */
export function buildNextEventPredictionRanges(
  chartData: Record<string, string | number>[],
  tiers: Tier[],
): Record<string, PredictionRange | null> {
  const nextIdx = chartData.length;
  const ranges: Record<string, PredictionRange | null> = {};

  for (const tier of tiers) {
    const points = logPoints(chartData, tier.key);
    const reg = linearRegression(points);
    if (!reg || points.length < 3) {
      ranges[tier.key] = null;
      continue;
    }

    const fit = reg.slope * nextIdx + reg.intercept;

    // Residual standard deviation (n−2 degrees of freedom for linear regression).
    // In log space this is a ratio, so the range is the prediction multiplied and
    // divided by it rather than offset by a fixed number of points.
    const n = points.length;
    const sumSqResiduals = points.reduce((sum, p) => {
      const fitted = reg.slope * p.x + reg.intercept;
      return sum + (p.y - fitted) ** 2;
    }, 0);
    const stdDev = Math.sqrt(sumSqResiduals / (n - 2));

    ranges[tier.key] = {
      predicted: Math.round(Math.exp(fit)),
      low: Math.max(1, Math.round(Math.exp(fit - stdDev))),
      high: Math.round(Math.exp(fit + stdDev)),
      stdDev: Math.round(Math.exp(stdDev) * 100) / 100,
      n,
    };
  }

  return ranges;
}
