/**
 * SEO Validator
 * Validates meta tags, canonical URLs, Open Graph, and Twitter Cards
 * Based on SEO.astro component structure
 */

import { fetchWithRetry } from './retry.js';
import type { UrlSample } from './types.js';

export interface SeoCheckResult {
  url: string;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  status: 'pass' | 'fail' | 'error';
  error?: string;
}

interface SeoCheck {
  name: string;
  pattern: RegExp;
  required: boolean;
  validator?: (match: string, html: string, url: string) => { valid: boolean; issue?: string };
}

// SEO checks based on SEO.astro component
const SEO_CHECKS: SeoCheck[] = [
  // Basic meta
  {
    name: 'has title',
    pattern: /<title[^>]*>([^<]+)<\/title>/i,
    required: true,
    validator: (match) => {
      if (!match || match.length === 0) {
        return { valid: false, issue: 'Empty title' };
      }
      if (match.length > 70) {
        return { valid: false, issue: `Title too long (${match.length} chars, max 70)` };
      }
      return { valid: true };
    },
  },
  {
    name: 'has meta description',
    pattern: /<meta\s+name="description"\s+content="([^"]*)"/i,
    required: true,
    validator: (match) => {
      if (!match || match.length === 0) {
        return { valid: false, issue: 'Empty description' };
      }
      if (match.length > 160) {
        return { valid: false, issue: `Description too long (${match.length} chars, max 160)` };
      }
      return { valid: true };
    },
  },
  {
    name: 'has canonical URL',
    pattern: /<link\s+rel="canonical"\s+href="([^"]+)"/i,
    required: true,
    validator: (match) => {
      // Use proper URL parsing to validate the canonical URL
      try {
        const parsed = new URL(match);
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'otogidb.com') {
          return { valid: false, issue: 'Canonical URL should be https://otogidb.com' };
        }
        return { valid: true };
      } catch {
        return { valid: false, issue: 'Invalid canonical URL format' };
      }
    },
  },

  // Open Graph (matching SEO.astro output)
  {
    name: 'has og:type',
    pattern: /<meta\s+property="og:type"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      const validTypes = ['website', 'article'];
      if (!validTypes.includes(match)) {
        return { valid: false, issue: `Invalid og:type: ${match}` };
      }
      return { valid: true };
    },
  },
  {
    name: 'has og:url',
    pattern: /<meta\s+property="og:url"\s+content="([^"]+)"/i,
    required: true,
  },
  {
    name: 'has og:title',
    pattern: /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    required: true,
  },
  {
    name: 'has og:description',
    pattern: /<meta\s+property="og:description"\s+content="([^"]+)"/i,
    required: true,
  },
  {
    name: 'has og:image',
    pattern: /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      if (!match.startsWith('https://')) {
        return { valid: false, issue: 'OG image must be absolute HTTPS URL' };
      }
      return { valid: true };
    },
  },
  {
    name: 'has og:site_name',
    pattern: /<meta\s+property="og:site_name"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      if (match !== 'OtogiDB') {
        return { valid: false, issue: `Expected 'OtogiDB', got '${match}'` };
      }
      return { valid: true };
    },
  },
  {
    name: 'has og:locale',
    pattern: /<meta\s+property="og:locale"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      const validLocales = ['en_US', 'ja_JP', 'ko_KR', 'zh_CN', 'zh_TW', 'es_ES'];
      if (!validLocales.includes(match)) {
        return { valid: false, issue: `Invalid og:locale: ${match}` };
      }
      return { valid: true };
    },
  },

  // Twitter Cards
  {
    name: 'has twitter:card',
    pattern: /<meta\s+name="twitter:card"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      const validCards = ['summary', 'summary_large_image', 'app', 'player'];
      if (!validCards.includes(match)) {
        return { valid: false, issue: `Invalid twitter:card: ${match}` };
      }
      return { valid: true };
    },
  },
  {
    name: 'has twitter:title',
    pattern: /<meta\s+name="twitter:title"\s+content="([^"]+)"/i,
    required: true,
  },
  {
    name: 'has twitter:description',
    pattern: /<meta\s+name="twitter:description"\s+content="([^"]+)"/i,
    required: true,
  },
  {
    name: 'has twitter:image',
    pattern: /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    required: true,
    validator: (match) => {
      if (!match.startsWith('https://')) {
        return { valid: false, issue: 'Twitter image must be absolute HTTPS URL' };
      }
      return { valid: true };
    },
  },
];

/**
 * Safely construct a full URL from a sample URL and base URL.
 * Validates URL scheme to prevent SSRF and other URL-based attacks.
 */
function constructSafeUrl(sampleUrl: string, baseUrl: string): string | null {
  // If the URL already has a scheme, validate it
  if (sampleUrl.includes('://')) {
    try {
      const parsed = new URL(sampleUrl);
      // Only allow http and https schemes
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
      }
      return sampleUrl;
    } catch {
      return null;
    }
  }

  // Relative URL - prepend base URL
  if (sampleUrl.startsWith('/')) {
    return `${baseUrl}${sampleUrl}`;
  }

  // Invalid URL format
  return null;
}

async function checkSeo(
  baseUrl: string,
  url: string,
  category: string,
  timeout: number
): Promise<SeoCheckResult> {
  const fullUrl = constructSafeUrl(url, baseUrl);

  if (!fullUrl) {
    return { url, checks: [], status: 'error', error: 'Invalid URL format or scheme' };
  }

  try {
    const response = await fetchWithRetry(
      fullUrl,
      { method: 'GET', headers: { 'User-Agent': 'OtogiDB-Validator/1.0' } },
      timeout,
      { maxAttempts: 3 }
    );

    if (!response.ok) {
      return { url, checks: [], status: 'error', error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];

    for (const check of SEO_CHECKS) {
      const match = html.match(check.pattern);

      if (!match) {
        if (check.required) {
          checks.push({ name: check.name, passed: false, detail: 'Missing' });
        }
        continue;
      }

      const value = match[1] || '';

      if (check.validator) {
        const result = check.validator(value, html, url);
        if (!result.valid) {
          checks.push({ name: check.name, passed: false, detail: result.issue });
        } else {
          checks.push({ name: check.name, passed: true });
        }
      } else {
        checks.push({ name: check.name, passed: true });
      }
    }

    // Special check: card pages should have hreflang tags
    if (category === 'card') {
      const hreflangMatches = html.matchAll(/<link\s+rel="alternate"\s+hreflang="([^"]+)"/gi);
      const hreflangCount = [...hreflangMatches].length;
      // 6 locales + x-default = 7
      const hasEnough = hreflangCount >= 7;
      checks.push({
        name: 'has hreflang tags',
        passed: hasEnough,
        detail: hasEnough ? undefined : `Only ${hreflangCount} hreflang tags (expected 7)`,
      });
    }

    const allPassed = checks.every((c) => c.passed);
    return { url, checks, status: allPassed ? 'pass' : 'fail' };
  } catch (error) {
    return {
      url,
      checks: [],
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function validateSeo(
  samples: UrlSample[],
  options: { baseUrl: string; timeout?: number }
): Promise<{ passed: number; failed: number; results: SeoCheckResult[] }> {
  const { baseUrl, timeout = 10000 } = options;

  // Sample one page per category per locale
  const sampled: UrlSample[] = [];
  const seen = new Set<string>();

  for (const sample of samples) {
    const key = `${sample.category}-${sample.locale || 'default'}`;
    if (!seen.has(key)) {
      seen.add(key);
      sampled.push(sample);
    }
  }

  console.log(`Running SEO validation on ${sampled.length} pages`);

  const results: SeoCheckResult[] = [];

  for (const sample of sampled) {
    const result = await checkSeo(baseUrl, sample.url, sample.category, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '.' : '!';
    const failedChecks = result.checks.filter((c) => !c.passed);

    if (result.status !== 'pass') {
      if (result.error) {
        console.log(`  ${icon} ${sample.url} - ${result.error}`);
      } else {
        // Show actionable error messages with details
        const issues = failedChecks.map((c) => {
          if (c.detail && c.detail !== 'Missing') {
            return `${c.name}: ${c.detail}`;
          }
          return `missing ${c.name.replace('has ', '')}`;
        });
        console.log(`  ${icon} ${sample.url}`);
        issues.forEach((issue) => console.log(`      → ${issue}`));
      }
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
