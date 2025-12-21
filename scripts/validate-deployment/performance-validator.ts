/**
 * Performance Validator
 * Checks response times and payload sizes
 */

import type { ValidationResult, UrlSample } from './types.js';
import { fetchWithRetry } from './retry.js';

export interface PerformanceThresholds {
  maxResponseTimeMs: number;
  maxPayloadSizeBytes: number;
  warnResponseTimeMs: number;
}

export const DEFAULT_PERF_THRESHOLDS: PerformanceThresholds = {
  maxResponseTimeMs: 5000, // 5 seconds is a hard failure
  maxPayloadSizeBytes: 5 * 1024 * 1024, // 5MB
  warnResponseTimeMs: 2000, // 2 seconds is a warning
};

export interface PerformanceResult extends ValidationResult {
  payloadSize?: number;
  isSlowButPassed?: boolean;
}

async function checkPerformance(
  url: string,
  timeout: number,
  thresholds: PerformanceThresholds
): Promise<PerformanceResult> {
  const startTime = Date.now();

  try {
    // Don't use retry for performance checks - we want real response times
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'OtogiDB-Validator/1.0' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        url,
        status: 'fail',
        statusCode: response.status,
        error: `HTTP ${response.status}`,
        responseTime,
      };
    }

    // Get content length (may not be available for compressed responses)
    const contentLength = response.headers.get('content-length');
    const payloadSize = contentLength ? parseInt(contentLength, 10) : undefined;

    // Check payload size
    if (payloadSize && payloadSize > thresholds.maxPayloadSizeBytes) {
      const sizeMb = (payloadSize / 1024 / 1024).toFixed(2);
      return {
        url,
        status: 'fail',
        statusCode: response.status,
        error: `Payload too large: ${sizeMb}MB`,
        responseTime,
        payloadSize,
      };
    }

    // Check response time
    if (responseTime > thresholds.maxResponseTimeMs) {
      return {
        url,
        status: 'fail',
        statusCode: response.status,
        error: `Response too slow: ${responseTime}ms`,
        responseTime,
        payloadSize,
      };
    }

    // Warn but pass for slow responses
    const isSlowButPassed = responseTime > thresholds.warnResponseTimeMs;

    return {
      url,
      status: 'pass',
      statusCode: response.status,
      responseTime,
      payloadSize,
      isSlowButPassed,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        url,
        status: 'fail',
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

export async function validatePerformance(
  samples: UrlSample[],
  baseUrl: string,
  timeout: number = 10000,
  thresholds: PerformanceThresholds = DEFAULT_PERF_THRESHOLDS
): Promise<{ passed: number; failed: number; warned: number; results: PerformanceResult[]; stats: PerformanceStats }> {
  // Sample subset for performance checks (one per category)
  const sampled: UrlSample[] = [];
  const seen = new Set<string>();

  for (const sample of samples) {
    if (!seen.has(sample.category)) {
      seen.add(sample.category);
      sampled.push(sample);
    }
  }

  // Add a few more card pages for broader coverage
  const cardPages = samples.filter((s) => s.category === 'card').slice(0, 5);
  for (const card of cardPages) {
    if (!sampled.some((s) => s.url === card.url)) {
      sampled.push(card);
    }
  }

  console.log(`Running performance checks on ${sampled.length} pages`);
  console.log(`  Thresholds: warn=${thresholds.warnResponseTimeMs}ms, fail=${thresholds.maxResponseTimeMs}ms`);

  const results: PerformanceResult[] = [];

  for (const sample of sampled) {
    const url = sample.url.startsWith('http') ? sample.url : `${baseUrl}${sample.url}`;
    const result = await checkPerformance(url, timeout, thresholds);
    results.push({ ...result, url: sample.url });

    const icon = result.status === 'pass' ? (result.isSlowButPassed ? '~' : '.') : '!';
    if (result.status !== 'pass' || result.isSlowButPassed) {
      console.log(`  ${icon} ${sample.url} - ${result.responseTime}ms`);
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;
  const warned = results.filter((r) => r.isSlowButPassed).length;

  // Calculate stats
  const responseTimes = results
    .filter((r) => r.responseTime !== undefined)
    .map((r) => r.responseTime!);

  const stats = calculateStats(responseTimes);

  console.log(`  Results: ${passed} passed, ${failed} failed, ${warned} warnings`);
  console.log(`  Response times: avg=${stats.avg}ms, p95=${stats.p95}ms, max=${stats.max}ms`);

  return { passed, failed, warned, results, stats };
}

export interface PerformanceStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

function calculateStats(times: number[]): PerformanceStats {
  if (times.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }

  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(sum / sorted.length),
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  };
}
