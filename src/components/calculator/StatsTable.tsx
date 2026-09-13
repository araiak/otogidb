/**
 * Opening stats for the whole team — the six numbers that decide a fight.
 *
 * "Opening" means after entry/wave/reserve abilities, bonds and assists have landed
 * but before anyone acts. Caps are shown as headroom against the value you already
 * have, because a capped stat is the difference between a wasted buff and a real one.
 */

import type { SimCardStats } from '../../lib/sim/client';
import { slotIdFor } from '../../lib/sim/team';

const CRIT_CAP = 100;
/** get_attack_interval clamps the speed modifier to +/-100% and halves buffs. */
const SPEED_CAP = 100;

const num = (n?: number) => (typeof n === 'number' ? Math.round(n).toLocaleString() : '—');

/** 1st, 2nd, 3rd, 4th — the naive `${n}th` gives "3th". */
function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
const pct = (n?: number, dp = 0) => (typeof n === 'number' ? `${n.toFixed(dp)}%` : '—');

function CapTag() {
  return (
    <span className="ml-1 px-1 rounded bg-highlight text-[9px] font-bold tracking-wide text-black align-middle">
      CAP
    </span>
  );
}

export function StatsTable({ stats }: { stats: SimCardStats[] }) {
  if (stats.length === 0) return null;

  // ATK order decides who receives a ranked buff — most support skills target the
  // highest-ATK allies, so this ranking is the difference between a buff reaching
  // the carry and a support quietly stealing it.
  const byAtk = [...stats].sort((a, b) => b.atk - a.atk);
  const atkRank = new Map(byAtk.map((s, i) => [s.slot, i + 1]));
  const rows = byAtk;
  const overCap = stats.filter((s) => s.speed_capped);

  const head = 'text-[10px] uppercase tracking-wide text-secondary font-medium pb-2';
  const cell = 'py-2 border-t border-border/60 align-top';

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className={head}>Card</th>
              <th className={`${head} text-right`} title="Decides who receives ranked buffs">ATK</th>
              <th className={`${head} text-right`}>Crit rate</th>
              <th className={`${head} text-right`}>Crit DMG</th>
              <th className={`${head} text-right`} title="Applies to autos and skills">DMG</th>
              <th className={`${head} text-right`} title="Skill casts only">Skill</th>
              <th className={`${head} text-right`} title="Seconds between auto-attacks">Interval</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const rank = atkRank.get(s.slot) ?? 0;
              const critCapped = s.crit_rate >= CRIT_CAP;
              const wasted = Math.max(0, Math.abs(s.speed_mod) - SPEED_CAP);
              return (
                <tr key={s.slot} className="text-primary">
                  <td className={cell}>
                    <div className="text-xs font-medium truncate" title={s.name}>
                      <span className="text-secondary mr-1">{slotIdFor(s.slot)}</span>
                      {s.name || s.slot}
                    </div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{num(s.atk)}</div>
                    <div className={`text-[10px] ${rank <= 2 ? 'text-highlight' : 'text-secondary/70'}`}>
                      {rank <= 2 ? `buff target ${rank}` : ordinal(rank)}
                    </div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{pct(s.crit_rate, 1)}</div>
                    <div className="text-[10px] text-secondary/70">
                      of {CRIT_CAP}%{critCapped && <CapTag />}
                    </div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{pct(s.crit_dmg)}</div>
                    <div className="text-[10px] text-secondary/70">no cap</div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{pct(s.dmg)}</div>
                    <div className="text-[10px] text-secondary/70">no cap</div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{pct(s.skill_dmg)}</div>
                    <div className="text-[10px] text-secondary/70">
                      {s.skill_bond > 1 ? `bond +${((s.skill_bond - 1) * 100).toFixed(1)}%` : '—'}
                    </div>
                  </td>
                  <td className={`${cell} text-right tabular-nums`}>
                    <div>{typeof s.interval === 'number' ? `${s.interval.toFixed(2)}s` : '—'}</div>
                    <div className={`text-[10px] ${s.speed_capped ? 'text-highlight' : 'text-secondary/70'}`}>
                      spd {s.speed_mod >= 0 ? '+' : ''}
                      {pct(s.speed_mod)}
                      {s.speed_capped && <CapTag />}
                    </div>
                    {wasted > 0 && (
                      <div className="text-[10px] text-red-400">{wasted.toFixed(0)}% wasted</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 rounded-lg border border-highlight/40 bg-highlight/5">
          <div className="text-xs font-medium text-highlight mb-1">Who receives ranked buffs</div>
          <div className="text-xs text-secondary leading-relaxed">
            Most support skills target the highest-ATK allies, so the top two here are
            who a ranked buff lands on. An ATK bond raises a card in that order — which
            is how a support can quietly take a slot meant for a carry.
          </div>
        </div>
        <div
          className={`p-3 rounded-lg border ${
            overCap.length ? 'border-red-500/40 bg-red-500/5' : 'border-border bg-background'
          }`}
        >
          <div
            className={`text-xs font-medium mb-1 ${overCap.length ? 'text-red-400' : 'text-primary'}`}
          >
            {overCap.length
              ? `${overCap.length} card${overCap.length === 1 ? '' : 's'} at the speed cap`
              : 'Attack speed'}
          </div>
          <div className="text-xs text-secondary leading-relaxed">
            Interval is <span className="text-primary">(speed + 750) / 900</span>. Buffs
            count <span className="text-primary">half</span> and the modifier clamps at{' '}
            <span className="text-primary">±100%</span>, so the floor is half the base
            interval and anything past the clamp is wasted.
          </div>
        </div>
      </div>
    </div>
  );
}
