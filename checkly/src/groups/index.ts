import { CheckGroupV2, Frequency, RetryStrategyBuilder } from 'checkly/constructs'
import { discordChannel } from '../alert-channels'

// Free plan allowed regions: eu-central-1, us-east-1, ap-southeast-1, ap-southeast-2

// Retry strategies: retry from a different region before alerting to avoid
// false positives from single-region connectivity blips (e.g. us-east-1 → Cloudflare)
const criticalRetry = RetryStrategyBuilder.fixedStrategy({
  baseBackoffSeconds: 10,
  maxRetries: 2,
  sameRegion: false,
})

const cdnRetry = RetryStrategyBuilder.linearStrategy({
  baseBackoffSeconds: 30,
  maxRetries: 2,
  sameRegion: false,
})

// Critical checks - Homepage and core functionality
export const criticalGroup = new CheckGroupV2('critical-checks', {
  name: 'Critical - Core Functionality',
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['eu-central-1', 'us-east-1', 'ap-southeast-1'],
  tags: ['critical', 'production'],
  alertChannels: [discordChannel],
  retryStrategy: criticalRetry,
})

// Standard checks - Feature functionality
export const standardGroup = new CheckGroupV2('standard-checks', {
  name: 'Standard - Features',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['eu-central-1', 'us-east-1'],
  tags: ['standard', 'production'],
  alertChannels: [discordChannel],
  retryStrategy: criticalRetry,
})

// CDN checks - External dependencies
export const cdnGroup = new CheckGroupV2('cdn-checks', {
  name: 'CDN - External Dependencies',
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['eu-central-1', 'ap-southeast-1'],
  tags: ['cdn', 'external'],
  alertChannels: [discordChannel],
  retryStrategy: cdnRetry,
})
