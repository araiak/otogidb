/**
 * Failure Threshold Configuration
 * Allows configurable pass/fail criteria for different validation types
 */

export interface ThresholdConfig {
  // Minimum pass rate (0-1) to consider the category successful
  minPassRate: number;
  // Maximum absolute failures allowed (overrides minPassRate if set)
  maxFailures?: number;
  // Whether this category is a hard failure (blocks deployment)
  isHardFailure: boolean;
  // Human-readable name for reporting
  displayName: string;
}

export interface ThresholdResult {
  category: string;
  passed: boolean;
  isHardFailure: boolean;
  passRate: number;
  passCount: number;
  totalCount: number;
  failureCount: number;
  threshold: ThresholdConfig;
  message: string;
}

export const DEFAULT_THRESHOLDS: Record<string, ThresholdConfig> = {
  // Hard failures - must be 100%
  localeRedirects: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'Locale Redirects',
  },
  jsBundles: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'JS Bundles',
  },
  pages: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'Page Requests',
  },
  htmlChecks: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'HTML Sanity',
  },
  linkChecks: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'Internal Links',
  },
  seoChecks: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'SEO Tags',
  },
  apiEndpoints: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'API Endpoints',
  },
  errorPages: {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: 'Error Pages',
  },

  // Soft failures - allow some margin
  images: {
    minPassRate: 0.98,
    maxFailures: 3,
    isHardFailure: false,
    displayName: 'Cloudinary Images',
  },
  accessibilityChecks: {
    minPassRate: 0.95,
    isHardFailure: false,
    displayName: 'Accessibility',
  },
  performance: {
    minPassRate: 0.9,
    isHardFailure: false,
    displayName: 'Performance',
  },
  deltaSystem: {
    minPassRate: 0.8,
    isHardFailure: false,
    displayName: 'Delta System',
  },
};

export function loadThresholds(): Record<string, ThresholdConfig> {
  const thresholds = { ...DEFAULT_THRESHOLDS };

  // Allow environment variable overrides
  // Format: THRESHOLD_IMAGES_MIN_PASS_RATE=0.95
  for (const [key, config] of Object.entries(thresholds)) {
    const envKey = `THRESHOLD_${key.toUpperCase()}_MIN_PASS_RATE`;
    const envValue = process.env[envKey];
    if (envValue) {
      const parsed = parseFloat(envValue);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        config.minPassRate = parsed;
      }
    }

    const maxFailuresKey = `THRESHOLD_${key.toUpperCase()}_MAX_FAILURES`;
    const maxFailuresValue = process.env[maxFailuresKey];
    if (maxFailuresValue) {
      const parsed = parseInt(maxFailuresValue, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        config.maxFailures = parsed;
      }
    }

    const hardFailureKey = `THRESHOLD_${key.toUpperCase()}_HARD_FAILURE`;
    const hardFailureValue = process.env[hardFailureKey];
    if (hardFailureValue !== undefined) {
      config.isHardFailure = hardFailureValue === 'true' || hardFailureValue === '1';
    }
  }

  return thresholds;
}

export function evaluateThreshold(
  category: string,
  passed: number,
  total: number,
  thresholds: Record<string, ThresholdConfig>
): ThresholdResult {
  const threshold = thresholds[category] || {
    minPassRate: 1.0,
    isHardFailure: true,
    displayName: category,
  };

  // Handle edge case of 0 total
  if (total === 0) {
    return {
      category,
      passed: true,
      isHardFailure: threshold.isHardFailure,
      passRate: 1,
      passCount: 0,
      totalCount: 0,
      failureCount: 0,
      threshold,
      message: `${threshold.displayName}: No items to validate`,
    };
  }

  const failureCount = total - passed;
  const passRate = passed / total;

  // Check max failures first (stricter)
  if (threshold.maxFailures !== undefined && failureCount > threshold.maxFailures) {
    return {
      category,
      passed: false,
      isHardFailure: threshold.isHardFailure,
      passRate,
      passCount: passed,
      totalCount: total,
      failureCount,
      threshold,
      message: `${threshold.displayName}: ${failureCount} failures exceeds max ${threshold.maxFailures}`,
    };
  }

  // Check pass rate
  const meetsRate = passRate >= threshold.minPassRate;
  const ratePercent = (passRate * 100).toFixed(1);
  const requiredPercent = (threshold.minPassRate * 100).toFixed(1);

  return {
    category,
    passed: meetsRate,
    isHardFailure: threshold.isHardFailure,
    passRate,
    passCount: passed,
    totalCount: total,
    failureCount,
    threshold,
    message: meetsRate
      ? `${threshold.displayName}: ${passed}/${total} passed (${ratePercent}%)`
      : `${threshold.displayName}: ${ratePercent}% passed, below ${requiredPercent}% threshold`,
  };
}

export function summarizeThresholds(results: ThresholdResult[]): {
  overallPassed: boolean;
  hardFailures: ThresholdResult[];
  softFailures: ThresholdResult[];
  warnings: ThresholdResult[];
} {
  const hardFailures = results.filter((r) => !r.passed && r.isHardFailure);
  const softFailures = results.filter((r) => !r.passed && !r.isHardFailure);
  const warnings = results.filter((r) => r.passed && r.passRate < 1);

  return {
    overallPassed: hardFailures.length === 0,
    hardFailures,
    softFailures,
    warnings,
  };
}
