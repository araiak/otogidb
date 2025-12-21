/**
 * Accessibility Validator
 * Basic accessibility checks without full browser automation
 */

import { fetchWithRetry } from './retry.js';
import type { UrlSample } from './types.js';

export interface A11yCheckResult {
  url: string;
  checks: Array<{ name: string; passed: boolean; count?: number; detail?: string }>;
  status: 'pass' | 'fail' | 'error';
  error?: string;
}

interface A11yCheck {
  name: string;
  check: (html: string) => { passed: boolean; count?: number; detail?: string };
}

const A11Y_CHECKS: A11yCheck[] = [
  // Image alt text
  {
    name: 'images have alt attributes',
    check: (html: string) => {
      // Find all img tags
      const imgMatches = html.matchAll(/<img\s+[^>]*>/gi);
      const imgs = [...imgMatches];

      if (imgs.length === 0) {
        return { passed: true, count: 0 };
      }

      // Check for alt attribute (can be empty for decorative images)
      const missingAlt = imgs.filter((img) => !img[0].includes('alt=')).length;

      return {
        passed: missingAlt === 0,
        count: imgs.length - missingAlt,
        detail: missingAlt > 0 ? `${missingAlt}/${imgs.length} images missing alt` : undefined,
      };
    },
  },

  // Heading hierarchy (h1 exists, no skipped levels)
  {
    name: 'proper heading hierarchy',
    check: (html: string) => {
      const headingMatches = html.matchAll(/<h([1-6])[^>]*>/gi);
      const headings = [...headingMatches].map((m) => parseInt(m[1], 10));

      if (headings.length === 0) {
        return { passed: true, detail: 'No headings found' };
      }

      // Check for h1
      const hasH1 = headings.includes(1);
      if (!hasH1) {
        return { passed: false, detail: 'Missing h1 element' };
      }

      // Check for multiple h1s (usually bad practice)
      const h1Count = headings.filter((h) => h === 1).length;
      if (h1Count > 1) {
        return { passed: false, detail: `Multiple h1 elements (${h1Count})` };
      }

      // Check for skipped levels (e.g., h1 -> h3 without h2)
      const sortedUnique = [...new Set(headings)].sort();
      for (let i = 1; i < sortedUnique.length; i++) {
        if (sortedUnique[i] - sortedUnique[i - 1] > 1) {
          return {
            passed: false,
            detail: `Skipped heading level: h${sortedUnique[i - 1]} to h${sortedUnique[i]}`,
          };
        }
      }

      return { passed: true, count: headings.length };
    },
  },

  // Language attribute
  {
    name: 'html has lang attribute',
    check: (html: string) => {
      const match = html.match(/<html[^>]*\s+lang="([^"]+)"/i);
      return {
        passed: !!match,
        detail: match ? `lang="${match[1]}"` : 'Missing lang attribute',
      };
    },
  },

  // Button/link text
  {
    name: 'buttons have accessible text',
    check: (html: string) => {
      const buttonMatches = html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi);
      const buttons = [...buttonMatches];

      if (buttons.length === 0) {
        return { passed: true, count: 0 };
      }

      let emptyButtons = 0;
      for (const button of buttons) {
        const content = button[1].replace(/<[^>]+>/g, '').trim(); // Strip inner HTML
        const hasAriaLabel = button[0].includes('aria-label');
        const hasAriaLabelledBy = button[0].includes('aria-labelledby');
        const hasTitle = button[0].includes('title=');

        if (!content && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
          emptyButtons++;
        }
      }

      return {
        passed: emptyButtons === 0,
        count: buttons.length,
        detail: emptyButtons > 0 ? `${emptyButtons} buttons without accessible text` : undefined,
      };
    },
  },

  // Form labels
  {
    name: 'form inputs have labels',
    check: (html: string) => {
      // Find inputs that need labels (not hidden, button, submit, image)
      const inputMatches = html.matchAll(/<input\s+[^>]*type="([^"]+)"[^>]*>/gi);
      const inputs = [...inputMatches].filter(
        (m) => !['hidden', 'button', 'submit', 'image', 'reset'].includes(m[1])
      );

      if (inputs.length === 0) {
        return { passed: true, count: 0 };
      }

      let unlabeled = 0;
      for (const input of inputs) {
        const hasAriaLabel = input[0].includes('aria-label');
        const hasAriaLabelledBy = input[0].includes('aria-labelledby');
        const hasPlaceholder = input[0].includes('placeholder=');
        const idMatch = input[0].match(/id="([^"]+)"/);
        const hasForLabel =
          idMatch && new RegExp(`<label[^>]*for="${idMatch[1]}"`, 'i').test(html);

        // Placeholder alone is not sufficient for a11y, but we'll be lenient
        if (!hasAriaLabel && !hasAriaLabelledBy && !hasForLabel && !hasPlaceholder) {
          unlabeled++;
        }
      }

      return {
        passed: unlabeled === 0,
        count: inputs.length,
        detail: unlabeled > 0 ? `${unlabeled} inputs without labels` : undefined,
      };
    },
  },

  // ARIA landmarks
  {
    name: 'has main landmark',
    check: (html: string) => {
      const hasMain = /<main[^>]*>/i.test(html) || /role="main"/i.test(html);
      return {
        passed: hasMain,
        detail: hasMain ? undefined : 'Missing <main> element or role="main"',
      };
    },
  },

  // Skip link for keyboard navigation
  {
    name: 'has skip link or navigation',
    check: (html: string) => {
      // Check for skip link, main nav, or nav element
      const hasSkipLink = /skip[- ]?(to[- ]?)?(main|content|nav)/i.test(html);
      const hasNav = /<nav[^>]*>/i.test(html) || /role="navigation"/i.test(html);

      return {
        passed: hasSkipLink || hasNav,
        detail: hasSkipLink ? 'Has skip link' : hasNav ? 'Has navigation' : 'No skip link or nav',
      };
    },
  },
];

async function checkA11y(baseUrl: string, url: string, timeout: number): Promise<A11yCheckResult> {
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

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
    const checks: Array<{ name: string; passed: boolean; count?: number; detail?: string }> = [];

    for (const check of A11Y_CHECKS) {
      const result = check.check(html);
      checks.push({ name: check.name, ...result });
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

export async function validateAccessibility(
  samples: UrlSample[],
  options: { baseUrl: string; timeout?: number }
): Promise<{ passed: number; failed: number; results: A11yCheckResult[] }> {
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

  console.log(`Running accessibility checks on ${sampled.length} pages`);

  const results: A11yCheckResult[] = [];

  for (const sample of sampled) {
    const result = await checkA11y(baseUrl, sample.url, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '.' : '!';
    const failedChecks = result.checks.filter((c) => !c.passed);

    if (result.status !== 'pass') {
      if (result.error) {
        console.log(`  ${icon} ${sample.url} - ${result.error}`);
      } else {
        console.log(
          `  ${icon} ${sample.url} - issues: ${failedChecks.map((c) => c.detail || c.name).join(', ')}`
        );
      }
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
