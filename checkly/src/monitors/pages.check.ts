import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { criticalGroup } from '../groups'
import { BASE_URL, SAMPLE_CARD_IDS } from '../utils/constants'

// Card Detail Page (Slot 3)
new ApiCheck('card-detail-page', {
  name: 'Card Detail - Sample Page',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1', 'ap-northeast-1', 'ap-southeast-1'],
  maxResponseTime: 10000,
  degradedResponseTime: 5000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(10000),
    ],
  },
})

// Blog Index (Slot 4)
new ApiCheck('blog-index', {
  name: 'Blog - Index Page',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1'],
  maxResponseTime: 10000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/en/blog/`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})

// Updates Page (Slot 5)
new ApiCheck('updates-page', {
  name: 'Updates - Patch Notes',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1'],
  maxResponseTime: 10000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/en/updates/`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
    ],
  },
})

// Sitemap (Slot 10)
new ApiCheck('sitemap', {
  name: 'Sitemap - SEO Index',
  group: criticalGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1'],
  maxResponseTime: 10000,
  request: {
    method: 'GET',
    url: `${BASE_URL}/sitemap-index.xml`,
    followRedirects: true,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.headers('content-type').contains('xml'),
    ],
  },
})
