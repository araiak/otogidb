/**
 * The seven team slots as character circles, one selected for editing.
 *
 * Seven full editor panels on screen at once is a wall of search boxes; the circles
 * give you the team at a glance and the editor only has to serve the slot you are
 * actually changing.
 */

import type { Card } from "../../types/card";
import { getAndroidImageWithFallback } from "../../lib/images";
import {
  HELPER_INDEX,
  SLOT_COUNT,
  SLOT_IDS,
  SLOT_LABELS,
} from "../../lib/sim/team";

interface TeamSlotTabsProps {
  active: number;
  onSelect: (index: number) => void;
  cardAt: (index: number) => Card | null;
  assistAt: (index: number) => Card | null;
  bondCountAt: (index: number) => number;
}

export function TeamSlotTabs({
  active,
  onSelect,
  cardAt,
  assistAt,
  bondCountAt,
}: TeamSlotTabsProps) {
  // Battle slots on one row, reserves on their own beneath: the two do different
  // jobs — reserves never attack and their bonds do nothing — so wrapping them into
  // the same run of circles hid the distinction.
  const tab = (i: number) => {
    const card = cardAt(i);
    const assist = assistAt(i);
    const bonds = bondCountAt(i);
    const isActive = i === active;
    const img = card ? getAndroidImageWithFallback(card) : null;
    return (
      <button
        key={i}
        type="button"
        onClick={() => onSelect(i)}
        className={`flex flex-col items-center w-[5rem] p-1 pb-1.5 rounded-lg border transition-colors ${
          isActive
            ? "border-accent bg-accent/10"
            : "border-transparent hover:border-border"
        }`}
        title={card ? `${SLOT_LABELS[i]} — ${card.name}` : SLOT_LABELS[i]}
        aria-pressed={isActive}
      >
        <div className="relative">
          <span
            className={`absolute -top-1 -left-1 z-10 px-1 rounded text-[10px] font-medium border border-background ${
              isActive ? "bg-accent text-white" : "bg-surface text-secondary"
            }`}
          >
            {SLOT_IDS[i]}
          </span>
          <div
            className={`w-12 h-12 rounded-full overflow-hidden border ${
              isActive ? "border-accent" : "border-border"
            } bg-surface`}
          >
            {img ? (
              <img
                src={img}
                alt={card?.name || ""}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-secondary/60">
                +
              </div>
            )}
          </div>
          {assist && (
            // The assist rides as a smaller offset circle rather than a dot, so an
            // unselected slot still shows both halves of what it contributes.
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-background bg-surface"
              title={`Assist: ${assist.name}`}
            >
              <img
                src={getAndroidImageWithFallback(assist)}
                alt={assist.name || ""}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          )}
          {bonds > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-600 text-white text-[10px] flex items-center justify-center border border-background"
              title={`${bonds} bond${bonds === 1 ? "" : "s"}`}
            >
              {bonds}
            </span>
          )}
        </div>
        <span
          className={`mt-1 w-full text-[10px] text-center truncate ${
            isActive ? "text-primary" : "text-secondary"
          }`}
        >
          {card ? card.name : i === HELPER_INDEX ? "Helper" : SLOT_LABELS[i]}
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: HELPER_INDEX + 1 }, (_, i) => tab(i))}
      </div>
      {/* No "Reserve" caption: it sat inline and pushed R1 out of line with the row
          above, and the R1/R2 badges already say what these are. */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: SLOT_COUNT - HELPER_INDEX - 1 }, (_, i) =>
          tab(HELPER_INDEX + 1 + i),
        )}
      </div>
    </div>
  );
}
