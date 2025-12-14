/**
 * Internationalization (i18n) utilities for OtogiDB
 *
 * Supported locales:
 * - en: English (default)
 * - ja: Japanese
 *
 * Language detection priority:
 * 1. User's explicit selection (stored in localStorage)
 * 2. Browser Accept-Language header (soft default on first visit)
 * 3. Default to English
 */

export const SUPPORTED_LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  'zh-cn': '简体中文',
  'zh-tw': '繁體中文',
  es: 'Español',
};

// Map URL locale codes to data file directory names
export const LOCALE_DATA_PATHS: Record<SupportedLocale, string> = {
  en: '', // English is at root: /data/cards.json
  ja: 'ja', // Japanese: /data/ja/cards.json
  ko: 'ko',
  'zh-cn': 'zh-cn',
  'zh-tw': 'zh-tw',
  es: 'es',
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';

// Storage key for user's explicit language selection
export const LOCALE_STORAGE_KEY = 'otogidb-locale';

/**
 * Get the data path prefix for a locale
 * Returns empty string for default locale, locale code for others
 */
export function getDataPathPrefix(locale: SupportedLocale): string {
  return LOCALE_DATA_PATHS[locale];
}

/**
 * Get the URL path prefix for a locale
 * Returns empty string for default locale, "/ja" etc. for others
 */
export function getUrlPathPrefix(locale: SupportedLocale): string {
  return locale === DEFAULT_LOCALE ? '' : `/${locale}`;
}

/**
 * Build a localized URL for a given path
 * e.g., getLocalizedUrl('ja', '/cards/1') => '/ja/cards/1'
 * e.g., getLocalizedUrl('en', '/cards/1') => '/cards/1'
 */
export function getLocalizedUrl(locale: SupportedLocale, path: string): string {
  const prefix = getUrlPathPrefix(locale);
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${normalizedPath}`;
}

/**
 * Extract locale from a URL path
 * e.g., extractLocaleFromPath('/ja/cards/1') => 'ja'
 * e.g., extractLocaleFromPath('/zh-cn/cards/1') => 'zh-cn'
 * e.g., extractLocaleFromPath('/cards/1') => 'en'
 */
export function extractLocaleFromPath(path: string): SupportedLocale {
  // Match locale codes like /ja/, /ko/, /zh-cn/, /zh-tw/, /es/
  const match = path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(\/|$)/);
  if (match && SUPPORTED_LOCALES.includes(match[1] as SupportedLocale)) {
    return match[1] as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Get the equivalent path in another locale
 * e.g., getPathInLocale('/ja/cards/1', 'en') => '/cards/1'
 * e.g., getPathInLocale('/cards/1', 'ja') => '/ja/cards/1'
 */
export function getPathInLocale(currentPath: string, targetLocale: SupportedLocale): string {
  const currentLocale = extractLocaleFromPath(currentPath);

  // Remove current locale prefix if present
  let basePath = currentPath;
  if (currentLocale !== DEFAULT_LOCALE) {
    basePath = currentPath.replace(`/${currentLocale}`, '') || '/';
  }

  // Add target locale prefix
  return getLocalizedUrl(targetLocale, basePath);
}

/**
 * Client-side: Detect preferred locale from browser settings
 * Only used on first visit when no explicit selection exists
 */
export function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

  const browserLangs = navigator.languages || [navigator.language];

  for (const lang of browserLangs) {
    // Check for exact match first (e.g., 'ja', 'en')
    const shortLang = lang.split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(shortLang as SupportedLocale)) {
      return shortLang as SupportedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Client-side: Get stored locale preference
 */
export function getStoredLocale(): SupportedLocale | null {
  if (typeof localStorage === 'undefined') return null;

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  return null;
}

/**
 * Client-side: Store locale preference
 */
export function setStoredLocale(locale: SupportedLocale): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

/**
 * Client-side: Get effective locale
 * Priority: stored preference > browser detection > default
 */
export function getEffectiveLocale(): SupportedLocale {
  const stored = getStoredLocale();
  if (stored) return stored;

  // First visit: detect from browser but don't store yet
  // Only store when user explicitly selects
  return detectBrowserLocale();
}

/**
 * Script to run on page load for locale detection and potential redirect
 * This is inline script for initial page load
 */
export const localeInitScript = `
(function() {
  const SUPPORTED = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'];
  const STORAGE_KEY = 'otogidb-locale';
  const DEFAULT = 'en';

  function getStoredLocale() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(stored) ? stored : null;
    } catch { return null; }
  }

  function detectBrowserLocale() {
    const langs = navigator.languages || [navigator.language];
    for (const lang of langs) {
      const lower = lang.toLowerCase();
      // Check full match first (zh-cn, zh-tw)
      if (SUPPORTED.includes(lower)) return lower;
      // Then check short code (ja, ko, es)
      const short = lower.split('-')[0];
      if (SUPPORTED.includes(short)) return short;
      // Map zh-hans/zh-hant to zh-cn/zh-tw
      if (lower.startsWith('zh-hans') || lower === 'zh-sg') return 'zh-cn';
      if (lower.startsWith('zh-hant') || lower === 'zh-hk' || lower === 'zh-mo') return 'zh-tw';
    }
    return DEFAULT;
  }

  function getCurrentPathLocale() {
    // Match locale codes like /ja/, /ko/, /zh-cn/, /zh-tw/, /es/
    const match = location.pathname.match(/^\\/([a-z]{2}(?:-[a-z]{2})?)([\\/]|$)/);
    return (match && SUPPORTED.includes(match[1])) ? match[1] : DEFAULT;
  }

  // Only redirect on first visit to root or cards page
  // Don't redirect if user explicitly navigated to a locale
  const pathLocale = getCurrentPathLocale();
  const stored = getStoredLocale();

  if (!stored && pathLocale === DEFAULT) {
    // First visit, no explicit choice - check browser preference
    const detected = detectBrowserLocale();

    // Only soft-redirect if browser prefers non-default and we're on root/cards
    if (detected !== DEFAULT && (location.pathname === '/' || location.pathname.startsWith('/cards'))) {
      // Don't redirect, but show language preference hint
      // User can click language switcher to change
      window.__otogidb_detected_locale = detected;
    }
  }
})();
`;
