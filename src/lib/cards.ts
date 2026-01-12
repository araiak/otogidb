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
 *
 * Fallback behavior:
 * 1. Try delta update (smallest download)
 * 2. If delta fails, use data already fetched during delta check
 * 3. If no data yet, fetch full index
 * 4. If fetch fails, try to return stale cached data
 * 5. If no cache available, throw error
 */
export async function getCardsData(options: { forceRefresh?: boolean; locale?: CardLocale } = {}): Promise<CardsData> {
  const locale = options.locale || 'en';
  const cacheKey = locale;

  // Check in-memory cache first (fastest)
  if (cardsCacheByLocale[cacheKey] && !options.forceRefresh) {
    return cardsCacheByLocale[cacheKey]!;
  }

  let cardsData: CardsData | null = null;
  const dataPath = getDataPath('cards_index.json', locale);

  // If not force refresh, try delta update from IndexedDB cache
  if (!options.forceRefresh) {
    const deltaResult = await tryDeltaUpdateFlow(locale);
    if (deltaResult.data) {
      cardsData = deltaResult.data;
      // If delta was applied OR we already fetched fresh data, no need to fetch again
      if (deltaResult.source === 'delta' || deltaResult.source === 'fresh') {
        console.log(`[Cards] Using ${deltaResult.source} data, skipping redundant fetch`);
      }
    }
  }

  // If we don't have data yet, fetch full index
  if (!cardsData) {
    try {
      cardsData = await fetchWithCache<CardsData>(dataPath, {
        forceRefresh: options.forceRefresh,
        maxAge: CACHE_MAX_AGE
      });
    } catch (error) {
      console.error('[Cards] Failed to fetch cards index:', error);
      // Try to get ANY cached data as last resort (even if stale)
      const staleCached = await tryGetStaleCachedData(dataPath);
      if (staleCached) {
        console.warn('[Cards] Using stale cached data due to fetch failure');
        cardsData = staleCached;
      } else {
        throw new Error('Failed to load card data and no cached data available');
      }
    }
  }

  // Fetch and merge availability data from R2 (non-blocking for card display)
  cardsData = await fetchAndMergeAvailability(cardsData);

  // Cache the final result
  cardsCacheByLocale[cacheKey] = cardsData;

  return cardsData;
}

interface DeltaUpdateResult {
  data: CardsData | null;
  source: 'delta' | 'fresh' | 'cached' | 'none';
}

/**
 * Try to update using delta files.
 * Returns result with data and source to avoid redundant fetches.
 *
 * Sources:
 * - 'delta': Data was updated via delta patch
 * - 'fresh': Data was freshly fetched (versions already match)
 * - 'cached': Using existing cached data
 * - 'none': No data available, caller should fetch full index
 */
async function tryDeltaUpdateFlow(locale: CardLocale): Promise<DeltaUpdateResult> {
  try {
    // First, fetch the current version from manifest without caching
    // This tells us what version is available on the server
    const manifestResponse = await fetch('/data/delta/manifest.json', {
      cache: 'no-cache'
    });

    if (!manifestResponse.ok) {
      console.log('[Delta] No manifest available');
      return { data: null, source: 'none' };
    }

    const manifest = await manifestResponse.json();
    const targetVersion = manifest.current_version;

    if (!targetVersion) {
      console.log('[Delta] No target version in manifest');
      return { data: null, source: 'none' };
    }

    // Load cached data from IndexedDB (via fetchWithCache)
    // This will return cached data if available, or fetch fresh if not
    const dataPath = getDataPath('cards_index.json', locale);
    const cachedData = await fetchWithCache<CardsData>(dataPath, {
      forceRefresh: false,
      maxAge: CACHE_MAX_AGE
    });

    // Check if fetchWithCache just got fresh data (versions match)
    if (cachedData.version === targetVersion) {
      console.log(`[Delta] Data already at target version ${targetVersion}`);
      return { data: cachedData, source: 'fresh' };
    }

    // Try to apply delta from cached version to target version
    const updatedData = await tryDeltaUpdate(cachedData, targetVersion);

    if (updatedData && updatedData !== cachedData) {
      // Delta was successfully applied
      console.log('[Delta] Delta applied successfully');
      return { data: updatedData, source: 'delta' };
    }

    // Delta not available or failed, but we have cached data
    if (cachedData) {
      console.log('[Delta] Using cached data (delta not available)');
      return { data: cachedData, source: 'cached' };
    }

    return { data: null, source: 'none' };
  } catch (error) {
    console.warn('[Delta] Delta update flow failed:', error);
    return { data: null, source: 'none' };
  }
}

/**
 * Try to get stale cached data as a last resort when network fails.
 * This ignores cache expiry and version checks.
 */
async function tryGetStaleCachedData(url: string): Promise<CardsData | null> {
  try {
    // Access IndexedDB directly to get any cached data
    const dbName = 'otogidb-cache';
    const storeName = 'json-cache';

    return new Promise((resolve) => {
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => resolve(null);
      request.onsuccess = () => {
        const db = request.result;
        try {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const getRequest = store.get(url);

          getRequest.onerror = () => resolve(null);
          getRequest.onsuccess = () => {
            const entry = getRequest.result;
            if (entry && entry.data) {
              resolve(entry.data as CardsData);
            } else {
              resolve(null);
            }
          };
        } catch {
          resolve(null);
        }
      };
    });
  } catch {
    return null;
  }
}

// Re-export cache utilities for debugging
export { clearCache, getCacheInfo } from './cache';
