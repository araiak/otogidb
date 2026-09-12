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
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
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
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-xs text-secondary">Damage by card</span>
          {/* The headline mean averages every run; this breakdown comes from the one
              traced battle, so say which is which rather than letting them look like
              the same number. */}
          <span className="text-[10px] text-secondary/60">example run</span>
        </div>
        <div className="flex flex-col gap-2">
          {byDamage.map((c) => {
            // The bar does double duty: its LENGTH is this card's share of the team's
            // damage, and its two segments are how that damage was dealt. One graphic
            // answers both "who carried" and "on autos or on casts".
            const autoTot = c.auto?.total ?? 0;
            const skillTot = c.skill?.total ?? 0;
            const own = autoTot + skillTot || 1;
            const row = (
              kind: 'auto' | 'skill',
              d: NonNullable<typeof c.auto>,
              dim: boolean
            ) => (
              <>
                <span className="flex items-center gap-1 text-secondary/70">
                  <span
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: dim
                        ? 'color-mix(in srgb, var(--color-accent) 45%, transparent)'
                        : 'var(--color-accent)',
                    }}
                  />
                  {kind}
                </span>
                <span className="text-right text-primary/80">{short(d.total)}</span>
                <span className="text-right">
                  {d.n}×{short(d.mean)}
                </span>
                <span
                  className="text-right text-secondary/50"
                  title={`${d.min.toLocaleString()} – ${d.max.toLocaleString()}`}
                >
                  {short(d.min)}–{short(d.max)}
                </span>
              </>
            );
            return (
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
                {/* Inline styles, not utilities: global.css carries unlayered rules
                    and in Tailwind v4 unlayered CSS beats @layer utilities, so the
                    bar's height and colours were being dropped and it rendered as
                    nothing at all. */}
                <div
                  style={{
                    height: 8,
                    marginTop: 4,
                    borderRadius: 999,
                    background: 'var(--color-surface)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      height: '100%',
                      width: `${(c.damage / total) * 100}%`,
                    }}
                  >
                    <div
                      style={{
                        width: `${(autoTot / own) * 100}%`,
                        background: 'color-mix(in srgb, var(--color-accent) 45%, transparent)',
                      }}
                      title={`auto ${short(autoTot)}`}
                    />
                    <div
                      style={{ width: `${(skillTot / own) * 100}%`, background: 'var(--color-accent)' }}
                      title={`skill ${short(skillTot)}`}
                    />
                  </div>
                </div>
                {(c.auto || c.skill) && (
                  <div className="mt-1 grid grid-cols-[2.4rem_2.6rem_3.8rem_1fr] gap-x-2 text-[10px] text-secondary/80 tabular-nums">
                    {c.auto && row('auto', c.auto, true)}
                    {c.skill && row('skill', c.skill, false)}
                  </div>
                )}
              </div>
            );
          })}
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
