import type { CardsData } from '../types/card';
import { fetchWithCache } from './cache';

// Supported locales for card data
export type CardLocale = 'en' | 'ja' | 'ko' | 'zh-cn' | 'zh-tw' | 'es';

// In-memory cache for card data (faster than IndexedDB for repeat access)
// Keyed by locale
const cardsCacheByLocale: Record<string, CardsData | null> = {};

// Max age for cached data (24 hours - data updates infrequently)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

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
 * Uses IndexedDB caching with hash validation to avoid re-downloading
 */
export async function getCardsData(options: { forceRefresh?: boolean; locale?: CardLocale } = {}): Promise<CardsData> {
  const locale = options.locale || 'en';
  const cacheKey = locale;

  // Check in-memory cache first (fastest)
  if (cardsCacheByLocale[cacheKey] && !options.forceRefresh) {
    return cardsCacheByLocale[cacheKey]!;
  }

  // Load minimal index for table (787KB vs 2.5MB full)
  const dataPath = getDataPath('cards_index.json', locale);
  cardsCacheByLocale[cacheKey] = await fetchWithCache<CardsData>(dataPath, {
    forceRefresh: options.forceRefresh,
    maxAge: CACHE_MAX_AGE
  });

  return cardsCacheByLocale[cacheKey]!;
}

// Re-export cache utilities for debugging
export { clearCache, getCacheInfo } from './cache';
