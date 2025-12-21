/**
 * API Endpoint Validator
 * Validates JSON data endpoints return valid responses with expected structure
 */

import { fetchWithRetry } from './retry.js';
import type { ValidationResult } from './types.js';

export interface ApiEndpoint {
  url: string;
  description: string;
  expectedFields?: string[];
  validator?: (data: unknown) => { valid: boolean; error?: string };
}

// Define the data endpoints to validate
export const DATA_ENDPOINTS: ApiEndpoint[] = [
  {
    url: '/data/cards_index.json',
    description: 'Card index for table',
    expectedFields: ['version', 'total_cards', 'cards'],
    validator: (data) => {
      const obj = data as Record<string, unknown>;

      // Check version is a string
      if (typeof obj.version !== 'string') {
        return { valid: false, error: 'version is not a string' };
      }

      // Check total_cards is a number in expected range
      if (typeof obj.total_cards !== 'number') {
        return { valid: false, error: 'total_cards is not a number' };
      }
      if (obj.total_cards < 850 || obj.total_cards > 1000) {
        return { valid: false, error: `Unexpected card count: ${obj.total_cards} (expected 850-1000)` };
      }

      // Check cards is an object with entries
      if (typeof obj.cards !== 'object' || obj.cards === null) {
        return { valid: false, error: 'cards is not an object' };
      }
      const cardCount = Object.keys(obj.cards as object).length;
      if (cardCount < 850) {
        return { valid: false, error: `Only ${cardCount} cards in index (expected 850+)` };
      }

      // Spot check a card has expected structure
      const cards = obj.cards as Record<string, unknown>;
      const firstCardKey = Object.keys(cards)[0];
      if (firstCardKey) {
        const card = cards[firstCardKey] as Record<string, unknown>;
        const requiredFields = ['id', 'name', 'playable', 'stats'];
        for (const field of requiredFields) {
          if (!(field in card)) {
            return { valid: false, error: `Card missing required field: ${field}` };
          }
        }
      }

      return { valid: true };
    },
  },
];

export interface ApiValidationResult extends ValidationResult {
  description: string;
  validationErrors?: string[];
}

async function validateEndpoint(
  baseUrl: string,
  endpoint: ApiEndpoint,
  timeout: number
): Promise<ApiValidationResult> {
  const fullUrl = `${baseUrl}${endpoint.url}`;
  const startTime = Date.now();

  try {
    const response = await fetchWithRetry(
      fullUrl,
      { method: 'GET', headers: { 'User-Agent': 'OtogiDB-Validator/1.0' } },
      timeout,
      { maxAttempts: 3 }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        url: endpoint.url,
        description: endpoint.description,
        status: 'fail',
        statusCode: response.status,
        error: `HTTP ${response.status}`,
        responseTime,
      };
    }

    // Verify content type is JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
      return {
        url: endpoint.url,
        description: endpoint.description,
        status: 'fail',
        statusCode: response.status,
        error: `Not JSON: ${contentType}`,
        responseTime,
      };
    }

    // Parse JSON
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        url: endpoint.url,
        description: endpoint.description,
        status: 'fail',
        statusCode: response.status,
        error: 'Invalid JSON',
        responseTime,
      };
    }

    const validationErrors: string[] = [];

    // Check expected fields
    if (endpoint.expectedFields) {
      const obj = data as Record<string, unknown>;
      for (const field of endpoint.expectedFields) {
        if (!(field in obj)) {
          validationErrors.push(`Missing field: ${field}`);
        }
      }
    }

    // Run custom validator
    if (endpoint.validator) {
      const result = endpoint.validator(data);
      if (!result.valid && result.error) {
        validationErrors.push(result.error);
      }
    }

    if (validationErrors.length > 0) {
      return {
        url: endpoint.url,
        description: endpoint.description,
        status: 'fail',
        statusCode: response.status,
        error: validationErrors.join('; '),
        validationErrors,
        responseTime,
      };
    }

    return {
      url: endpoint.url,
      description: endpoint.description,
      status: 'pass',
      statusCode: response.status,
      responseTime,
    };
  } catch (error) {
    return {
      url: endpoint.url,
      description: endpoint.description,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      responseTime: Date.now() - startTime,
    };
  }
}

export async function validateApiEndpoints(
  baseUrl: string,
  timeout: number = 10000
): Promise<{ passed: number; failed: number; results: ApiValidationResult[] }> {
  console.log(`Validating ${DATA_ENDPOINTS.length} API endpoints`);

  const results: ApiValidationResult[] = [];

  for (const endpoint of DATA_ENDPOINTS) {
    const result = await validateEndpoint(baseUrl, endpoint, timeout);
    results.push(result);

    const icon = result.status === 'pass' ? '.' : '!';
    if (result.status === 'pass') {
      console.log(`  ${icon} ${endpoint.url} (${endpoint.description})`);
    } else {
      console.log(`  ${icon} ${endpoint.url} - ${result.error}`);
    }
  }

  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status !== 'pass').length;

  console.log(`  Results: ${passed} passed, ${failed} failed`);

  return { passed, failed, results };
}
