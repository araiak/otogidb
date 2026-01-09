/**
 * Feature flags for enabling/disabling features.
 * Dev-only features are only enabled in development environments.
 */

export type FeatureFlag = 'tierListPage' | 'experimentalFilters' | 'bugNotices';

interface FeatureConfig {
  enabled: boolean;
  devOnly?: boolean; // Only enabled when localhost, *.pages.dev, or ?dev=true
  envVar?: string; // Environment variable to check (PUBLIC_* for client-side)
}

const FEATURES: Record<FeatureFlag, FeatureConfig> = {
  tierListPage: { enabled: false }, // Disabled - tier lists hidden from UI
  experimentalFilters: { enabled: false, devOnly: true },
  bugNotices: { enabled: true, devOnly: true }, // Show data/description mismatch warnings on card pages (dev only)
};

/**
 * Check if a feature is enabled.
 * Dev-only features are enabled on:
 * - localhost
 * - *.pages.dev (Cloudflare preview deployments)
 * - Any URL with ?dev=true parameter
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  const config = FEATURES[feature];
  if (!config.enabled) return false;

  if (config.devOnly) {
    // Server-side: check for DEV environment
    if (typeof window === 'undefined') {
      return import.meta.env.DEV;
    }

    // Client-side: check hostname and URL params
    const hostname = window.location.hostname;
    const searchParams = new URLSearchParams(window.location.search);

    const isDev =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.pages.dev') ||
      searchParams.get('dev') === 'true';

    return isDev;
  }

  return true;
}

/**
 * Check if we're in a dev environment (for displaying dev indicators).
 */
export function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') {
    return import.meta.env.DEV;
  }

  const hostname = window.location.hostname;
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.pages.dev') ||
    searchParams.get('dev') === 'true'
  );
}
