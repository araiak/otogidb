/**
 * Event Rankings Chart
 * Interactive chart showing score cutoffs per rank tier across events over time.
 * Events are split into Tower (billions) and Story (millions) types with separate charts.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  formatScore,
  buildTiers,
  buildChartData,
  buildTrendData,
} from '../../lib/eventRankings';
import type { EventCutoff, EventCutoffsData } from '../../lib/eventRankings';

// --- Constants ---

const TIER_COLORS = [
  '#f59e0b', // amber
  '#6366f1', // indigo
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f97316', // orange
  '#8b5cf6', // violet
  '#14b8a6', // teal
];

const PERIOD_LABELS: Record<string, string> = {
  first_half: 'First Half',
  second_half: 'Second Half',
  overall: 'Overall',
};

// --- Helpers ---

function shortenName(name: string): string {
  if (name.length <= 20) return name;
  return name.slice(0, 18) + '…';
}

// --- Custom Tooltip ---

interface TooltipPayloadItem {
  dataKey: string;
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  events,
  period,
  eventMeta,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  events: EventCutoff[];
  period: string;
  eventMeta: Record<string, { participation: number | null }>;
}) {
  if (!active || !payload?.length || !label) return null;
  const meta = eventMeta[label];
  const dataLines = payload.filter(p => !String(p.dataKey).startsWith('trend_'));

  // Look up actual cutoffs for the hovered event (not from pre-computed tiers)
  const event = events.find(e => e.event_name === label);
  const eventCutoffs = event?.periods[period]?.cutoffs ?? [];

  return (
    <div className="card p-3 text-sm max-w-xs shadow-lg">
      <div className="font-semibold mb-2">{label}</div>
      {dataLines.map(entry => {
        // Match by score value to get the exact range for this specific event
        const cutoff = eventCutoffs.find(c => c.cutoff_score === entry.value);
        const rangeLabel = cutoff ? `#${cutoff.rank_min}–${cutoff.rank_max}` : null;
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-secondary font-mono">{entry.dataKey}</span>
            {rangeLabel && <span className="text-secondary text-xs">({rangeLabel})</span>}
            <span className="font-mono font-medium ml-auto pl-2">{formatScore(entry.value)}</span>
          </div>
        );
      })}
      {meta?.participation != null && (
        <div className="mt-2 pt-2 border-t border-surface flex items-center justify-between">
          <span className="text-secondary text-xs">Participants</span>
          <span className="font-mono font-medium text-xs">{meta.participation.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// --- Custom X Axis Tick ---

function CustomXTick({
  x = 0,
  y = 0,
  payload,
  eventMeta,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
  eventMeta: Record<string, { participation: number | null }>;
}) {
  if (!payload) return null;
  const name = payload.value;
  const meta = eventMeta[name];
  const hasParticipation = meta?.participation != null;

  return (
    <g transform={`translate(${x},${y})`}>
      <title>{hasParticipation ? `${name}\nParticipants: ${meta!.participation!.toLocaleString()}` : name}</title>
      <text
        x={0} y={0} dy={16}
        textAnchor="end"
        fill="currentColor"
        fontSize={11}
        transform="rotate(-40)"
      >
        {shortenName(name)}{hasParticipation ? ' ◆' : ''}
      </text>
    </g>
  );
}

// --- Sub-chart (Tower or Story) ---

function RankingSubChart({
  title,
  subtitle,
  events,
  period,
  eventMeta,
}: {
  title: string;
  subtitle: string;
  events: EventCutoff[];
  period: string;
  eventMeta: Record<string, { participation: number | null }>;
}) {
  const tiers = useMemo(() => buildTiers(events, period), [events, period]);
  const [activeTiers, setActiveTiers] = useState<Set<string>>(new Set());

  // Reset to all tiers when tiers change (period switch)
  useEffect(() => {
    if (tiers.length) setActiveTiers(new Set(tiers.map(t => t.key)));
  }, [tiers]);

  const chartData = useMemo(
    () => buildChartData(events, period, tiers),
    [events, period, tiers],
  );

  const trendData = useMemo(
    () => buildTrendData(chartData, tiers, activeTiers),
    [chartData, tiers, activeTiers],
  );

  const mergedData = useMemo(
    () => chartData.map((row, i) => ({ ...row, ...trendData[i] })),
    [chartData, trendData],
  );

  const activeTierList = tiers.filter(t => activeTiers.has(t.key));

  const toggleTier = (key: string) => {
    setActiveTiers(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  if (!events.length) return null;

  return (
    <div className="mb-10">
      <div className="mb-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-secondary">
          {subtitle} · {events.length} event{events.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tier toggles — independent per chart */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {tiers.map((tier, idx) => {
          const color = TIER_COLORS[idx % TIER_COLORS.length];
          const active = activeTiers.has(tier.key);
          return (
            <button
              key={tier.key}
              onClick={() => toggleTier(tier.key)}
              className={`px-3 py-1 rounded text-xs font-mono transition-opacity border ${active ? 'opacity-100' : 'opacity-40'}`}
              style={{ borderColor: color, color: active ? color : undefined }}
            >
              {tier.key}
            </button>
          );
        })}
      </div>

      <div className="card p-4">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={mergedData} margin={{ top: 10, right: 20, left: 10, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis
              dataKey="name"
              tick={<CustomXTick eventMeta={eventMeta} />}
              interval={0}
              height={90}
            />
            <YAxis
              scale="log"
              domain={['auto', 'auto']}
              tickFormatter={formatScore}
              tick={{ fontSize: 11 }}
              width={65}
            />
            <Tooltip content={<CustomTooltip events={events} period={period} eventMeta={eventMeta} />} />

            {activeTierList.map((tier, idx) => {
              const color = TIER_COLORS[idx % TIER_COLORS.length];
              return (
                <Line
                  key={tier.key}
                  type="monotone"
                  dataKey={tier.key}
                  name={tier.key}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 4, fill: color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              );
            })}

            {activeTierList.map((tier, idx) => {
              const color = TIER_COLORS[idx % TIER_COLORS.length];
              return (
                <Line
                  key={`trend_${tier.key}`}
                  type="monotone"
                  dataKey={`trend_${tier.key}`}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="5 3"
                  dot={false}
                  activeDot={false}
                  legendType="none"
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>

        {events.some(e => e.participation != null) && (
          <p className="text-xs text-secondary mt-2">◆ = participation data available (hover for count)</p>
        )}
      </div>

      {/* Data table */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-surface">
              <th className="text-left py-2 pr-4 font-medium text-secondary whitespace-nowrap">Event</th>
              {tiers.map(tier => (
                <th key={tier.key} className="text-right py-2 px-3 font-mono font-medium text-secondary whitespace-nowrap">
                  {tier.key}
                </th>
              ))}
              <th className="text-right py-2 pl-3 font-medium text-secondary whitespace-nowrap">Participants</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => {
              const cutoffs = event.periods[period]?.cutoffs ?? [];
              return (
                <tr key={event.event_id} className="border-b border-surface/50 hover:bg-surface/30 transition-colors">
                  <td className="py-2 pr-4 whitespace-nowrap">{event.event_name}</td>
                  {tiers.map(tier => {
                    const cutoff = cutoffs.find(c => c.rank_min === tier.rank_min && c.rank_max === tier.rank_max);
                    return (
                      <td key={tier.key} className="text-right py-2 px-3 font-mono tabular-nums">
                        {cutoff ? formatScore(cutoff.cutoff_score) : <span className="text-secondary">—</span>}
                      </td>
                    );
                  })}
                  <td className="text-right py-2 pl-3 font-mono tabular-nums">
                    {event.participation != null
                      ? event.participation.toLocaleString()
                      : <span className="text-secondary">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Main Component ---

export function EventRankingsChart() {
  const [data, setData] = useState<EventCutoffsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<string>>(new Set());

  const togglePeriod = (period: string) => {
    setCollapsedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period); else next.add(period);
      return next;
    });
  };

  useEffect(() => {
    fetch('/data/event_cutoffs.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EventCutoffsData>;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  const availablePeriods = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const event of data.events)
      for (const p of Object.keys(event.periods)) set.add(p);
    const order = ['overall', 'first_half', 'second_half'];
    return [...order.filter(p => set.has(p)), ...[...set].filter(p => !order.includes(p))];
  }, [data]);

  const { towerEvents, storyEvents } = useMemo(() => {
    if (!data) return { towerEvents: [], storyEvents: [] };
    const tower: EventCutoff[] = [];
    const story: EventCutoff[] = [];
    for (const event of data.events)
      (event.event_type === 'tower' ? tower : story).push(event);
    return { towerEvents: tower, storyEvents: story };
  }, [data]);

  const eventMeta = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(
      data.events.map(e => [e.event_name, { participation: e.participation }])
    );
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
        <span className="ml-3 text-secondary">Loading ranking data…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card p-6 text-center">
        <div className="text-red-400 mb-2">Failed to load ranking data</div>
        <div className="text-sm text-secondary">{error ?? 'No data available'}</div>
      </div>
    );
  }

  if (!data.events.length) {
    return <div className="card p-6 text-center text-secondary">No ranking data available yet.</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Event Ranking Cutoffs</h1>
        <p className="text-secondary">
          Score thresholds per rank tier. Tower events (billions) and Story events (millions) use separate charts with independent Y-axis scales.
        </p>
      </div>

      {availablePeriods.map(period => {
        const towerForPeriod = towerEvents.filter(e => e.periods[period]);
        const storyForPeriod = storyEvents.filter(e => e.periods[period]);
        if (!towerForPeriod.length && !storyForPeriod.length) return null;
        const collapsed = collapsedPeriods.has(period);
        return (
          <section key={period} className="mb-8">
            <button
              onClick={() => togglePeriod(period)}
              className="w-full flex items-center justify-between py-2 border-b border-surface mb-6 group hover:text-accent transition-colors"
            >
              <h2 className="text-xl font-semibold">{PERIOD_LABELS[period] ?? period}</h2>
              <svg
                className={`w-5 h-5 text-secondary transition-transform ${collapsed ? '-rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {!collapsed && (
              <>
                <RankingSubChart
                  title="Tower Events"
                  subtitle="Scores in billions · log scale"
                  events={towerForPeriod}
                  period={period}
                  eventMeta={eventMeta}
                />
                <RankingSubChart
                  title="Story Events"
                  subtitle="Scores in millions · log scale"
                  events={storyForPeriod}
                  period={period}
                  eventMeta={eventMeta}
                />
              </>
            )}
          </section>
        );
      })}

      <p className="text-xs text-secondary mt-2">
        Last updated: {new Date(data.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}
