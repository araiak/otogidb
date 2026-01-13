import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { BASE_URL, LOCALES } from '../utils/constants'

// Check card data files for all locales (runs hourly to stay within limits)
const localesToCheck = ['ko', 'zh-cn', 'zh-tw', 'es'] as const

localesToCheck.forEach((locale) => {
  const dataPath = `/data/${locale}/cards_index.json`

  new ApiCheck(`data-cards-${locale}`, {
    name: `Data - Cards Index (${locale.toUpperCase()})`,
    group: cdnGroup,
    activated: true,
    frequency: Frequency.EVERY_12H,
    locations: ['us-east-1'],
    maxResponseTime: 10000,
    request: {
      method: 'GET',
      url: `${BASE_URL}${dataPath}`,
      followRedirects: true,
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.headers('content-type').contains('application/json'),
        AssertionBuilder.responseTime().lessThan(10000),
      ],
    },
  })
})

// Check patch notes manifest
// DEPRECATED: Patch notes manifest will be merged into unified manifest in future
new ApiCheck('data-patch-notes-manifest', {
  name: 'Data - Patch Notes Manifest',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_24H,
  locations: ['us-east-1'],
  maxResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/data/changes/manifest.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
    ],
  },
})

/**
 * Unified Data Manifest Check
 *
 * Phase 4: New canonical manifest at /data/manifest.json
 * Contains version, hashed file paths, and delta info.
 *
 * This is the single source of truth for:
 * - Current data version
 * - Hashed file paths per locale
 * - Available delta updates
 */
new ApiCheck('data-unified-manifest', {
  name: 'Data - Unified Manifest',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['us-east-1'],
  maxResponseTime: 5000,
  degradedResponseTime: 2000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/data/manifest.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
      AssertionBuilder.responseTime().lessThan(5000),
      // Verify manifest has required fields
      AssertionBuilder.jsonBody('$.version').notEmpty(),
      AssertionBuilder.jsonBody('$.files.en.cards_index').notEmpty(),
      AssertionBuilder.jsonBody('$.generated_at').notEmpty(),
    ],
  },
})

// DEPRECATED: Legacy delta manifest at /data/delta/manifest.json
// This check verifies backwards compatibility until all clients migrate.
// Will be removed once clients use unified manifest exclusively.
new ApiCheck('data-delta-manifest-legacy', {
  name: 'Data - Delta Manifest (Legacy)',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['us-east-1'],
  maxResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/data/delta/manifest.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
      // Legacy format uses current_version, not version
      AssertionBuilder.jsonBody('$.current_version').notEmpty(),
    ],
  },
})
