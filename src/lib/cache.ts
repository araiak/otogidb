/**
 * JSON data caching with hash validation
 * Uses IndexedDB for storage to handle large JSON files
 */

// Get data version from global (set at build time in BaseLayout)
declare global {
  interface Window {
    OTOGIDB_DATA_VERSION?: string;
  }
}

function getDataVersion(): string {
  if (typeof window !== 'undefined' && window.OTOGIDB_DATA_VERSION) {
    return window.OTOGIDB_DATA_VERSION;
  }
  return '';
}

const DB_NAME = 'otogidb-cache';
const DB_VERSION = 1;
const STORE_NAME = 'json-cache';

interface CacheEntry {
  key: string;
  data: unknown;
  version: string;
  hash: string;
  cachedAt: number;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Get cached data by key
 */
async function getCached(key: string): Promise<CacheEntry | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.warn('Cache read error:', error);
    return null;
  }
}

/**
 * Store data in cache
 */
async function setCache(entry: CacheEntry): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Cache write error:', error);
  }
}

/**
 * Calculate simple hash of JSON string for comparison
 */
function calculateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Fetch JSON with caching and hash validation
 *
 * @param url - URL to fetch
 * @param options - Caching options
 * @returns Parsed JSON data
 */
export async function fetchWithCache<T>(
  url: string,
  options: {
    /** Expected version from manifest (if available) */
    expectedVersion?: string;
    /** Expected hash from manifest (if available) */
    expectedHash?: string;
    /** Force refresh even if cached */
    forceRefresh?: boolean;
    /** Max age in milliseconds (default: 1 hour) */
    maxAge?: number;
  } = {}
): Promise<T> {
  const {
    expectedVersion,
    expectedHash,
    forceRefresh = false,
    maxAge = 60 * 60 * 1000 // 1 hour default
  } = options;

  const cacheKey = url;

  // Check if we should use cache
  if (!forceRefresh && typeof indexedDB !== 'undefined') {
    const cached = await getCached(cacheKey);

    if (cached) {
      const age = Date.now() - cached.cachedAt;
      const isExpired = age > maxAge;

      // If we have expected version/hash, validate against it
      if (expectedVersion && cached.version === expectedVersion) {
        console.log(`[Cache] Hit: ${url} (version match: ${expectedVersion})`);
        return cached.data as T;
      }

      if (expectedHash && cached.hash === expectedHash) {
        console.log(`[Cache] Hit: ${url} (hash match: ${expectedHash})`);
        return cached.data as T;
      }

      // If no expected values and not expired, use cache
      if (!expectedVersion && !expectedHash && !isExpired) {
        console.log(`[Cache] Hit: ${url} (not expired)`);
        return cached.data as T;
      }

      console.log(`[Cache] Stale: ${url} (age: ${Math.round(age / 1000)}s, expired: ${isExpired})`);
    }
  }

  // Fetch fresh data with cache-busting version
  const version = getDataVersion();
  const fetchUrl = version ? `${url}?v=${version}` : url;
  console.log(`[Cache] Fetching: ${fetchUrl}`);
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  const data = JSON.parse(text) as T;

  // Calculate hash and extract version if available
  const hash = calculateHash(text);
  const version = (data as Record<string, unknown>).version as string || '';

  // Cache the result
  if (typeof indexedDB !== 'undefined') {
    await setCache({
      key: cacheKey,
      data,
      version,
      hash,
      cachedAt: Date.now()
    });
    console.log(`[Cache] Stored: ${url} (version: ${version}, hash: ${hash})`);
  }

  return data;
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}

/**
 * Get cache info for debugging
 */
export async function getCacheInfo(): Promise<Array<{key: string; version: string; hash: string; age: number}>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        resolve(entries.map(e => ({
          key: e.key,
          version: e.version,
          hash: e.hash,
          age: Math.round((Date.now() - e.cachedAt) / 1000)
        })));
      };
    });
  } catch (error) {
    console.warn('Cache info error:', error);
    return [];
  }
}
