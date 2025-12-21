import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { CLOUDINARY_BASE, CLOUDINARY_PATHS, CLOUDINARY_TRANSFORMS, SAMPLE_CARD_IDS } from '../utils/constants'

// Cloudinary CDN - HD Card Image (Slot 8)
new ApiCheck('cloudinary-hd-card', {
  name: 'CDN - Cloudinary HD Card',
  group: cdnGroup,
  activated: true,
  frequency: Frequency.EVERY_2M,
  locations: ['us-east-1', 'eu-west-1', 'ap-northeast-1'],
  maxResponseTime: 5000,
  request: {
    method: 'HEAD', // HEAD request to check availability without downloading full image
    url: `${CLOUDINARY_BASE}/${CLOUDINARY_TRANSFORMS.thumb}/${CLOUDINARY_PATHS.hdCard(SAMPLE_CARD_IDS.primary)}`,
    assertions: [
      AssertionBuilder.statusCode().equals(200),
      AssertionBuilder.responseTime().lessThan(5000),
      AssertionBuilder.headers('content-type').contains('image/'),
    ],
  },
})
