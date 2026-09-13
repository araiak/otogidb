/**
 * One card's opening stat line.
 *
 * These come from the engine's snapshot taken after every entry/wave/reserve ability,
 * bond and assist has landed but before anyone acts -- what the card actually starts
 * the fight with. Reading the stats at the end of the battle instead would show
 * whatever combat buffs happened to still be ticking when the bell rang.
 */

import type { SimCardStats } from '../../lib/sim/client';

interface CardStatsProps {
  stats: SimCardStats | null;
  compact?: boolean;
}

// The engine bundle is a separate build artifact from this page. A stale one returns
// a result missing the newer fields, and an unguarded `.toFixed` on it blanks the whole
// page -- so every read here tolerates undefined and shows a dash instead.
const num = (n?: number) => (typeof n === 'number' ? Math.round(n).toLocaleString() : '—');
const pct = (n?: number) => (typeof n === 'number' ? `${n.toFixed(1)}%` : '—');

export function CardStats({ stats, compact = false }: CardStatsProps) {
  if (!stats) return null;

  // Skill bond is a multiplier (1.15), unlike the others which are modifier totals.
  const bondPct = ((stats.skill_bond ?? 1) - 1) * 100;

  const rows: { label: string; value: string; hint: string }[] = [
    { label: 'ATK', value: num(stats.atk), hint: 'Display ATK — the engine divides by 10 internally' },
    { label: 'HP', value: num(stats.hp), hint: 'Max HP after bonds and passives' },
    { label: 'Crit rate', value: pct(stats.crit_rate), hint: 'Resolved rate, capped the way the battle caps it' },
    { label: 'Crit DMG', value: pct(stats.crit_dmg), hint: 'Added on top of the 2x crit, on crit only' },
    { label: 'DMG', value: pct(stats.dmg), hint: 'General damage modifier — applies to autos and skills' },
    { label: 'Normal DMG', value: pct(stats.normal_dmg), hint: 'Auto-attacks only; the skill path never reads it' },
    { label: 'Skill DMG', value: pct(stats.skill_dmg), hint: 'Skill casts only' },
  ];
  if (bondPct > 0) {
    rows.push({
      label: 'Skill bond',
      value: `+${bondPct.toFixed(1)}%`,
      hint: 'Multiplicative on skill base, from bonds',
    });
  }
  rows.push({
    label: 'Interval',
    value: typeof stats.interval === 'number' ? `${stats.interval.toFixed(2)}s` : '—',
    hint: 'Seconds between auto-attacks, after the speed modifier and its clamp',
  });
  if (stats.speed_capped) {
    rows.push({
      label: 'Speed',
      value: `+${stats.speed_mod.toFixed(0)}% (cap)`,
      hint: 'The modifier clamps at +/-100%; anything past it is wasted',
    });
  }

  // One stat per line when compact. The side column is ~270px, and four columns of
  // label+value clipped every one of them; the page is already a vertical read, so
  // a list costs nothing and stops the numbers being cut off.
  return (
    <div className={compact ? 'flex flex-col gap-0.5' : 'grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1'}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-2" title={r.hint}>
          <span className="text-xs text-secondary">{r.label}</span>
          <span className="text-xs text-primary tabular-nums">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
