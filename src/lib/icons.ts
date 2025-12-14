/**
 * Icon URL helpers for attribute, type, and rarity icons.
 *
 * In development: Uses local files from /icons/
 * In production: Uses Cloudinary CDN with auto optimization
 */

// Check if we should use local images (development mode)
export const USE_LOCAL_ICONS = import.meta.env.PUBLIC_USE_LOCAL_IMAGES === 'true';

// Cloudinary base URL and optimization params
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dn3j8sqcc/image/upload';
const CLOUDINARY_FOLDER = 'otogi/icons';

// Optimization: f_auto (auto format - WebP/AVIF), q_auto (auto quality)
const _DEFAULT_OPTIMIZATION = 'f_auto,q_auto';

// Local paths
const LOCAL_PATHS = {
  attributes: {
    anima: '/icons/attributes/anima.png',
    divina: '/icons/attributes/divina.png',
    phantasma: '/icons/attributes/phantasma.png',
  },
  types: {
    melee: '/icons/types/melee.png',
    ranged: '/icons/types/ranged.png',
    healer: '/icons/types/healer.png',
    assist: '/icons/types/assist.png',
  },
  rarity: {
    star: '/icons/rarity/star.png',
  },
} as const;

// Cloudinary public IDs
const CLOUDINARY_IDS = {
  attributes: {
    anima: `${CLOUDINARY_FOLDER}/attributes/anima`,
    divina: `${CLOUDINARY_FOLDER}/attributes/divina`,
    phantasma: `${CLOUDINARY_FOLDER}/attributes/phantasma`,
  },
  types: {
    melee: `${CLOUDINARY_FOLDER}/types/melee`,
    ranged: `${CLOUDINARY_FOLDER}/types/ranged`,
    healer: `${CLOUDINARY_FOLDER}/types/healer`,
    assist: `${CLOUDINARY_FOLDER}/types/assist`,
  },
  rarity: {
    star: `${CLOUDINARY_FOLDER}/rarity/star`,
  },
} as const;

type AttributeName = 'anima' | 'divina' | 'phantasma';
type TypeName = 'melee' | 'ranged' | 'healer' | 'assist';

/**
 * Build optimized Cloudinary URL
 */
function buildCloudinaryUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'png';
}): string {
  const transforms: string[] = [];

  // Always use auto format and quality for best optimization
  transforms.push('f_auto');
  transforms.push(options?.quality ? `q_${options.quality}` : 'q_auto');

  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);

  return `${CLOUDINARY_BASE}/${transforms.join(',')}/${publicId}`;
}

/**
 * Get URL for an attribute icon (Anima, Divina, Phantasma)
 */
export function getAttributeIconUrl(attribute: string, options?: { width?: number }): string {
  const key = attribute.toLowerCase() as AttributeName;

  if (USE_LOCAL_ICONS) {
    return LOCAL_PATHS.attributes[key] || LOCAL_PATHS.attributes.anima;
  }

  const publicId = CLOUDINARY_IDS.attributes[key] || CLOUDINARY_IDS.attributes.anima;
  return buildCloudinaryUrl(publicId, options);
}

/**
 * Get URL for a type icon (Melee, Ranged, Healer, Assist)
 */
export function getTypeIconUrl(type: string, options?: { width?: number }): string {
  const key = type.toLowerCase() as TypeName;

  if (USE_LOCAL_ICONS) {
    return LOCAL_PATHS.types[key] || LOCAL_PATHS.types.melee;
  }

  const publicId = CLOUDINARY_IDS.types[key] || CLOUDINARY_IDS.types.melee;
  return buildCloudinaryUrl(publicId, options);
}

/**
 * Get URL for the star/rarity icon
 */
export function getStarIconUrl(options?: { width?: number }): string {
  if (USE_LOCAL_ICONS) {
    return LOCAL_PATHS.rarity.star;
  }

  return buildCloudinaryUrl(CLOUDINARY_IDS.rarity.star, options);
}

/**
 * Get all icon URLs for preloading
 */
export function getAllIconUrls(): string[] {
  const urls: string[] = [];

  // Attributes
  Object.keys(LOCAL_PATHS.attributes).forEach(attr => {
    urls.push(getAttributeIconUrl(attr));
  });

  // Types
  Object.keys(LOCAL_PATHS.types).forEach(type => {
    urls.push(getTypeIconUrl(type));
  });

  // Star
  urls.push(getStarIconUrl());

  return urls;
}
