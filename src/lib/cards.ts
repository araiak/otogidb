import type { CardsData } from '../types/card';
import { fetchWithCache } from './cache';
import { tryDeltaUpdate } from './delta';
import { fetchAndMergeAvailability } from './availability';

// Supported locales for card data
export type CardLocale = 'en' | 'ja' | 'ko' | 'zh-cn' | 'zh-tw' | 'es';

// In-memory cache for card data (faster than IndexedDB for repeat access)
// Keyed by locale
const cardsCacheByLocale: Record<string, CardsData | null> = {};

// Max age for cached data (6 hours - auction data updates daily at 4pm JST)
const CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

/**
 * Get the data path for a given locale.
 * Uses hashed paths from window.OTOGIDB_DATA_PATHS when available for optimal caching.
 */
function getDataPath(filename: string, locale: CardLocale = 'en'): string {
  // Check for hashed path from build-time manifest
  if (typeof window !== 'undefined' && window.OTOGIDB_DATA_PATHS) {
    const localePaths = window.OTOGIDB_DATA_PATHS[locale];
    if (localePaths && filename === 'cards_index.json') {
      // Use hashed path for optimal caching (1 month immutable)
      return localePaths.cards_index;
    }
  }

  // Fallback to base path (for dev or if manifest not available)
  if (locale === 'en') {
    return `/data/${filename}`;
  }
  return `/data/${locale}/${filename}`;
}

/**
 * Load minimal cards index (for table display - faster loading)
 * Uses IndexedDB caching with delta updates for efficient incremental updates.
 * Fetches availability data separately from R2 and merges it.
 */
export async function getCardsData(options: { forceRefresh?: boolean; locale?: CardLocale } = {}): Promise<CardsData> {
  const locale = options.locale || 'en';
  const cacheKey = locale;

  // Check in-memory cache first (fastest)
  if (cardsCacheByLocale[cacheKey] && !options.forceRefresh) {
    return cardsCacheByLocale[cacheKey]!;
  }

  // Load cards data (via delta or full fetch) in parallel with availability manifest
  let cardsData: CardsData;

  // If not force refresh, try delta update from IndexedDB cache
  if (!options.forceRefresh) {
    const deltaResult = await tryDeltaUpdateFlow(locale);
    if (deltaResult) {
      cardsData = deltaResult;
    } else {
      // Fallback: Load full index
      const dataPath = getDataPath('cards_index.json', locale);
      cardsData = await fetchWithCache<CardsData>(dataPath, {
        forceRefresh: options.forceRefresh,
        maxAge: CACHE_MAX_AGE
      });
    }
  } else {
    // Force refresh: Load full index
    const dataPath = getDataPath('cards_index.json', locale);
    cardsData = await fetchWithCache<CardsData>(dataPath, {
      forceRefresh: options.forceRefresh,
      maxAge: CACHE_MAX_AGE
    });
  }

  // Fetch and merge availability data from R2 (non-blocking for card display)
  cardsData = await fetchAndMergeAvailability(cardsData);

  // Cache the final result
  cardsCacheByLocale[cacheKey] = cardsData;

  return cardsData;
}

/**
 * Try to update using delta files.
 * Returns updated data if successful, null if we need to fall back to full fetch.
 */
async function tryDeltaUpdateFlow(locale: CardLocale): Promise<CardsData | null> {
  try {
    // First, fetch the current version from manifest without caching
    // This tells us what version is available on the server
    const manifestResponse = await fetch('/data/delta/manifest.json', {
      cache: 'no-cache'
    });

    if (!manifestResponse.ok) {
      console.log('[Delta] No manifest available');
      return null;
    }

    const manifest = await manifestResponse.json();
    const targetVersion = manifest.current_version;

    if (!targetVersion) {
      console.log('[Delta] No target version in manifest');
      return null;
    }

    // Load cached data from IndexedDB (via fetchWithCache)
    // This will return cached data if available and valid
    const dataPath = getDataPath('cards_index.json', locale);
    const cachedData = await fetchWithCache<CardsData>(dataPath, {
      forceRefresh: false,
      maxAge: CACHE_MAX_AGE
    });

    // Try to apply delta from cached version to target version
    const updatedData = await tryDeltaUpdate(cachedData, targetVersion);

    if (updatedData && updatedData !== cachedData) {
      // Delta was successfully applied, update cache with new data
      console.log('[Delta] Updating cache with delta result');
      // Note: We rely on the next fetchWithCache to update the cache
      // For now, just return the updated data
      return updatedData;
    }

    return null; // Delta update not applicable or failed
  } catch (error) {
    console.warn('[Delta] Delta update flow failed:', error);
    return null;
  }
}

// Re-export cache utilities for debugging
export { clearCache, getCacheInfo } from './cache';
