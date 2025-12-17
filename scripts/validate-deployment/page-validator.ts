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
