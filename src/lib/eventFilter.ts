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
/**
 * Card IDs belonging to events whose NAME matches a free-text query.
 *
 * Powers "anniversary" or "halloween" in the main search box. Event names are not in
 * cards_index.json at all, so Fuse cannot reach them — this is the only route.
 *
 * Substring rather than fuzzy on purpose: event names are long
 * ("Otogi 2nd anniversary special episode Incident of the surprise assault at the
 * Sakuma Mansion"), and fuzzy matching against them produces noisy partial hits.
 *
 * Returns an empty set for a blank or 2-char query, matching the search box's own
 * minimum, so a stray keystroke does not dump a whole event into the results.
 */
export function eventCardIdsMatchingQuery(
  events: EventEntry[],
  query: string
): Set<string> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return new Set();

  const ids = new Set<string>();
  for (const event of events) {
    if (!event.name.toLowerCase().includes(q)) continue;
    for (const id of event.cards) ids.add(id);
  }
  return ids;
}

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
