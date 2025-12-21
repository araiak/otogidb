import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { CLOUDINARY_BASE, CLOUDINARY_PATHS, CLOUDINARY_TRANSFORMS, SAMPLE_CARD_IDS } from '../utils/constants'

// Check various Cloudinary image types
const imageChecks = [
  {
    id: 'cloudinary-popup',
    name: 'CDN - Cloudinary Popup Size',
    transform: CLOUDINARY_TRANSFORMS.popup,
    path: CLOUDINARY_PATHS.hdCard(SAMPLE_CARD_IDS.primary),
  },
  {
    id: 'cloudinary-placeholder',
    name: 'CDN - Cloudinary Placeholder',
    transform: 'f_auto,q_auto',
    path: CLOUDINARY_PATHS.placeholder,
  },
  {
    id: 'cloudinary-favicon',
    name: 'CDN - Cloudinary Favicon',
    transform: CLOUDINARY_TRANSFORMS.favicon,
    path: CLOUDINARY_PATHS.hdCard(SAMPLE_CARD_IDS.secondary),
  },
]

imageChecks.forEach(({ id, name, transform, path }) => {
  new ApiCheck(id, {
    name,
    group: cdnGroup,
    activated: true,
    frequency: Frequency.EVERY_1H,
    locations: ['us-east-1', 'eu-west-1', 'ap-northeast-1'],
    maxResponseTime: 5000,
    request: {
      method: 'HEAD',
      url: `${CLOUDINARY_BASE}/${transform}/${path}`,
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.responseTime().lessThan(5000),
        AssertionBuilder.headers('content-type').contains('image/'),
      ],
    },
  })
})
