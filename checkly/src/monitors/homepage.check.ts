import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { criticalGroup } from '../groups'
import { BASE_URL } from '../utils/constants'

// Homepage EN - Primary (Slot 1)
// Free tier: 10,000 API checks/month = ~333/day max
new ApiCheck('homepage-en', {
  name: 'Homepage - English',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['us-east-1'],
  maxResponseTime: 10000,
  degradedResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/en/`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(10000),
    ],
  },
})

// Homepage JA - Secondary (Slot 2)
new ApiCheck('homepage-ja', {
  name: 'Homepage - Japanese',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_6H,
  locations: ['ap-northeast-1'],
  maxResponseTime: 10000,
  degradedResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/ja/`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})

// Root redirect check (Slot 9)
new ApiCheck('root-redirect', {
  name: 'Root - Redirect Check',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_6H,
  locations: ['us-east-1'],
  maxResponseTime: 10000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})
