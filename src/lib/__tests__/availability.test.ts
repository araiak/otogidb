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
