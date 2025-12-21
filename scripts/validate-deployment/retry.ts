/**
 * Retry Utility
 * Provides retry logic with exponential backoff for transient failures
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  retryOnTimeout: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [429, 500, 502, 503, 504],
  retryOnTimeout: true,
};

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  errors: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
  return Math.min(delay + jitter, options.maxDelayMs);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  isRetryable: (error: unknown) => boolean,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const errors: string[] = [];

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await operation();
      return { success: true, result, attempts: attempt, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Attempt ${attempt}: ${errorMsg}`);

      if (attempt < opts.maxAttempts && isRetryable(error)) {
        const delay = calculateDelay(attempt, opts);
        await sleep(delay);
      } else {
        break;
      }
    }
  }

  return { success: false, attempts: opts.maxAttempts, errors };
}

// Helper to check if HTTP response indicates retryable error
export function isRetryableHttpError(
  statusCode: number,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): boolean {
  return options.retryableStatuses.includes(statusCode);
}

// Fetch with timeout and retry support
export async function fetchWithRetry(
  url: string,
  fetchOptions: RequestInit,
  timeout: number,
  retryOptions: Partial<RetryOptions> = {}
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

  const result = await withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        // Throw for retryable status codes so we can retry
        if (!response.ok && isRetryableHttpError(response.status, opts)) {
          throw new Error(`HTTP ${response.status} (retryable)`);
        }

        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    (error) => {
      if (error instanceof Error) {
        // Retry on timeout if enabled
        if (error.name === 'AbortError' && opts.retryOnTimeout) return true;
        // Retry on network errors
        if (error.message.includes('fetch failed')) return true;
        if (error.message.includes('ECONNRESET')) return true;
        if (error.message.includes('ETIMEDOUT')) return true;
        // Retry on retryable HTTP errors
        if (error.message.includes('(retryable)')) return true;
      }
      return false;
    },
    retryOptions
  );

  if (!result.success || !result.result) {
    throw new Error(`Failed after ${result.attempts} attempts: ${result.errors.join('; ')}`);
  }

  return result.result;
}
