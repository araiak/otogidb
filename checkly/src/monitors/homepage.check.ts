import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { criticalGroup } from '../groups'
import { BASE_URL } from '../utils/constants'

// Homepage EN - Primary (Slot 1)
new ApiCheck('homepage-en', {
  name: 'Homepage - English',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1', 'ap-northeast-1', 'ap-southeast-1'],
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
  frequency: Frequency.EVERY_2M,
  locations: ['ap-northeast-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'],
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
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1'],
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
