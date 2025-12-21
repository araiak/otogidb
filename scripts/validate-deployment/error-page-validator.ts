/**
 * Error Page Validator
 * Validates that 404 pages render correctly
 *
 * Note: SPAs may return 200 status with client-side 404 handling.
 * This validator accepts both:
 * - Server-side 404 (status=404 with 404 content)
 * - Client-side 404 (status=200 but page shows 404 message)
 */

import type { ValidationResult } from './types.js';

export interface ErrorPageResult extends ValidationResult {
  hasProperContent: boolean;
  hasBackLink: boolean;
  is404: 'server' | 'client' | 'none';
}

const ERROR_TEST_URLS = [
  '/en/cards/nonexistent-card-12345',
  '/ja/cards/nonexistent-card-12345',
];

async function check404Page(
  baseUrl: string,
  path: string,
  timeout: number
): Promise<ErrorPageResult> {
  const fullUrl = `${baseUrl}${path}`;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Don't use retry for 404 tests
    const response = await fetch(fullUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    const html = await response.text();

    // Check for 404 content (works for both server and client-side 404s)
    const has404Title =
      /<title[^>]*>.*404.*<\/title>/i.test(html) ||
      /<h1[^>]*>.*404.*<\/h1>/i.test(html);

    const hasNotFoundText =
      /page not found/i.test(html) ||
      /not found/i.test(html) ||
      /doesn't exist/i.test(html) ||
      /card not found/i.test(html);

    const has404Content = has404Title || hasNotFoundText;

    // Check for back/home link
    const hasBackLink = /href=["'][^"']*\/(en|ja|ko|zh-cn|zh-tw|es)\/?["']/i.test(html);

    // Check it's not a blank page
    const hasContent = html.length > 500;

    // Determine 404 type
    let is404: 'server' | 'client' | 'none' = 'none';
    if (response.status === 404) {
      is404 = 'server';
    } else if (response.status === 200 && has404Content) {
      is404 = 'client';
    }

    // Pass if we have any valid 404 handling (server OR client-side)
    const isValid = (is404 === 'server' || is404 === 'client') && hasContent;

    return {
      url: path,
      status: isValid ? 'pass' : 'fail',
      statusCode: response.status,
      error: isValid
        ? undefined
        : is404 === 'none'
          ? `No 404 handling (status=${response.status}, no 404 content)`
          : 'Missing proper 404 content',
      responseTime,
      hasProperContent: has404Content && hasContent,
      hasBackLink,
      is404,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url: path,
        status: 'error',
        error: `Timeout after ${timeout}ms`,
        responseTime,
        hasProperContent: false,
        hasBackLink: false,
        is404: 'none',
      };
    }

    return {
      url: path,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      hasProperContent: false,
      hasBackLink: false,
      is404: 'none',
    };
  }
}

export async function validate404Pages(
  baseUrl: string,
  timeout: number = 10000
): Promise<{ passed: number; failed: number; results: ErrorPageResult[] }> {
  console.log(`Validating ${ERROR_TEST_URLS.length} error pages`);

  const results: ErrorPageResult[] = [];

  for (const path of ERROR_TEST_URLS) {
    const result = await check404Page(baseUrl, path, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '.' : '!';
    if (result.status === 'pass') {
      const type404 = result.is404 === 'server' ? 'server-side 404' : 'client-side 404';
      console.log(`  ${icon} ${path} (${type404})`);
    } else {
      console.log(`  ${icon} ${path} - ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
