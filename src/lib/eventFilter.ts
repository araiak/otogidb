/**
 * Event filter helpers for the card table.
 *
 * Event membership lives in /data/events.json rather than on the card, so this cannot be
 * a TanStack column filter — CardTable applies it directly in its filteredData memo.
 */

export interface EventEntry {
  /** Event name, as shown in the filter dropdown. */
  name: string;
  /** Event start date, "YYYY-MM-DD", or "" when unknown. */
  date?: string;
  /** Card IDs obtainable from this event (rewards + helpers + tagged cards). */
  cards: string[];
}

/**
 * Collect the card IDs belonging to the selected events.
 *
 * Returns an empty set when nothing is selected — callers should treat that as
 * "filter inactive" rather than "no matches", otherwise the table would show nothing.
 * Unknown names (e.g. a stale ?event= URL param) simply contribute no IDs.
 */
export function selectedEventCardIds(
  events: EventEntry[],
  selectedNames: string[]
): Set<string> {
  if (selectedNames.length === 0) return new Set();

  const selected = new Set(selectedNames);
  const ids = new Set<string>();
  for (const event of events) {
    if (!selected.has(event.name)) continue;
    for (const id of event.cards) ids.add(id);
  }
  return ids;
}
