import { ApiCheck, AssertionBuilder, Frequency } from 'checkly/constructs'
import { cdnGroup } from '../groups'
import { CLOUDINARY_BASE, CLOUDINARY_PATHS, CLOUDINARY_TRANSFORMS, SAMPLE_ASSET_IDS } from '../utils/constants'

// Check Cloudinary using small images and HEAD requests to minimize bandwidth
// All use w_80 (80px thumbnail) which is ~2-5KB per image
const imageChecks = [
  {
    id: 'cloudinary-thumb-check',
    name: 'CDN - Cloudinary Thumb Transform',
    transform: CLOUDINARY_TRANSFORMS.thumb, // w_80,f_auto,q_auto
    path: CLOUDINARY_PATHS.hdCard(SAMPLE_ASSET_IDS.primary),
  },
  {
    id: 'cloudinary-placeholder',
    name: 'CDN - Cloudinary Placeholder',
    transform: 'w_80,f_auto,q_auto', // Small transform for placeholder
    path: CLOUDINARY_PATHS.placeholder,
  },
  {
    id: 'cloudinary-favicon',
    name: 'CDN - Cloudinary Favicon',
    transform: CLOUDINARY_TRANSFORMS.favicon, // Already small (32x32)
    path: CLOUDINARY_PATHS.hdCard(SAMPLE_ASSET_IDS.secondary),
  },
]

imageChecks.forEach(({ id, name, transform, path }) => {
  new ApiCheck(id, {
    name,
    group: cdnGroup,
    activated: true,
    frequency: Frequency.EVERY_12H,
    locations: ['eu-central-1'],
    maxResponseTime: 5000,
    request: {
      method: 'HEAD', // HEAD request - doesn't download image body
      url: `${CLOUDINARY_BASE}/${transform}/${path}`,
      assertions: [
        AssertionBuilder.statusCode().equals(200),
        AssertionBuilder.responseTime().lessThan(5000),
        AssertionBuilder.headers('content-type').contains('image/'),
      ],
    },
  })
})
