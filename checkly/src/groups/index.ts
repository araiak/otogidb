import { CheckGroup, Frequency } from 'checkly/constructs'
import { discordChannel } from '../alert-channels'

// Critical checks - Homepage and core functionality
export const criticalGroup = new CheckGroup('critical-checks', {
  name: 'Critical - Core Functionality',
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1', 'ap-northeast-1', 'ap-southeast-1'],
  tags: ['critical', 'production'],
  alertChannels: [discordChannel],
})

// Standard checks - Feature functionality
export const standardGroup = new CheckGroup('standard-checks', {
  name: 'Standard - Features',
  activated: true,
  frequency: Frequency.EVERY_12H,
  locations: ['us-east-1', 'eu-west-1'],
  tags: ['standard', 'production'],
  alertChannels: [discordChannel],
})

// CDN checks - External dependencies
export const cdnGroup = new CheckGroup('cdn-checks', {
  name: 'CDN - External Dependencies',
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['us-east-1', 'ap-northeast-1'],
  tags: ['cdn', 'external'],
  alertChannels: [discordChannel],
})
