/**
 * Error Page Validator
 * Validates that 404 pages render correctly
 */

import type { ValidationResult } from './types.js';

export interface ErrorPageResult extends ValidationResult {
  hasProperContent: boolean;
  hasBackLink: boolean;
}

const ERROR_TEST_URLS = [
  '/en/cards/nonexistent-card-12345',
  '/en/nonexistent-page',
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

    // Don't use retry for 404 tests - we expect them to return 404
    const response = await fetch(fullUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Should get 404 status
    if (response.status !== 404) {
      return {
        url: path,
        status: 'fail',
        statusCode: response.status,
        error: `Expected 404, got ${response.status}`,
        responseTime,
        hasProperContent: false,
        hasBackLink: false,
      };
    }

    const html = await response.text();

    // Check for proper 404 content
    const hasTitle =
      /<title[^>]*>.*404.*<\/title>/i.test(html) ||
      /<h1[^>]*>.*404.*<\/h1>/i.test(html) ||
      /page not found/i.test(html) ||
      /not found/i.test(html);

    // Check for back/home link
    const hasBackLink = /href=["'][^"']*\/(en|ja|ko|zh-cn|zh-tw|es)\/?["']/i.test(html);

    // Check it's not a blank page
    const hasContent = html.length > 500;

    const isValid = hasTitle && hasContent;

    return {
      url: path,
      status: isValid ? 'pass' : 'fail',
      statusCode: 404,
      error: isValid ? undefined : 'Missing 404 content',
      responseTime,
      hasProperContent: hasTitle && hasContent,
      hasBackLink,
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
      };
    }

    return {
      url: path,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
      hasProperContent: false,
      hasBackLink: false,
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
      console.log(`  ${icon} ${path} (404 renders correctly)`);
    } else {
      console.log(`  ${icon} ${path} - ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
