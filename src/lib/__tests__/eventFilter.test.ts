import { describe, it, expect } from 'vitest';
import { selectedEventCardIds, type EventEntry } from '../eventFilter';

const EVENTS: EventEntry[] = [
  { name: 'Sengoku Swimsuit Scene', date: '2026-07-30', cards: ['1770', '1774'] },
  { name: 'Interstellar Tanabata Festival', date: '2026-06-28', cards: ['1713', '1719'] },
  { name: 'Shadow over Christmas', date: '2022-12-14', cards: ['176', '1770'] },
];

describe('selectedEventCardIds', () => {
  it('returns the cards of the selected event', () => {
    const ids = selectedEventCardIds(EVENTS, ['Sengoku Swimsuit Scene']);
    expect([...ids].sort()).toEqual(['1770', '1774']);
  });

  it('unions cards across multiple selected events', () => {
    const ids = selectedEventCardIds(EVENTS, [
      'Sengoku Swimsuit Scene',
      'Interstellar Tanabata Festival',
    ]);
    expect([...ids].sort()).toEqual(['1713', '1719', '1770', '1774']);
  });

  it('deduplicates a card that appears in two events', () => {
    const ids = selectedEventCardIds(EVENTS, [
      'Sengoku Swimsuit Scene',
      'Shadow over Christmas',
    ]);
    // 1770 is in both and must appear once
    expect([...ids].sort()).toEqual(['176', '1770', '1774']);
  });

  it('returns an empty set when nothing is selected', () => {
    // CardTable reads this as "filter inactive"; returning every id would be wrong too,
    // but returning a non-empty set here would silently filter the table.
    expect(selectedEventCardIds(EVENTS, []).size).toBe(0);
  });

  it('ignores unknown event names', () => {
    // A stale ?event= URL param must not throw or match everything.
    const ids = selectedEventCardIds(EVENTS, ['No Such Event']);
    expect(ids.size).toBe(0);
  });

  it('keeps the known events when mixed with an unknown one', () => {
    const ids = selectedEventCardIds(EVENTS, ['No Such Event', 'Sengoku Swimsuit Scene']);
    expect([...ids].sort()).toEqual(['1770', '1774']);
  });

  it('handles an empty event list', () => {
    // events.json failed to load — the dropdown is hidden, but be safe anyway.
    expect(selectedEventCardIds([], ['Sengoku Swimsuit Scene']).size).toBe(0);
  });
});
