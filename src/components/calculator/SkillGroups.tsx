/**
 * Cast groups, one row per group.
 *
 * A group fires when its lead member can cast at 1 orb, and its members then cast in
 * the listed order -- that is what makes a group a burst window rather than a trickle.
 * Priority runs top to bottom; anything left in "Do not cast" never casts at all.
 *
 * Laid out as rows rather than columns so the rotation stays compact vertically and
 * the timeline below it gets the height. A per-group cadence strip lived here and was
 * removed: at 128px it was too small to read, and the timeline says the same thing in
 * words a few pixels further down.
 *
 * Native HTML5 drag and drop: no library for what the platform already does.
 */

import { useState } from 'react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback } from '../../lib/images';
import { SLOT_LABELS, slotIdFor } from '../../lib/sim/team';

interface SkillGroupsProps {
  /** Engine slot keys that have a card, in slot order. */
  available: string[];
  groups: string[][];
  onChange: (groups: string[][]) => void;
  cardOf: (slotKey: string) => Card | null;
  assistOf: (slotKey: string) => Card | null;
  nameOf: (slotKey: string) => string;
}

export function SkillGroups({
  available,
  groups,
  onChange,
  cardOf,
  assistOf,
  nameOf,
}: SkillGroupsProps) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const grouped = new Set(groups.flat());
  const unassigned = available.filter((s) => !grouped.has(s));

  /** Move a slot into `target` (-1 = do-not-cast); `before` inserts ahead of it. */
  function move(slot: string, target: number, before?: string) {
    const next = groups.map((g) => g.filter((s) => s !== slot));
    if (target >= 0) {
      while (next.length <= target) next.push([]);
      const at = before ? next[target].indexOf(before) : -1;
      if (at >= 0) next[target].splice(at, 0, slot);
      else next[target] = [...next[target], slot];
    }
    while (next.length > 1 && next[next.length - 1].length === 0) next.pop();
    onChange(next);
  }

  function onDrop(target: number, before?: string) {
    if (dragging && dragging !== before) move(dragging, target, before);
    setDragging(null);
    setOver(null);
  }

  function circle(slot: string, index: number, group: number) {
    const card = cardOf(slot);
    const assist = assistOf(slot);
    const name = nameOf(slot);
    const id = slotIdFor(slot);
    const img = card ? getAndroidImageWithFallback(card) : null;
    return (
      <div
        key={slot}
        draggable
        onDragStart={() => setDragging(slot)}
        onDragEnd={() => {
          setDragging(null);
          setOver(null);
        }}
        onDragOver={(e) => {
          if (dragging && dragging !== slot) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDrop={(e) => {
          e.stopPropagation();
          onDrop(group, slot);
        }}
        // Same treatment as the team slot tabs: 48px portrait, 24px assist offset
        // bottom-right, slot id top-left, name beneath. A card should look like the
        // same object in both places -- only the top-right badge differs, because
        // here it means cast order rather than bond count.
        className={`flex flex-col items-center w-[5rem] p-1 pb-1.5 shrink-0 rounded-lg border cursor-grab active:cursor-grabbing ${
          dragging === slot
            ? 'opacity-40 border-transparent'
            : dragging
              ? 'border-dashed border-accent/60'
              : 'border-transparent hover:border-border'
        }`}
        title={`${SLOT_LABELS[Number(slot.slice(1)) - 1]} (${id}) — ${name}${
          assist ? ` + ${assist.name}` : ''
        }`}
      >
        <div className="relative">
          <span className="absolute -top-1 -left-1 z-10 px-1 rounded bg-surface text-secondary text-[10px] font-medium border border-background">
            {id}
          </span>
          <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-surface">
            {img ? (
              <img src={img} alt={name} className="w-full h-full object-cover rounded-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-secondary/60">
                +
              </div>
            )}
          </div>
          {assist && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-background bg-surface"
              title={`Assist: ${assist.name}`}
            >
              <img
                src={getAndroidImageWithFallback(assist)}
                alt={assist.name || ''}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          )}
          {index >= 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center border border-background"
              title={`Casts ${index + 1} in this group`}
            >
              {index + 1}
            </span>
          )}
        </div>
        <span className="mt-1 w-full text-[10px] text-center text-secondary truncate">
          {name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map((g, i) => (
        <div
          key={i}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(i);
          }}
          onDragLeave={() => setOver((o) => (o === i ? null : o))}
          onDrop={() => onDrop(i)}
          className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
            over === i ? 'border-accent bg-accent/10' : 'border-border bg-background'
          }`}
        >
          <div className="w-16 shrink-0">
            <div className="text-xs font-medium text-primary">Group {i + 1}</div>
            <div className="text-[10px] text-secondary">{i === 0 ? 'fires first' : 'then'}</div>
          </div>
          <div className="flex gap-2 flex-grow min-w-0 overflow-x-auto">
            {g.map((s, j) => circle(s, j, i))}
            {g.length === 0 && (
              <span className="text-[10px] text-secondary/60 self-center">Drop a card here</span>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange([...groups, []])}
          className="px-2 py-1 rounded border border-border text-xs text-secondary hover:text-primary"
        >
          + Group
        </button>
        <span className="text-[10px] text-secondary">
          drag between groups · drop onto a card to cast it first
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(-1);
        }}
        onDragLeave={() => setOver((o) => (o === -1 ? null : o))}
        onDrop={() => onDrop(-1)}
        className={`flex items-center gap-3 p-2 rounded-lg border border-dashed transition-colors ${
          over === -1 ? 'border-accent bg-accent/10' : 'border-border'
        }`}
      >
        <div className="w-16 shrink-0 text-xs text-secondary">Do not cast</div>
        <div className="flex gap-2 flex-grow min-w-0 overflow-x-auto">
          {unassigned.map((s) => circle(s, -1, -1))}
          {unassigned.length === 0 && (
            <span className="text-[10px] text-secondary/60 self-center">
              drag a card here to keep its skill off — it still auto-attacks
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
