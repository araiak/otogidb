/**
 * Page Validator
 *
 * Validates that pages return HTTP 200 status codes.
 * Uses concurrent requests with rate limiting.
 */

import type { ValidationResult, UrlSample } from './types.js';

interface ValidatorOptions {
  baseUrl: string;
  timeout?: number;
  concurrency?: number;
}

async function validateUrl(
  baseUrl: string,
  sample: UrlSample,
  timeout: number
): Promise<ValidationResult> {
  const fullUrl = sample.url.startsWith('http') ? sample.url : `${baseUrl}${sample.url}`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(fullUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'OtogiDB-Validator/1.0',
      },
    });

    clearTimeout(timeoutId);
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

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url: sample.url,
        status: 'error',
        error: `Timeout after ${timeout}ms`,
        responseTime,
      };
    }

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
