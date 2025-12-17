/**
 * Image Validator
 *
 * Validates that Cloudinary images are accessible.
 * Uses HEAD requests to check without downloading full images.
 */

import type { ValidationResult, UrlSample } from './types.js';

interface ValidatorOptions {
  timeout?: number;
  concurrency?: number;
}

async function validateImage(url: string, timeout: number): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'OtogiDB-Validator/1.0',
      },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        url,
        status: 'fail',
        statusCode: response.status,
        error: `HTTP ${response.status} ${response.statusText}`,
        responseTime,
      };
    }

    // Verify content type is image
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      return {
        url,
        status: 'fail',
        statusCode: response.status,
        error: `Unexpected content-type: ${contentType}`,
        responseTime,
      };
    }

    return {
      url,
      status: 'pass',
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url,
        status: 'error',
        error: `Timeout after ${timeout}ms`,
        responseTime,
      };
    }

    return {
      url,
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

export async function validateImages(
  samples: UrlSample[],
  options: ValidatorOptions = {}
): Promise<ValidationResult[]> {
  const { timeout = 10000, concurrency = 10 } = options;

  console.log(`Validating ${samples.length} images from Cloudinary`);
  console.log(`  Timeout: ${timeout}ms, Concurrency: ${concurrency}`);

  const results = await processBatch(samples, concurrency, (sample) =>
    validateImage(sample.url, timeout)
  );

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log(`  Results: ${passed} passed, ${failed} failed, ${errors} errors`);

  return results;
}
