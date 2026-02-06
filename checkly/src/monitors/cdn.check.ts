import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { CLOUDINARY_BASE, CLOUDINARY_PATHS, CLOUDINARY_TRANSFORMS, SAMPLE_ASSET_IDS } from '../utils/constants'

// Cloudinary CDN - Thumbnail size (small bandwidth)
// Free tier: 10,000 API checks/month = ~333/day max
new ApiCheck('cloudinary-thumb', {
  name: 'CDN - Cloudinary Thumbnail',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_6H,
  locations: ['eu-central-1'],
  maxResponseTime: 5000,
  request: {
    method: 'HEAD', // HEAD request - no body downloaded
    url: `${CLOUDINARY_BASE}/${CLOUDINARY_TRANSFORMS.thumb}/${CLOUDINARY_PATHS.hdCard(SAMPLE_ASSET_IDS.primary)}`,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
      AssertionBuilder.headers('content-type').contains('image/'),
    ],
  },
})
