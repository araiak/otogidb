/**
 * Play-by-play of the simulated battle, written so a player can follow it in game.
 *
 * The cast list says a skill fired. This says what it put on whom and for how long,
 * which is the part you have to reproduce by hand at the right moment. Auto-attacks,
 * DoT ticks and auto-heals are filtered out engine-side -- there are thousands of them
 * and none is a decision.
 */

import { useMemo, useState } from 'react';
import type { SimEvent } from '../../lib/sim/client';
import { slotIdFor } from '../../lib/sim/team';

interface TimelineProps {
  events: SimEvent[];
  nameOf: (slotKey: string) => string;
}

const KIND_STYLE: Record<string, { dot: string; label: string }> = {
  cast: { dot: 'bg-accent', label: 'Cast' },
  buff: { dot: 'bg-green-500', label: 'Buff' },
  debuff: { dot: 'bg-orange-500', label: 'Debuff' },
  cc: { dot: 'bg-red-500', label: 'CC' },
  death: { dot: 'bg-red-700', label: 'Death' },
  boss_cast: { dot: 'bg-purple-500', label: 'Boss' },
  wave_start: { dot: 'bg-secondary', label: 'Start' },
};

const fmt = (n: number) => Math.round(n).toLocaleString();

/** Percent values arrive as engine percentages (59.72 => "+59.7%"). */
function signedPct(v: number): string {
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

/** Enemy slots are E-prefixed. They must NOT go through nameOf, which indexes the
 *  player team by slot number and would render the boss ("E1") as slot 1's card. */
function label(slot: string | null, nameOf: (s: string) => string): string {
  if (!slot) return '';
  if (slot.startsWith('E')) return 'The boss';
  return nameOf(slot);
}

/** The same card can occupy two slots, so a bare name is ambiguous on a timeline
 *  where both are acting. The slot id disambiguates without another lookup. */
function slotTag(slot: string | null): string {
  return !slot || slot.startsWith('E') ? '' : slotIdFor(slot);
}

function who(e: SimEvent, nameOf: (s: string) => string): string {
  if (!e.target) return '';
  if (e.target.startsWith('E')) return 'the enemy';
  if (e.target === e.actor) return 'itself';
  return `${slotIdFor(e.target)} ${nameOf(e.target)}`;
}

function describe(e: SimEvent, nameOf: (s: string) => string): string {
  switch (e.kind) {
    case 'cast': {
      // A buff or heal cast produces no attack, so there is no damage to report --
      // saying "0 damage" reads as a failed cast rather than a support cast.
      const orbs = e.cost ? ` · ${e.cost} orb${e.cost === 1 ? '' : 's'}` : '';
      if (typeof e.damage !== 'number') return `casts${orbs}`;
      return `casts — ${fmt(e.damage)} damage${e.crit ? ' (crit)' : ''}${orbs}`;
    }
    case 'buff':
    case 'debuff': {
      const dur = e.permanent ? 'rest of fight' : `${(e.duration || 0).toFixed(0)}s`;
      // Prefer the actual change over the effect's nominal value: a second copy of a
      // capped debuff reads "-75% -> -75%", which is the useful fact.
      if (typeof e.before === 'number' && typeof e.after === 'number') {
        // Same value in and out means the stat was already at its cap. That is not
        // a wasted cast: it refreshes the window, which is how a duplicated carry
        // extends a debuff instead of re-applying it into itself.
        if (e.before === e.after) {
          return `${e.stat} held at ${e.after.toFixed(1)}% on ${who(e, nameOf)} — window refreshed to ${dur}`;
        }
        return `${e.stat} ${e.before.toFixed(1)}% → ${e.after.toFixed(1)}% on ${who(e, nameOf)} — ${dur}`;
      }
      const mag = typeof e.value === 'number' ? ` ${signedPct(e.value)}` : '';
      return `${e.stat}${mag} on ${who(e, nameOf)} — ${dur}`;
    }
    case 'cc':
      return `${e.stat} on ${who(e, nameOf)} — ${(e.duration || 0).toFixed(0)}s`;
    case 'death':
      return `${who(e, nameOf)} dies`;
    case 'boss_cast':
      return 'casts';
    case 'wave_start':
      return 'Fight starts';
    default:
      return e.kind;
  }
}

export function Timeline({ events, nameOf }: TimelineProps) {
  const [showAll, setShowAll] = useState(false);
  const [kinds, setKinds] = useState<Set<string>>(new Set());

  // Tolerate a result with no timeline: the engine bundle is a build artifact, and a
  // stale one (built before this field existed) would otherwise blank the whole page.
  const all = useMemo(() => events ?? [], [events]);

  const filtered = useMemo(
    () => (kinds.size === 0 ? all : all.filter((e) => kinds.has(e.kind))),
    [all, kinds]
  );

  // A 300s fight is ~120 events. Showing the first cycle by default is usually
  // enough to copy the rotation; the rest repeats.
  const shown = showAll ? filtered : filtered.slice(0, 30);

  const present = useMemo(() => {
    const seen: string[] = [];
    for (const e of all) if (!seen.includes(e.kind)) seen.push(e.kind);
    return seen;
  }, [all]);

  function toggle(kind: string) {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  if (all.length === 0) return null;

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex flex-wrap gap-1 ml-auto">
          {present.map((k) => {
            const on = kinds.size === 0 || kinds.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggle(k)}
                className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  on
                    ? 'border-border text-primary bg-surface'
                    : 'border-transparent text-secondary/60'
                }`}
                title={`Show or hide ${KIND_STYLE[k]?.label || k} events`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${
                    KIND_STYLE[k]?.dot || 'bg-secondary'
                  }`}
                />
                {KIND_STYLE[k]?.label || k}
              </button>
            );
          })}
        </div>
      </div>

      <ol className="rounded-lg border border-border bg-background divide-y divide-border/50">
        {shown.map((e, i) => (
          <li key={i} className="flex items-baseline gap-3 px-3 py-1.5 text-sm">
            <span className="w-14 shrink-0 text-right text-secondary tabular-nums">
              {e.t.toFixed(1)}s
            </span>
            <span
              className={`w-2 h-2 shrink-0 rounded-full translate-y-[-1px] ${
                KIND_STYLE[e.kind]?.dot || 'bg-secondary'
              }`}
            />
            <span className="text-primary">
              {e.actor && (
                <>
                  {slotTag(e.actor) && (
                    <span className="text-secondary/70 mr-1">{slotTag(e.actor)}</span>
                  )}
                  <strong className="font-medium">{label(e.actor, nameOf)} </strong>
                </>
              )}
              <span className="text-secondary">{describe(e, nameOf)}</span>
            </span>
          </li>
        ))}
      </ol>

      {filtered.length > shown.length && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-secondary hover:text-primary"
        >
          Show all {filtered.length} events
        </button>
      )}
      {showAll && filtered.length > 30 && (
        <button
          type="button"
          onClick={() => setShowAll(false)}
          className="mt-2 text-xs text-secondary hover:text-primary"
        >
          Show less
        </button>
      )}
    </section>
  );
}
