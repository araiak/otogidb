/**
 * Availability data fetching from R2 storage.
 *
 * Fetches card availability data (auction status, daily dungeon, etc.)
 * from R2 storage with manifest-based versioning for instant cache invalidation.
 */

import type { CardsData } from '../types/card';

/**
 * R2 base URL for availability data.
 * Can be configured via window.OTOGIDB_R2_URL or defaults to production URL.
 */
const R2_BASE_URL =
  typeof window !== 'undefined' && (window as any).OTOGIDB_R2_URL
    ? (window as any).OTOGIDB_R2_URL
    : 'https://r2.otogidb.com';

interface AvailabilityManifest {
  current_version: string;
  last_updated: string;
  file_url: string;
  file_size: number;
  cards_count: number;
}

interface AvailabilityData {
  version: string;
  last_updated: string | null;
  total_cards: number;
  cards: Record<string, CardAvailability>;
}

interface CardAvailability {
  currently_available: boolean;
  auction?: {
    available: boolean;
    price_min: number | null;
    price_max: number | null;
    last_seen: string | null;
    last_count: number | null;
    stock_level: 'high' | 'medium' | 'low' | 'unavailable';
    end_date?: string | null; // "YYYY-MM-DD HH:MM:SS" in UTC+8
  };
  daily?: {
    available: boolean;
    drop_rate: string | null;
    schedule: string[];
  };
  gacha?: {
    in_standard_pool?: boolean;
    featured_banners?: string[];
  };
}

// Export for use in components
export type { CardAvailability, AvailabilityData };

/**
 * Fetch availability manifest from R2.
 *
 * The manifest is always fetched fresh (no-cache) to ensure we have
 * the latest version pointer. Uses a 5 second timeout to avoid blocking
 * page load if R2 is unreachable.
 *
 * @returns Availability manifest or null if not found/failed
 */
export async function fetchAvailabilityManifest(): Promise<AvailabilityManifest | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${R2_BASE_URL}/availability/manifest.json`, {
      cache: 'no-cache', // Always check for new version
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Availability] Manifest not found:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Availability] Manifest fetch timed out');
    } else {
      console.error('[Availability] Failed to fetch manifest:', error);
    }
    return null;
  }
}

/**
 * Fetch versioned availability data from R2.
 *
 * Versioned files are immutable and can be cached forever.
 * Uses a 10 second timeout to avoid blocking page load.
 *
 * @param version - Version hash for the availability file
 * @returns Availability data or null if not found/failed
 */
export async function fetchAvailabilityData(version: string): Promise<AvailabilityData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${R2_BASE_URL}/availability/${version}.json`, {
      cache: 'force-cache', // Immutable file, cache forever
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Availability] Data not found for version:', version, response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[Availability] Data fetch timed out for version:', version);
    } else {
      console.error('[Availability] Failed to fetch data:', error);
    }
    return null;
  }
}

/**
 * Check if auction window is active based on end_date.
 * Game dates are UTC+8 timezone.
 *
 * @param endDateStr - End date string in "YYYY-MM-DD HH:MM:SS" format (UTC+8)
 * @returns true if auction window is still active, false if expired
 */
export function isAuctionWindowActive(endDateStr: string | null | undefined): boolean {
  if (!endDateStr) return true; // No end_date = permanent auction

  try {
    // Parse "YYYY-MM-DD HH:MM:SS" format (UTC+8)
    const [datePart, timePart] = endDateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    // Create date as UTC by subtracting 8 hours offset
    const endDateUTC = new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
    return new Date() < endDateUTC;
  } catch {
    return true; // Parse error = assume active
  }
}

/**
 * Computed availability values after client-side end_date check.
 */
export interface ComputedAvailability {
  /** Whether card is currently available from any source */
  currentlyAvailable: boolean;
  /** Auction stock level (or 'unavailable' if window expired) */
  auctionStockLevel: 'high' | 'medium' | 'low' | 'unavailable';
  /** Whether auction is available (window active + has stock) */
  auctionAvailable: boolean;
}

/**
 * Compute client-side availability from raw R2 data.
 *
 * Checks auction end_date and recalculates availability if the auction
 * window has expired. Use this in components that fetch R2 data directly.
 *
 * @param cardAvailability - Raw availability data from R2
 * @returns Computed availability with corrected values
 */
export function computeClientSideAvailability(
  cardAvailability: CardAvailability
): ComputedAvailability {
  let currentlyAvailable = cardAvailability.currently_available;
  let auctionStockLevel: ComputedAvailability['auctionStockLevel'] =
    cardAvailability.auction?.stock_level ?? 'unavailable';
  let auctionAvailable = cardAvailability.auction?.available ?? false;

  // Check if auction window has expired (client-side)
  if (cardAvailability.auction?.end_date) {
    const windowActive = isAuctionWindowActive(cardAvailability.auction.end_date);

    if (!windowActive) {
      // Auction window expired - override values
      auctionStockLevel = 'unavailable';
      auctionAvailable = false;

      // Recalculate currently_available if auction was contributing
      if (cardAvailability.currently_available) {
        // Check if card is still available via other sources in R2 data
        const hasOtherSource =
          cardAvailability.gacha?.in_standard_pool ||
          cardAvailability.daily?.available ||
          (cardAvailability.gacha?.featured_banners &&
            cardAvailability.gacha.featured_banners.length > 0);
        currentlyAvailable = !!hasOtherSource;
      }
    } else {
      // Window still active - use stock level to determine availability
      auctionAvailable =
        windowActive && cardAvailability.auction.stock_level !== 'unavailable';
    }
  }

  return {
    currentlyAvailable,
    auctionStockLevel,
    auctionAvailable,
  };
}

/**
 * Merge availability data into cards data.
 *
 * Updates cards in-place with availability information.
 * Only updates cards that already have acquisition data - doesn't create
 * acquisition objects from scratch since availability data is a subset.
 *
 * @param cardsData - Cards data to update
 * @param availabilityData - Availability data to merge
 * @returns Updated cards data (same reference)
 */
export function mergeAvailability(
  cardsData: CardsData,
  availabilityData: AvailabilityData
): CardsData {
  const mergedCount = { total: 0, updated: 0, skipped: 0 };

  for (const [cardId, cardAvailability] of Object.entries(availabilityData.cards)) {
    mergedCount.total++;

    const card = cardsData.cards[cardId];
    if (!card) {
      console.warn('[Availability] Card not found in index:', cardId);
      continue;
    }

    // Skip cards without acquisition data - we can only merge into existing structures
    const acquisition = card.acquisition;
    if (!acquisition) {
      mergedCount.skipped++;
      continue;
    }

    // Merge availability fields
    if (cardAvailability.currently_available !== undefined) {
      acquisition.currently_available = cardAvailability.currently_available;
    }

    if (cardAvailability.auction) {
      // Check if auction window is still active (client-side)
      const windowActive = isAuctionWindowActive(cardAvailability.auction.end_date);
      const hasStock = cardAvailability.auction.stock_level !== 'unavailable';

      acquisition.auction = {
        ...acquisition.auction,
        available: windowActive && hasStock, // Compute client-side
        // Keep existing fields, availability only updates availability status
      };

      // Recalculate currently_available if auction window expired
      if (!windowActive && cardAvailability.currently_available) {
        // Check if other sources still make card available
        const gacha = acquisition.gacha;
        const gachaAvail =
          gacha?.in_standard_pool || gacha?.featured_banners?.some((b) => b.is_current);
        const eventAvail =
          acquisition.event?.reward_tiers?.some((e) => e.is_current) ||
          acquisition.event?.tower_drops?.some((t) => t.is_current);
        const exchangeAvail = acquisition.exchange?.entries?.some((e) => e.is_current);
        const dailyAvail = acquisition.daily?.available;

        acquisition.currently_available = !!(
          gachaAvail ||
          eventAvail ||
          exchangeAvail ||
          dailyAvail
        );
      }
    }

    if (cardAvailability.daily && acquisition.daily) {
      acquisition.daily = {
        ...acquisition.daily,
        available: cardAvailability.daily.available,
        // Keep battle_id and other fields from original
      };
    }

    if (cardAvailability.gacha?.featured_banners && acquisition.gacha) {
      // Availability only tracks banner names, not full GachaBanner objects
      // Mark current banners based on availability data
      for (const banner of acquisition.gacha.featured_banners) {
        banner.is_current = cardAvailability.gacha.featured_banners.includes(
          `${banner.start}_${banner.end}` // Match by date range key
        );
      }
    }

    mergedCount.updated++;
  }

  console.log(
    `[Availability] Merged ${mergedCount.updated}/${mergedCount.total} cards, skipped ${mergedCount.skipped} without acquisition (version: ${availabilityData.version})`
  );

  return cardsData;
}

/**
 * Fetch and merge availability data with cards.
 *
 * This is the main entry point for loading availability data.
 * Handles manifest fetching, version checking, and data merging.
 *
 * @param cardsData - Cards data to enrich with availability
 * @returns Updated cards data with availability merged, or original if failed
 */
export async function fetchAndMergeAvailability(cardsData: CardsData): Promise<CardsData> {
  try {
    // Fetch manifest
    const manifest = await fetchAvailabilityManifest();
    if (!manifest) {
      console.warn('[Availability] No manifest available, using cards without availability data');
      return cardsData;
    }

    // Check if we need to fetch (could add version caching here later)
    const version = manifest.current_version;
    console.log('[Availability] Current version:', version);

    // Fetch availability data
    const availabilityData = await fetchAvailabilityData(version);
    if (!availabilityData) {
      console.warn('[Availability] Failed to fetch data, using cards without availability');
      return cardsData;
    }

    // Merge and return
    return mergeAvailability(cardsData, availabilityData);
  } catch (error) {
    console.error('[Availability] Unexpected error:', error);
    return cardsData; // Return original data on error
  }
}

/**
 * Get size information for availability data (for debugging).
 *
 * @param manifest - Availability manifest
 * @returns Human-readable size string
 */
export function getAvailabilitySize(manifest: AvailabilityManifest): string {
  const kb = manifest.file_size / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}
