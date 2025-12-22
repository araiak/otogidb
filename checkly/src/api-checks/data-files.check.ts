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
new ApiCheck('data-manifest', {
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
