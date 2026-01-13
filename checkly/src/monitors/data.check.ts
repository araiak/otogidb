import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { criticalGroup } from '../groups'
import { BASE_URL } from '../utils/constants'

// Cards Data EN (Slot 6)
// Free tier: 10,000 API checks/month = ~333/day max
new ApiCheck('data-cards-en', {
  name: 'Data - Cards Index (EN)',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_1H,
  locations: ['us-east-1'],
  maxResponseTime: 10000,
  degradedResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/data/cards_index.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
      AssertionBuilder.responseTime().lessThan(10000),
    ],
  },
})

// Cards Data JA (Slot 7)
new ApiCheck('data-cards-ja', {
  name: 'Data - Cards Index (JA)',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_6H,
  locations: ['ap-southeast-1'],
  maxResponseTime: 10000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/data/ja/cards_index.json`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('application/json'),
    ],
  },
})
