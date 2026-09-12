/**
 * The run's headline numbers.
 *
 * Every figure here is produced by the simulator. Nothing on this page recomputes
 * damage -- that separation is the whole point of the rewrite. Cast timing lives on
 * the rotation rows and the full play-by-play in the timeline, so this stays a
 * summary: what the team did, and which cards did it.
 */

import type { SimResult } from '../../lib/sim/client';
import { slotIdFor } from '../../lib/sim/team';

const fmt = (n: number) => Math.round(n).toLocaleString();

/** 33,524,837 -> "33.5M" — the rail is too narrow for the full figure. */
function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

interface SimResultsProps {
  result: SimResult | null;
  running: boolean;
  error: string | null;
  nameOf: (slotKey: string) => string;
}

export function SimResults({ result, running, error, nameOf }: SimResultsProps) {
  if (error) {
    return (
      <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10 text-sm text-primary">
        <div className="font-medium mb-1">Simulation failed</div>
        <div className="text-secondary break-words">{error}</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-3 rounded-lg border border-border bg-background text-sm text-secondary">
        {running ? 'Simulating…' : 'Run a simulation to see the numbers.'}
      </div>
    );
  }

  const total = result.per_card.reduce((a, c) => a + c.damage, 0) || 1;
  // Spread across seeds as a percentage of the mean. Under a handful of runs this is
  // the honest read on how much of a gap between two teams is real.
  const spread = result.mean ? (result.sd / result.mean) * 100 : 0;
  const byDamage = [...result.per_card].sort((a, b) => b.damage - a.damage);

  return (
    <div className={`flex flex-col gap-3 ${running ? 'opacity-60 transition-opacity' : ''}`}>
      <div className="p-3 rounded-lg border border-border bg-background">
        <div className="text-xs text-secondary">Mean damage</div>
        <div className="text-2xl font-semibold text-primary tracking-tight">
          {fmt(result.mean)}
        </div>
        <div className="text-xs text-secondary mt-1">
          {result.iters} run{result.iters === 1 ? '' : 's'} · ±{spread.toFixed(1)}% ·{' '}
          {result.effective_time.toFixed(0)}s
          {result.deaths > 0 && (
            <span className="text-red-400">
              {' '}
              · {result.deaths} lost
              {result.wiped && ` · wiped at ${result.survival_time.toFixed(0)}s`}
            </span>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs text-secondary mb-1.5">Damage by card</div>
        <div className="flex flex-col gap-2">
          {byDamage.map((c) => (
            <div key={c.slot}>
              <div className="flex items-baseline text-xs">
                <span className="text-secondary mr-1">{slotIdFor(c.slot)}</span>
                <span className="truncate text-primary" title={nameOf(c.slot)}>
                  {nameOf(c.slot)}
                </span>
                <span className="ml-auto pl-2 text-secondary tabular-nums">
                  {short(c.damage)}
                </span>
              </div>
              <div className="h-1.5 mt-1 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full"
                  style={{ width: `${(c.damage / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-secondary mb-1.5">Skill casts</div>
        <div className="flex flex-col gap-1 text-xs">
          {Object.entries(result.casts).map(([slot, times]) => (
            <div key={slot} className="flex items-baseline">
              <span className="text-secondary mr-1">{slotIdFor(slot)}</span>
              <span className="truncate text-primary">{nameOf(slot)}</span>
              <span
                className={`ml-auto pl-2 tabular-nums ${
                  times.length === 0 ? 'text-secondary/60' : 'text-secondary'
                }`}
              >
                {times.length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
