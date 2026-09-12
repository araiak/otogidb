/**
 * One card's free bond slots: pick the type, then the value.
 *
 * Both values are offered because a player may only hold the standard bond — 7.5%
 * needs a donor sharing the recipient's type AND class, which not everyone has. The
 * value row is inert until a type is chosen, so an empty slot is one obvious state
 * rather than two controls disagreeing.
 */

import type { BondKind, BondSlot } from '../../lib/sim/client';

const KINDS: { key: BondKind; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'normal', label: 'ATK' },
  { key: 'skill', label: 'Skill' },
];
const VALUES = [5, 7.5];

interface BondPickerProps {
  bonds: BondSlot[];
  onChange: (bonds: BondSlot[]) => void;
  /** How many free slots this card has — the assist occupies one of its three. */
  slots?: number;
}

export function BondPicker({ bonds, onChange, slots = 2 }: BondPickerProps) {
  function set(index: number, bond: BondSlot | null) {
    const next = [...bonds];
    if (bond) next[index] = bond;
    else next.splice(index, 1);
    onChange(next.filter(Boolean) as BondSlot[]);
  }

  const pill = (on: boolean, label: string, onPick: () => void, dim = false) => (
    <button
      type="button"
      onClick={onPick}
      disabled={dim}
      className={`px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
        on
          ? 'border-accent bg-accent text-white font-medium'
          : 'border-border text-secondary hover:text-primary'
      } ${dim ? 'opacity-35 cursor-default' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: slots }, (_, i) => {
        const current = bonds[i];
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="w-4 text-[10px] text-secondary">{i + 1}</span>
              {pill(!current, 'None', () => set(i, null))}
              {KINDS.map((k) =>
                pill(current?.[0] === k.key, k.label, () =>
                  set(i, [k.key, current?.[1] ?? 7.5])
                )
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4" />
              {VALUES.map((v) =>
                pill(
                  !!current && current[1] === v,
                  `${v}%`,
                  () => current && set(i, [current[0], v]),
                  !current
                )
              )}
              {current && current[1] === 7.5 && (
                <span className="text-[10px] text-secondary/70 ml-1">
                  same type + class
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
