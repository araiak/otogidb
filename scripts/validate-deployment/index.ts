/**
 * Deployment Validation - Main Orchestrator
 *
 * Coordinates URL sampling, page validation, and image validation.
 * Outputs results and sets exit code based on validation success.
 */

import { appendFileSync } from 'fs';
import { generateUrlSamples } from './url-sampler.js';
import { validatePages, validateLocaleRedirects, validateHtmlContent, validateJsBundles } from './page-validator.js';
import { validateImages } from './image-validator.js';
import type { ValidationSummary } from './types.js';

// Configuration from environment
const VALIDATION_URL = process.env.VALIDATION_URL || 'https://dev.otogidb.pages.dev';
const TIMEOUT_MS = parseInt(process.env.VALIDATION_TIMEOUT || '10000', 10);
const CONCURRENCY = parseInt(process.env.VALIDATION_CONCURRENCY || '10', 10);
const CARDS_PER_LOCALE = parseInt(process.env.CARDS_PER_LOCALE || '10', 10);
const IMAGE_COUNT = parseInt(process.env.IMAGE_COUNT || '50', 10);
const GITHUB_SHA = process.env.GITHUB_SHA;

function getShortHash(fullHash: string | undefined): string {
  return fullHash ? fullHash.substring(0, 7) : 'unknown';
}

function printResults(summary: ValidationSummary, shortHash: string): void {
  console.log('');
  console.log('═'.repeat(50));
  console.log('Deployment Validation Results');
  console.log('═'.repeat(50));
  console.log(`Commit: ${shortHash}`);
  console.log(`Target: ${summary.target}`);

  console.log('');

  // Locale redirect results
  if (summary.localeRedirects) {
    const localePercent = ((summary.localeRedirects.passed / summary.localeRedirects.total) * 100).toFixed(1);
    console.log(`Locale Redirects: ${summary.localeRedirects.passed}/${summary.localeRedirects.total} passed (${localePercent}%)`);
  }

  // HTML check results
  if (summary.htmlChecks) {
    const htmlPercent = ((summary.htmlChecks.passed / summary.htmlChecks.total) * 100).toFixed(1);
    console.log(`HTML Sanity: ${summary.htmlChecks.passed}/${summary.htmlChecks.total} passed (${htmlPercent}%)`);
  }

  // JS bundle results
  if (summary.jsBundles) {
    const jsPercent = ((summary.jsBundles.passed / summary.jsBundles.total) * 100).toFixed(1);
    console.log(`JS Bundles: ${summary.jsBundles.passed}/${summary.jsBundles.total} passed (${jsPercent}%)`);
  }

  console.log('');

  // Page results
  const pagePercent = ((summary.pages.passed / summary.pages.total) * 100).toFixed(1);
  console.log(`Pages: ${summary.pages.passed}/${summary.pages.total} passed (${pagePercent}%)`);

  // Show failed pages
  const failedPages = summary.pages.results.filter((r) => r.status !== 'pass');
  if (failedPages.length > 0) {
    for (const result of failedPages) {
      console.log(`  ✗ ${result.url} - ${result.error || `HTTP ${result.statusCode}`}`);
    }
  }

  console.log('');

  // Image results
  const imagePercent = ((summary.images.passed / summary.images.total) * 100).toFixed(1);
  console.log(`Images: ${summary.images.passed}/${summary.images.total} passed (${imagePercent}%)`);

  // Show failed images (truncate URLs for readability)
  const failedImages = summary.images.results.filter((r) => r.status !== 'pass');
  if (failedImages.length > 0) {
    for (const result of failedImages.slice(0, 10)) {
      const shortUrl = result.url.replace(/.*\/otogi\//, '...');
      console.log(`  ✗ ${shortUrl} - ${result.error || `HTTP ${result.statusCode}`}`);
    }
    if (failedImages.length > 10) {
      console.log(`  ... and ${failedImages.length - 10} more`);
    }
  }

  console.log('');
  console.log(`Duration: ${(summary.duration / 1000).toFixed(1)}s`);
  console.log('');

  if (summary.success) {
    console.log('✓ Status: PASSED');
  } else {
    const pageErrors = summary.pages.total - summary.pages.passed;
    const imageErrors = summary.images.total - summary.images.passed;
    console.log(`✗ Status: FAILED (${pageErrors} page errors, ${imageErrors} image errors)`);
  }

  console.log('═'.repeat(50));
}

// Write GitHub Actions output if available
function writeGitHubOutput(summary: ValidationSummary): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  appendFileSync(outputFile, `validation_success=${summary.success}\n`);
  appendFileSync(outputFile, `pages_passed=${summary.pages.passed}\n`);
  appendFileSync(outputFile, `pages_total=${summary.pages.total}\n`);
  appendFileSync(outputFile, `images_passed=${summary.images.passed}\n`);
  appendFileSync(outputFile, `images_total=${summary.images.total}\n`);
  if (summary.jsBundles) {
    appendFileSync(outputFile, `js_bundles_passed=${summary.jsBundles.passed}\n`);
    appendFileSync(outputFile, `js_bundles_total=${summary.jsBundles.total}\n`);
  }
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const shortHash = getShortHash(GITHUB_SHA);

  console.log('OtogiDB Deployment Validator');
  console.log('============================');
  console.log(`Commit: ${shortHash}`);
  console.log(`Target: ${VALIDATION_URL}`);
  console.log(`Config: timeout=${TIMEOUT_MS}ms, concurrency=${CONCURRENCY}`);
  console.log(`Sampling: ${CARDS_PER_LOCALE} cards/locale, ${IMAGE_COUNT} images`);
  console.log('');

  // Generate URL samples
  console.log('Generating URL samples...');
  const { pages, images } = generateUrlSamples({
    cardsPerLocale: CARDS_PER_LOCALE,
    imageCount: IMAGE_COUNT,
  });
  console.log('');

  // Validate locale redirects
  console.log('Validating locale redirects...');
  const localeResults = await validateLocaleRedirects(VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // Validate pages
  console.log('Validating pages...');
  const pageResults = await validatePages(pages, {
    baseUrl: VALIDATION_URL,
    timeout: TIMEOUT_MS,
    concurrency: CONCURRENCY,
  });
  console.log('');

  // HTML sanity checks
  console.log('Running HTML sanity checks...');
  const htmlResults = await validateHtmlContent(pages, {
    baseUrl: VALIDATION_URL,
    timeout: TIMEOUT_MS,
  });
  console.log('');

  // JS bundle checks
  console.log('Validating JS bundles...');
  const jsResults = await validateJsBundles(VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // Validate images
  console.log('Validating images...');
  const imageResults = await validateImages(images, {
    timeout: TIMEOUT_MS,
    concurrency: CONCURRENCY,
  });

  // Build summary
  const localeSuccess = localeResults.failed === 0;
  const htmlSuccess = htmlResults.failed === 0;
  const jsSuccess = jsResults.failed === 0;
  const summary: ValidationSummary = {
    target: VALIDATION_URL,
    localeRedirects: {
      total: localeResults.passed + localeResults.failed,
      passed: localeResults.passed,
      failed: localeResults.failed,
    },
    pages: {
      total: pageResults.length,
      passed: pageResults.filter((r) => r.status === 'pass').length,
      failed: pageResults.filter((r) => r.status !== 'pass').length,
      results: pageResults,
    },
    htmlChecks: {
      total: htmlResults.passed + htmlResults.failed,
      passed: htmlResults.passed,
      failed: htmlResults.failed,
    },
    jsBundles: {
      total: jsResults.passed + jsResults.failed,
      passed: jsResults.passed,
      failed: jsResults.failed,
    },
    images: {
      total: imageResults.length,
      passed: imageResults.filter((r) => r.status === 'pass').length,
      failed: imageResults.filter((r) => r.status !== 'pass').length,
      results: imageResults,
    },
    success:
      localeSuccess &&
      htmlSuccess &&
      jsSuccess &&
      pageResults.every((r) => r.status === 'pass') &&
      imageResults.every((r) => r.status === 'pass'),
    duration: Date.now() - startTime,
  };

  // Output results
  printResults(summary, shortHash);
  writeGitHubOutput(summary);

  // Exit with appropriate code
  process.exit(summary.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
