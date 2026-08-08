/**
 * Availability Tests
 *
 * Tests for mergeAvailability() and computeClientSideAvailability().
 *
 * Key invariant: Standard gacha cards (in_standard_pool: true) must ALWAYS
 * be currently_available regardless of auction state.
 */
import { describe, it, expect } from 'vitest';
import {
  mergeAvailability,
  computeClientSideAvailability,
  isAuctionWindowActive,
  isStandardPoolOpen,
} from '../availability';
import type { AvailabilityData } from '../availability';
import type { CardsData } from '../../types/card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal CardsData with a single card */
function makeCardsData(cardId: string, acquisition: Record<string, unknown>): CardsData {
  return {
    cards: {
      [cardId]: {
        id: parseInt(cardId),
        name: 'Test Card',
        acquisition,
      } as any,
    },
    metadata: { version: 'test', generated_at: '', total_cards: 1 },
  } as unknown as CardsData;
}

/** Build an AvailabilityData with a single card */
function makeAvailabilityData(cardId: string, cardAvailability: Record<string, unknown>): AvailabilityData {
  return {
    version: 'test',
    last_updated: null,
    total_cards: 1,
    cards: { [cardId]: cardAvailability as any },
  };
}

const EXPIRED_DATE = '2020-01-01 00:00:00'; // well in the past (UTC+8)
const FUTURE_DATE = '2099-12-31 23:59:59';  // well in the future (UTC+8)

// ---------------------------------------------------------------------------
// isAuctionWindowActive
// ---------------------------------------------------------------------------

describe('isAuctionWindowActive', () => {
  it('returns true for null end_date (permanent auction)', () => {
    expect(isAuctionWindowActive(null)).toBe(true);
  });

  it('returns true for undefined end_date', () => {
    expect(isAuctionWindowActive(undefined)).toBe(true);
  });

  it('returns false for past date', () => {
    expect(isAuctionWindowActive(EXPIRED_DATE)).toBe(false);
  });

  it('returns true for future date', () => {
    expect(isAuctionWindowActive(FUTURE_DATE)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// mergeAvailability — THE BUG CASE and related invariants
// ---------------------------------------------------------------------------

describe('mergeAvailability', () => {
  it('BUG CASE: standard pool + expired auction → currently_available stays true', () => {
    // Index has NO gacha object (as in the real cards_index.json)
    const cardsData = makeCardsData('4', {
      currently_available: true,
      sources: ['gacha', 'auction'],
      // No gacha object here — stripped in index
    });

    const availabilityData = makeAvailabilityData('4', {
      currently_available: true,
      auction: {
        available: false,
        price_min: 500,
        price_max: 800,
        last_seen: '2025-12-01 00:00:00',
        last_count: null,
        stock_level: 'unavailable',
        end_date: EXPIRED_DATE,
      },
      gacha: { in_standard_pool: true },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    expect(result.cards['4'].acquisition?.currently_available).toBe(true);
  });

  it('standard pool + no auction → currently_available is true', () => {
    const cardsData = makeCardsData('4', {
      currently_available: true,
      sources: ['gacha'],
    });

    const availabilityData = makeAvailabilityData('4', {
      currently_available: true,
      gacha: { in_standard_pool: true },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    expect(result.cards['4'].acquisition?.currently_available).toBe(true);
  });

  it('standard pool + active auction → currently_available is true', () => {
    const cardsData = makeCardsData('4', {
      currently_available: true,
      sources: ['gacha', 'auction'],
    });

    const availabilityData = makeAvailabilityData('4', {
      currently_available: true,
      auction: {
        available: true,
        price_min: 500,
        price_max: 800,
        last_seen: null,
        last_count: 5,
        stock_level: 'high',
        end_date: FUTURE_DATE,
      },
      gacha: { in_standard_pool: true },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    expect(result.cards['4'].acquisition?.currently_available).toBe(true);
  });

  it('index has no gacha object but R2 has in_standard_pool → currently_available is true', () => {
    // Explicit test for the stripped-index scenario
    const cardsData = makeCardsData('7', {
      currently_available: true,
      sources: ['gacha', 'auction'],
      // gacha: undefined — intentionally absent
    });

    const availabilityData = makeAvailabilityData('7', {
      currently_available: true,
      auction: {
        available: false,
        price_min: 600,
        price_max: 900,
        last_seen: null,
        last_count: null,
        stock_level: 'unavailable',
        end_date: EXPIRED_DATE,
      },
      gacha: { in_standard_pool: true },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    expect(result.cards['7'].acquisition?.currently_available).toBe(true);
  });

  it('non-pool card + expired auction + no other sources → currently_available is false', () => {
    const cardsData = makeCardsData('100', {
      currently_available: true,
      sources: ['auction'],
    });

    const availabilityData = makeAvailabilityData('100', {
      currently_available: true,
      auction: {
        available: false,
        price_min: 300,
        price_max: 500,
        last_seen: null,
        last_count: null,
        stock_level: 'unavailable',
        end_date: EXPIRED_DATE,
      },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    expect(result.cards['100'].acquisition?.currently_available).toBe(false);
  });

  it('non-pool card + active auction with stock → currently_available is true', () => {
    const cardsData = makeCardsData('200', {
      currently_available: true,
      sources: ['auction'],
    });

    const availabilityData = makeAvailabilityData('200', {
      currently_available: true,
      auction: {
        available: true,
        price_min: 300,
        price_max: 500,
        last_seen: null,
        last_count: 3,
        stock_level: 'medium',
        end_date: FUTURE_DATE,
      },
    });

    const result = mergeAvailability(cardsData, availabilityData);
    // Window is active — no recalculation triggered
    expect(result.cards['200'].acquisition?.currently_available).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeClientSideAvailability
// ---------------------------------------------------------------------------

describe('computeClientSideAvailability', () => {
  it('standard pool + expired auction → currentlyAvailable true', () => {
    const result = computeClientSideAvailability({
      currently_available: true,
      auction: {
        available: false,
        price_min: 500,
        price_max: 800,
        last_seen: null,
        last_count: null,
        stock_level: 'unavailable',
        end_date: EXPIRED_DATE,
      },
      gacha: { in_standard_pool: true },
    });

    expect(result.currentlyAvailable).toBe(true);
    expect(result.auctionAvailable).toBe(false);
    expect(result.auctionStockLevel).toBe('unavailable');
  });

  it('no R2 gacha data + expired auction → currentlyAvailable false', () => {
    const result = computeClientSideAvailability({
      currently_available: true,
      auction: {
        available: false,
        price_min: 300,
        price_max: 500,
        last_seen: null,
        last_count: null,
        stock_level: 'unavailable',
        end_date: EXPIRED_DATE,
      },
      // no gacha field
    });

    expect(result.currentlyAvailable).toBe(false);
    expect(result.auctionAvailable).toBe(false);
  });

  it('active auction window → currentlyAvailable true', () => {
    const result = computeClientSideAvailability({
      currently_available: true,
      auction: {
        available: true,
        price_min: 300,
        price_max: 500,
        last_seen: null,
        last_count: 5,
        stock_level: 'high',
        end_date: FUTURE_DATE,
      },
    });

    expect(result.currentlyAvailable).toBe(true);
    expect(result.auctionAvailable).toBe(true);
  });
});


// ---------------------------------------------------------------------------
// isStandardPoolOpen
// ---------------------------------------------------------------------------

describe('isStandardPoolOpen', () => {
  const shift = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    const p = (n: number) => String(n).padStart(2, '0');
    // Emit in config format (UTC+8), which is what the pipeline ships.
    const u = new Date(d.getTime() + 8 * 3600000);
    return `${u.getUTCFullYear()}-${p(u.getUTCMonth() + 1)}-${p(u.getUTCDate())} ${p(u.getUTCHours())}:${p(u.getUTCMinutes())}:${p(u.getUTCSeconds())}`;
  };

  it('treats a missing start date as always in pool', () => {
    // Older pool cards often carry no start date; absence must not hide them.
    expect(isStandardPoolOpen(null)).toBe(true);
    expect(isStandardPoolOpen(undefined)).toBe(true);
    expect(isStandardPoolOpen('')).toBe(true);
  });

  it('returns false while the start date is still in the future', () => {
    expect(isStandardPoolOpen(shift(30))).toBe(false);
  });

  it('returns true once the start date has passed', () => {
    expect(isStandardPoolOpen(shift(-30))).toBe(true);
  });

  it('assumes open when the date cannot be parsed', () => {
    // Only a date we can read AND that is in the future should hide a card.
    expect(isStandardPoolOpen('not-a-date')).toBe(true);
    expect(isStandardPoolOpen('2026-13-45 99:99:99')).toBe(true);
  });

  it('applies the UTC+8 offset rather than treating the string as UTC', () => {
    // 8h ahead of UTC: a config time 4h in the "future" by naive UTC reading is
    // actually already open once the offset is applied.
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    const plus4 = new Date(now.getTime() + 4 * 3600000);
    const naiveUtc = `${plus4.getUTCFullYear()}-${p(plus4.getUTCMonth() + 1)}-${p(plus4.getUTCDate())} ${p(plus4.getUTCHours())}:${p(plus4.getUTCMinutes())}:${p(plus4.getUTCSeconds())}`;
    expect(isStandardPoolOpen(naiveUtc)).toBe(true);
  });
});
