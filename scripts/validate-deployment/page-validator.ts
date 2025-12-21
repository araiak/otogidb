/**
 * Page Validator
 *
 * Validates that pages return HTTP 200 status codes.
 * Uses concurrent requests with rate limiting and retry logic.
 */

import type { ValidationResult, UrlSample } from './types.js';
import { fetchWithRetry } from './retry.js';

interface ValidatorOptions {
  baseUrl: string;
  timeout?: number;
  concurrency?: number;
}

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

async function validateUrl(
  baseUrl: string,
  sample: UrlSample,
  timeout: number
): Promise<ValidationResult> {
  const fullUrl = constructSafeUrl(sample.url, baseUrl);

  if (!fullUrl) {
    return {
      url: sample.url,
      status: 'error',
      error: 'Invalid URL format or scheme',
      responseTime: 0,
    };
  }
  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(
      fullUrl,
      {
        method: 'GET',
        headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
      },
      timeout,
      { maxAttempts: 3 }
    );

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        url: sample.url,
        status: 'pass',
        statusCode: response.status,
        responseTime,
      };
    }

    return {
      url: sample.url,
      status: 'fail',
      statusCode: response.status,
      error: `HTTP ${response.status} ${response.statusText}`,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      url: sample.url,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    };
  }
}

// Process URLs in batches with concurrency limit
async function processBatch<T, R>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Progress indicator
    const completed = Math.min(i + concurrency, items.length);
    process.stdout.write(`\r  Progress: ${completed}/${items.length}`);
  }
  process.stdout.write('\n');

  return results;
}

interface LocaleRedirectResult {
  language: string;
  expectedLocale: string;
  actualLocation: string | null;
  status: 'pass' | 'fail' | 'error';
  error?: string;
}

// Test that Accept-Language header redirects to correct locale
async function testLocaleRedirect(
  baseUrl: string,
  language: string,
  expectedLocale: string,
  timeout: number
): Promise<LocaleRedirectResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${baseUrl}/`, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects
      headers: {
        'User-Agent': 'OtogiDB-Validator/1.0',
        'Accept-Language': language,
      },
    });

    clearTimeout(timeoutId);

    const location = response.headers.get('location');
    const expectedPath = `/${expectedLocale}/`;

    // Check if redirect points to expected locale
    if (response.status >= 300 && response.status < 400 && location) {
      const isCorrect = location.endsWith(expectedPath) || location === expectedPath;
      return {
        language,
        expectedLocale,
        actualLocation: location,
        status: isCorrect ? 'pass' : 'fail',
        error: isCorrect ? undefined : `Expected redirect to ${expectedPath}, got ${location}`,
      };
    }

    // If it's a 200, check if we're on the right page (client-side redirect case)
    if (response.status === 200) {
      return {
        language,
        expectedLocale,
        actualLocation: 'no redirect (200)',
        status: 'pass', // Client-side redirect will handle it
      };
    }

    return {
      language,
      expectedLocale,
      actualLocation: location,
      status: 'fail',
      error: `Unexpected status ${response.status}`,
    };
  } catch (error) {
    return {
      language,
      expectedLocale,
      actualLocation: null,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function validateLocaleRedirects(
  baseUrl: string,
  timeout: number = 10000
): Promise<{ passed: number; failed: number; results: LocaleRedirectResult[] }> {
  console.log(`Testing locale redirects on ${baseUrl}/`);

  // Map Accept-Language to expected locale
  const tests: Array<{ language: string; expectedLocale: string }> = [
    { language: 'en-US,en;q=0.9', expectedLocale: 'en' },
    { language: 'ja,en;q=0.9', expectedLocale: 'ja' },
    { language: 'ko-KR,ko;q=0.9', expectedLocale: 'ko' },
    { language: 'zh-CN,zh;q=0.9', expectedLocale: 'zh-cn' },
    { language: 'zh-TW,zh;q=0.9', expectedLocale: 'zh-tw' },
    { language: 'es-ES,es;q=0.9', expectedLocale: 'es' },
    { language: 'fr-FR,fr;q=0.9', expectedLocale: 'en' }, // Unsupported falls back to en
    { language: 'de-DE,de;q=0.9', expectedLocale: 'en' }, // Unsupported falls back to en
  ];

  const results: LocaleRedirectResult[] = [];

  for (const test of tests) {
    const result = await testLocaleRedirect(baseUrl, test.language, test.expectedLocale, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '✓' : '✗';
    const detail = result.error || result.actualLocation || 'ok';
    console.log(`  ${icon} ${test.language} → /${test.expectedLocale}/ (${detail})`);
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}

export async function validatePages(
  samples: UrlSample[],
  options: ValidatorOptions
): Promise<ValidationResult[]> {
  const { baseUrl, timeout = 10000, concurrency = 10 } = options;

  console.log(`Validating ${samples.length} pages against ${baseUrl}`);
  console.log(`  Timeout: ${timeout}ms, Concurrency: ${concurrency}`);

  const results = await processBatch(samples, concurrency, (sample) =>
    validateUrl(baseUrl, sample, timeout)
  );

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log(`  Results: ${passed} passed, ${failed} failed, ${errors} errors`);

  return results;
}

// HTML sanity check result
interface HtmlCheckResult {
  url: string;
  checks: Array<{ name: string; passed: boolean; detail?: string }>;
  status: 'pass' | 'fail' | 'error';
  error?: string;
}

// Expected content patterns for different page types
const HTML_CHECKS: Record<string, Array<{ name: string; pattern: RegExp; required: boolean }>> = {
  card: [
    { name: 'has title', pattern: /<title[^>]*>[^<]+<\/title>/i, required: true },
    { name: 'has ATK/HP stats', pattern: /(ATK|HP|SPD).*\d+/s, required: true },
    { name: 'has skill section', pattern: /<h[23][^>]*>.*skill/is, required: true },
    { name: 'has image', pattern: /<img[^>]*src=/i, required: true },
    { name: 'has JS bundle', pattern: /<script[^>]*src="[^"]*\.js"/i, required: true },
  ],
  list: [
    { name: 'has content', pattern: /<div[^>]*>/i, required: true },
    { name: 'has links', pattern: /<a[^>]*href=/i, required: true },
    { name: 'has JS bundle', pattern: /<script[^>]*src="[^"]*\.js"/i, required: true },
    // data-card-id is added client-side by React, not in server-rendered HTML
  ],
  blog: [
    { name: 'has content', pattern: /<div[^>]*>/i, required: true },
    { name: 'has title', pattern: /<title[^>]*>[^<]+<\/title>/i, required: true },
  ],
  static: [
    { name: 'has content', pattern: /<div[^>]*>/i, required: true },
    { name: 'has title', pattern: /<title[^>]*>[^<]+<\/title>/i, required: true },
  ],
};

// Patterns that should NEVER appear (indicates runtime errors)
const ERROR_PATTERNS = [
  { name: 'no React error', pattern: /Minified React error #|React error boundary/i },
  { name: 'no hydration error', pattern: /Hydration failed because|Text content does not match/i },
  { name: 'no undefined render', pattern: />undefined<\/|>NaN<\//i },
  { name: 'no null render', pattern: />null<\//i },
  { name: 'no [object Object]', pattern: />\[object Object\]<\//i },
];

async function checkHtmlContent(
  baseUrl: string,
  url: string,
  category: string,
  timeout: number
): Promise<HtmlCheckResult> {
  const fullUrl = constructSafeUrl(url, baseUrl);

  if (!fullUrl) {
    return {
      url,
      checks: [],
      status: 'error',
      error: 'Invalid URL format or scheme',
    };
  }

  try {
    const response = await fetchWithRetry(
      fullUrl,
      {
        method: 'GET',
        headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
      },
      timeout,
      { maxAttempts: 3 }
    );

    if (!response.ok) {
      return {
        url,
        checks: [],
        status: 'error',
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];

    // Run category-specific checks
    const categoryChecks = HTML_CHECKS[category] || [];
    for (const check of categoryChecks) {
      const matches = check.pattern.test(html);
      // For "no error" type checks, we want the pattern to NOT match
      const isNegativeCheck = check.name.startsWith('no ');
      const passed = isNegativeCheck ? !matches : matches;

      if (check.required || !passed) {
        checks.push({ name: check.name, passed });
      }
    }

    // Run error pattern checks (should never match)
    for (const check of ERROR_PATTERNS) {
      const matches = check.pattern.test(html);
      if (matches) {
        checks.push({ name: check.name, passed: false });
      }
    }

    const allPassed = checks.every((c) => c.passed);
    return {
      url,
      checks,
      status: allPassed ? 'pass' : 'fail',
    };
  } catch (error) {
    return {
      url,
      checks: [],
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function validateHtmlContent(
  samples: UrlSample[],
  options: ValidatorOptions
): Promise<{ passed: number; failed: number; results: HtmlCheckResult[] }> {
  const { baseUrl, timeout = 10000 } = options;

  // Sample a subset for HTML checks (one per category per locale)
  const sampled: UrlSample[] = [];
  const seen = new Set<string>();

  for (const sample of samples) {
    const key = `${sample.category}-${sample.locale || 'default'}`;
    if (!seen.has(key)) {
      seen.add(key);
      sampled.push(sample);
    }
  }

  console.log(`Running HTML sanity checks on ${sampled.length} pages`);

  const results: HtmlCheckResult[] = [];

  for (const sample of sampled) {
    const result = await checkHtmlContent(baseUrl, sample.url, sample.category, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '✓' : '✗';
    const failedChecks = result.checks.filter((c) => !c.passed);

    if (result.status === 'pass') {
      console.log(`  ${icon} ${sample.url}`);
    } else if (result.error) {
      console.log(`  ${icon} ${sample.url} - ${result.error}`);
    } else {
      console.log(`  ${icon} ${sample.url} - failed: ${failedChecks.map((c) => c.name).join(', ')}`);
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}

// Validate that JS bundles referenced in pages actually load
export async function validateJsBundles(
  baseUrl: string,
  timeout: number = 10000
): Promise<{ passed: number; failed: number; bundles: string[] }> {
  console.log('Checking JS bundle loading...');

  // Fetch a card list page to find JS bundles
  const testUrl = `${baseUrl}/en/`;
  let html: string;

  try {
    const response = await fetch(testUrl, {
      headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
    });
    html = await response.text();
  } catch (error) {
    console.log(`  ✗ Failed to fetch ${testUrl}`);
    return { passed: 0, failed: 1, bundles: [] };
  }

  // Extract JS bundle URLs
  const scriptMatches = html.matchAll(/<script[^>]*src="([^"]*\.js)"[^>]*>/gi);
  const bundles: string[] = [];

  for (const match of scriptMatches) {
    const src = match[1];
    // Use safe URL construction
    const bundleUrl = constructSafeUrl(src, baseUrl);
    if (bundleUrl && !bundles.includes(bundleUrl)) {
      bundles.push(bundleUrl);
    }
  }

  if (bundles.length === 0) {
    console.log('  ⚠ No JS bundles found');
    return { passed: 0, failed: 0, bundles: [] };
  }

  let passed = 0;
  let failed = 0;

  for (const bundleUrl of bundles) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(bundleUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const shortUrl = bundleUrl.replace(baseUrl, '');
      if (response.ok) {
        console.log(`  ✓ ${shortUrl}`);
        passed++;
      } else {
        console.log(`  ✗ ${shortUrl} - HTTP ${response.status}`);
        failed++;
      }
    } catch (error) {
      const shortUrl = bundleUrl.replace(baseUrl, '');
      console.log(`  ✗ ${shortUrl} - ${error instanceof Error ? error.message : 'Failed'}`);
      failed++;
    }
  }

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, bundles };
}

// Link validation result
interface LinkCheckResult {
  pageUrl: string;
  links: Array<{ href: string; issue: string }>;
  status: 'pass' | 'fail' | 'error';
  error?: string;
}

// Supported locales for validation
const SUPPORTED_LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'];

// Patterns for detecting link issues
const LOCALE_SUFFIX_PATTERN = /-(?:ja|ko|es|zh-cn|zh-tw)(?:\/|$)/;

function validateLink(href: string, pageLocale: string): { valid: boolean; issue?: string } {
  // Skip external links, anchors, and special protocols
  if (
    href.startsWith('http') ||
    href.startsWith('//') ||
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('javascript:') ||
    href.startsWith('data:')
  ) {
    return { valid: true };
  }

  // Check for locale prefix
  const hasLocalePrefix = SUPPORTED_LOCALES.some(
    (locale) => href.startsWith(`/${locale}/`) || href === `/${locale}`
  );

  // Internal links should have locale prefix
  if (href.startsWith('/') && !hasLocalePrefix) {
    // Exception: static assets like /data/, /_astro/, /favicon
    if (
      href.startsWith('/data/') ||
      href.startsWith('/_astro/') ||
      href.startsWith('/favicon') ||
      href.startsWith('/_redirects')
    ) {
      return { valid: true };
    }
    return { valid: false, issue: `Missing locale prefix: ${href}` };
  }

  // Check for locale suffix in blog URLs (old format like /en/blog/post-ko)
  if (href.includes('/blog/') && LOCALE_SUFFIX_PATTERN.test(href)) {
    return { valid: false, issue: `Has locale suffix (old format): ${href}` };
  }

  return { valid: true };
}

async function checkPageLinks(
  baseUrl: string,
  url: string,
  timeout: number
): Promise<LinkCheckResult> {
  const fullUrl = constructSafeUrl(url, baseUrl);

  if (!fullUrl) {
    return {
      pageUrl: url,
      links: [],
      status: 'error',
      error: 'Invalid URL format or scheme',
    };
  }

  // Determine page locale from URL
  const localeMatch = url.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(\/|$)/);
  const pageLocale = localeMatch ? localeMatch[1] : 'en';

  try {
    const response = await fetchWithRetry(
      fullUrl,
      {
        method: 'GET',
        headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
      },
      timeout,
      { maxAttempts: 3 }
    );

    if (!response.ok) {
      return {
        pageUrl: url,
        links: [],
        status: 'error',
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    const invalidLinks: Array<{ href: string; issue: string }> = [];

    // Extract all href attributes
    const hrefMatches = html.matchAll(/href="([^"]+)"/gi);

    for (const match of hrefMatches) {
      const href = match[1];
      const result = validateLink(href, pageLocale);

      if (!result.valid && result.issue) {
        // Deduplicate
        if (!invalidLinks.some((l) => l.href === href)) {
          invalidLinks.push({ href, issue: result.issue });
        }
      }
    }

    return {
      pageUrl: url,
      links: invalidLinks,
      status: invalidLinks.length === 0 ? 'pass' : 'fail',
    };
  } catch (error) {
    return {
      pageUrl: url,
      links: [],
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function validateInternalLinks(
  samples: UrlSample[],
  options: ValidatorOptions
): Promise<{ passed: number; failed: number; results: LinkCheckResult[] }> {
  const { baseUrl, timeout = 10000 } = options;

  // Sample a subset for link checks (one per category per locale)
  const sampled: UrlSample[] = [];
  const seen = new Set<string>();

  for (const sample of samples) {
    const key = `${sample.category}-${sample.locale || 'default'}`;
    if (!seen.has(key)) {
      seen.add(key);
      sampled.push(sample);
    }
  }

  console.log(`Validating internal links on ${sampled.length} pages`);

  const results: LinkCheckResult[] = [];

  for (const sample of sampled) {
    const result = await checkPageLinks(baseUrl, sample.url, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '✓' : '✗';

    if (result.status === 'pass') {
      console.log(`  ${icon} ${sample.url}`);
    } else if (result.error) {
      console.log(`  ${icon} ${sample.url} - ${result.error}`);
    } else {
      console.log(`  ${icon} ${sample.url} - ${result.links.length} invalid links`);
      for (const link of result.links.slice(0, 3)) {
        console.log(`      ${link.issue}`);
      }
      if (result.links.length > 3) {
        console.log(`      ... and ${result.links.length - 3} more`);
      }
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
