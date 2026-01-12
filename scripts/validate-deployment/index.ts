/**
 * Deployment Validation - Main Orchestrator
 *
 * Coordinates URL sampling, page validation, and image validation.
 * Outputs results and sets exit code based on validation success.
 */

import { appendFileSync } from 'fs';
import { generateUrlSamples } from './url-sampler.js';
import { validatePages, validateLocaleRedirects, validateHtmlContent, validateJsBundles, validateInternalLinks } from './page-validator.js';
import { validateImages } from './image-validator.js';
import { validateSeo } from './seo-validator.js';
import { validateAccessibility } from './a11y-validator.js';
import { validateApiEndpoints } from './api-validator.js';
import { validatePerformance } from './performance-validator.js';
import { validate404Pages } from './error-page-validator.js';
import { validateDeltaSystem } from './delta-validator.js';
import { loadThresholds, evaluateThreshold, summarizeThresholds, type ThresholdResult } from './thresholds.js';
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

function printResults(summary: ValidationSummary, thresholdResults: ThresholdResult[], shortHash: string): void {
  console.log('');
  console.log('═'.repeat(60));
  console.log('Deployment Validation Results');
  console.log('═'.repeat(60));
  console.log(`Commit: ${shortHash}`);
  console.log(`Target: ${summary.target}`);
  console.log('');

  // Print all category results
  const categories = [
    { name: 'Locale Redirects', data: summary.localeRedirects },
    { name: 'Pages', data: summary.pages },
    { name: 'HTML Sanity', data: summary.htmlChecks },
    { name: 'JS Bundles', data: summary.jsBundles },
    { name: 'Internal Links', data: summary.linkChecks },
    { name: 'SEO Tags', data: summary.seoChecks },
    { name: 'Accessibility', data: summary.accessibilityChecks },
    { name: 'API Endpoints', data: summary.apiEndpoints },
    { name: 'Performance', data: summary.performanceChecks },
    { name: 'Error Pages', data: summary.errorPages },
    { name: 'Delta System', data: summary.deltaSystem },
    { name: 'Images', data: summary.images },
  ];

  for (const cat of categories) {
    if (cat.data && cat.data.total > 0) {
      const percent = ((cat.data.passed / cat.data.total) * 100).toFixed(1);
      const icon = cat.data.passed === cat.data.total ? '✓' : '✗';
      console.log(`${icon} ${cat.name}: ${cat.data.passed}/${cat.data.total} (${percent}%)`);
    }
  }

  // Show failed pages
  const failedPages = summary.pages.results.filter((r) => r.status !== 'pass');
  if (failedPages.length > 0) {
    console.log('');
    console.log('Failed pages:');
    for (const result of failedPages.slice(0, 5)) {
      console.log(`  ✗ ${result.url} - ${result.error || `HTTP ${result.statusCode}`}`);
    }
    if (failedPages.length > 5) {
      console.log(`  ... and ${failedPages.length - 5} more`);
    }
  }

  // Show failed images (truncate URLs for readability)
  const failedImages = summary.images.results.filter((r) => r.status !== 'pass');
  if (failedImages.length > 0) {
    console.log('');
    console.log('Failed images:');
    for (const result of failedImages.slice(0, 5)) {
      const shortUrl = result.url.replace(/.*\/otogi\//, '...');
      console.log(`  ✗ ${shortUrl} - ${result.error || `HTTP ${result.statusCode}`}`);
    }
    if (failedImages.length > 5) {
      console.log(`  ... and ${failedImages.length - 5} more`);
    }
  }

  console.log('');
  console.log(`Duration: ${(summary.duration / 1000).toFixed(1)}s`);
  console.log('');

  // Threshold summary
  const { hardFailures, softFailures } = summarizeThresholds(thresholdResults);

  if (summary.success) {
    console.log('✓ Status: PASSED');
    if (softFailures.length > 0) {
      console.log('');
      console.log('Warnings (non-blocking):');
      for (const failure of softFailures) {
        console.log(`  ⚠ ${failure.message}`);
      }
    }
  } else {
    console.log('✗ Status: FAILED');
    if (hardFailures.length > 0) {
      console.log('');
      console.log('Hard Failures (blocking):');
      for (const failure of hardFailures) {
        console.log(`  ✗ ${failure.message}`);
      }
    }
    if (softFailures.length > 0) {
      console.log('');
      console.log('Soft Failures (warnings):');
      for (const failure of softFailures) {
        console.log(`  ⚠ ${failure.message}`);
      }
    }

    // Print actionable fix suggestions
    printFixSuggestions(hardFailures, softFailures);
  }

  console.log('═'.repeat(60));
}

// Provide actionable fix suggestions for common issues
function printFixSuggestions(hardFailures: ThresholdResult[], softFailures: ThresholdResult[]): void {
  const allFailures = [...hardFailures, ...softFailures];
  const suggestions: Map<string, string> = new Map();

  for (const failure of allFailures) {
    switch (failure.category) {
      case 'seoChecks':
        suggestions.set(
          'seo',
          'SEO: Check title (<70 chars) and meta description (<160 chars) in src/components/SEO.astro'
        );
        break;
      case 'accessibilityChecks':
        suggestions.set(
          'a11y',
          'Accessibility: Ensure single <h1> per page, proper heading hierarchy (h1→h2→h3), and alt text on images'
        );
        break;
      case 'errorPages':
        suggestions.set(
          '404',
          '404 pages: Add "Card not found" handling in src/pages/[locale]/cards/[id].astro for invalid IDs'
        );
        break;
      case 'pages':
        suggestions.set('pages', 'Pages: Check build output for errors, verify all routes generate correctly');
        break;
      case 'images':
        suggestions.set('images', 'Images: Verify Cloudinary uploads completed via scripts/pipeline.py --upload');
        break;
      case 'htmlChecks':
        suggestions.set('html', 'HTML: Check for malformed HTML or missing DOCTYPE in layouts');
        break;
      case 'jsBundles':
        suggestions.set('js', 'JS Bundles: Rebuild with npm run build and check for compilation errors');
        break;
      case 'linkChecks':
        suggestions.set('links', 'Internal Links: Update broken href values, check for typos in link paths');
        break;
      case 'apiEndpoints':
        suggestions.set('api', 'API: Ensure /data/*.json files are generated by sync_website.py');
        break;
      case 'performance':
        suggestions.set('perf', 'Performance: Optimize slow pages, check for blocking resources or large payloads');
        break;
      case 'deltaSystem':
        suggestions.set('delta', 'Delta System: Run sync_website.py to generate delta files, or check delta file structure');
        break;
    }
  }

  if (suggestions.size > 0) {
    console.log('');
    console.log('How to Fix:');
    for (const suggestion of suggestions.values()) {
      console.log(`  → ${suggestion}`);
    }
  }
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
  const thresholds = loadThresholds();

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

  // Link validation
  console.log('Validating internal links...');
  const linkResults = await validateInternalLinks(pages, {
    baseUrl: VALIDATION_URL,
    timeout: TIMEOUT_MS,
  });
  console.log('');

  // SEO validation
  console.log('Validating SEO tags...');
  const seoResults = await validateSeo(pages, {
    baseUrl: VALIDATION_URL,
    timeout: TIMEOUT_MS,
  });
  console.log('');

  // Accessibility validation
  console.log('Running accessibility checks...');
  const a11yResults = await validateAccessibility(pages, {
    baseUrl: VALIDATION_URL,
    timeout: TIMEOUT_MS,
  });
  console.log('');

  // API endpoint validation
  console.log('Validating API endpoints...');
  const apiResults = await validateApiEndpoints(VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // Performance validation
  console.log('Running performance checks...');
  const perfResults = await validatePerformance(pages, VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // 404 page validation
  console.log('Validating 404 pages...');
  const errorPageResults = await validate404Pages(VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // Delta system validation
  console.log('Validating delta update system...');
  const deltaResults = await validateDeltaSystem(VALIDATION_URL, TIMEOUT_MS);
  console.log('');

  // Validate images
  console.log('Validating images...');
  const imageResults = await validateImages(images, {
    timeout: TIMEOUT_MS,
    concurrency: CONCURRENCY,
  });
  console.log('');

  // Evaluate thresholds
  const thresholdResults: ThresholdResult[] = [
    evaluateThreshold('localeRedirects', localeResults.passed, localeResults.passed + localeResults.failed, thresholds),
    evaluateThreshold('pages', pageResults.filter((r) => r.status === 'pass').length, pageResults.length, thresholds),
    evaluateThreshold('htmlChecks', htmlResults.passed, htmlResults.passed + htmlResults.failed, thresholds),
    evaluateThreshold('jsBundles', jsResults.passed, jsResults.passed + jsResults.failed, thresholds),
    evaluateThreshold('linkChecks', linkResults.passed, linkResults.passed + linkResults.failed, thresholds),
    evaluateThreshold('seoChecks', seoResults.passed, seoResults.passed + seoResults.failed, thresholds),
    evaluateThreshold('accessibilityChecks', a11yResults.passed, a11yResults.passed + a11yResults.failed, thresholds),
    evaluateThreshold('apiEndpoints', apiResults.passed, apiResults.passed + apiResults.failed, thresholds),
    evaluateThreshold('performance', perfResults.passed, perfResults.passed + perfResults.failed, thresholds),
    evaluateThreshold('errorPages', errorPageResults.passed, errorPageResults.passed + errorPageResults.failed, thresholds),
    evaluateThreshold('deltaSystem', deltaResults.passed, deltaResults.passed + deltaResults.failed, thresholds),
    evaluateThreshold('images', imageResults.filter((r) => r.status === 'pass').length, imageResults.length, thresholds),
  ];

  const { overallPassed, hardFailures, softFailures } = summarizeThresholds(thresholdResults);

  // Build summary
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
    linkChecks: {
      total: linkResults.passed + linkResults.failed,
      passed: linkResults.passed,
      failed: linkResults.failed,
    },
    seoChecks: {
      total: seoResults.passed + seoResults.failed,
      passed: seoResults.passed,
      failed: seoResults.failed,
    },
    accessibilityChecks: {
      total: a11yResults.passed + a11yResults.failed,
      passed: a11yResults.passed,
      failed: a11yResults.failed,
    },
    apiEndpoints: {
      total: apiResults.passed + apiResults.failed,
      passed: apiResults.passed,
      failed: apiResults.failed,
    },
    performanceChecks: {
      total: perfResults.passed + perfResults.failed,
      passed: perfResults.passed,
      failed: perfResults.failed,
      warned: perfResults.warned,
    },
    errorPages: {
      total: errorPageResults.passed + errorPageResults.failed,
      passed: errorPageResults.passed,
      failed: errorPageResults.failed,
    },
    deltaSystem: {
      total: deltaResults.passed + deltaResults.failed,
      passed: deltaResults.passed,
      failed: deltaResults.failed,
      warned: deltaResults.warned,
    },
    images: {
      total: imageResults.length,
      passed: imageResults.filter((r) => r.status === 'pass').length,
      failed: imageResults.filter((r) => r.status !== 'pass').length,
      results: imageResults,
    },
    success: overallPassed,
    hardFailures: hardFailures.length,
    softFailures: softFailures.length,
    duration: Date.now() - startTime,
  };

  // Output results
  printResults(summary, thresholdResults, shortHash);
  writeGitHubOutput(summary);

  // Exit with appropriate code
  process.exit(summary.success ? 0 : 1);
}

main().catch((error) => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
