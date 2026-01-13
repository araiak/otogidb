import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { R2_BASE_URL } from '../utils/constants'

/**
 * R2 Availability Data Checks
 *
 * Monitors the R2-hosted availability system which provides real-time
 * card availability data (auction status, daily dungeon, etc.).
 *
 * The availability system uses a manifest + versioned files pattern:
 * - manifest.json: Points to current version, no-cache
 * - {version}.json: Immutable versioned data, cached forever
 */

// Check R2 availability manifest
// This is the critical file - if it's down, availability data won't load
new ApiCheck('r2-availability-manifest', {
  name: 'R2 - Availability Manifest',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['us-east-1', 'ap-northeast-1'],
  maxResponseTime: 5000,
  degradedResponseTime: 2000,
  request: {
    method: 'GET',
    url: `${R2_BASE_URL}/availability/manifest.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
      AssertionBuilder.responseTime().lessThan(5000),
      // Verify manifest has required fields
      AssertionBuilder.jsonBody('$.current_version').notEmpty(),
      AssertionBuilder.jsonBody('$.file_url').notEmpty(),
    ],
  },
})
