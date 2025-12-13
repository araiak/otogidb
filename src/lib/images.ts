import type { Card } from '../types/card';

// Check if we should use local images (development mode)
export const USE_LOCAL_IMAGES = import.meta.env.PUBLIC_USE_LOCAL_IMAGES === 'true';

// Cloudinary base URL for constructing image URLs from asset_id
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dn3j8sqcc/image/upload';
const CLOUDINARY_FOLDER = 'otogi';

export type ImageVariant = 'android' | 'sd' | 'hd' | 'icons' | 'team';

// Cards 1-100 (asset_id 100001-100100) don't have android images on CDN
// They need to fall back to HD-generated circles
const CARDS_WITHOUT_ANDROID = new Set<string>();
for (let i = 100001; i <= 100100; i++) {
  CARDS_WITHOUT_ANDROID.add(String(i));
}

/**
 * Check if a card has android images available
 */
export function hasAndroidImage(assetId: string): boolean {
  return !CARDS_WITHOUT_ANDROID.has(assetId);
}

/**
 * Construct Cloudinary URL from asset_id when image_urls is not populated
 */
function constructCloudinaryUrl(assetId: string, variant: ImageVariant): string | null {
  // Map variant to Cloudinary folder and filename pattern
  // Note: SD images were deleted, only android and hd are available
  const variantConfig: Record<ImageVariant, { folder: string; suffix: string } | null> = {
    android: { folder: 'android', suffix: '' },
    sd: null,     // SD images deleted
    hd: { folder: 'cards_hd', suffix: '_hd' },
    icons: null,  // Not uploaded
    team: null,   // Not uploaded
  };

  const config = variantConfig[variant];
  if (!config) return null;

  // Don't construct android URLs for cards that don't have them
  if (variant === 'android' && !hasAndroidImage(assetId)) {
    return null;
  }

  return `${CLOUDINARY_BASE}/${CLOUDINARY_FOLDER}/${config.folder}/${assetId}${config.suffix}.png`;
}

/**
 * Get the appropriate image URL for a card based on environment
 * Production: Cloudinary URLs (from image_urls or constructed from asset_id)
 * Development: Local file paths
 */
export function getImageUrl(card: Card, variant: ImageVariant): string | null {
  if (USE_LOCAL_IMAGES) {
    // Local development: use local paths
    const localPath = card.images?.[variant];
    if (!localPath) return null;
    return `/images/${localPath}`;
  }

  // Production: try image_urls first, then construct from asset_id
  const existingUrl = card.image_urls?.[variant];
  if (existingUrl) return existingUrl;

  // Fallback: construct URL from asset_id
  if (card.asset_id) {
    return constructCloudinaryUrl(card.asset_id, variant);
  }

  return null;
}

/**
 * Get optimized Cloudinary URL with transformations
 * Only applies in production mode
 */
export function getOptimizedImageUrl(
  card: Card,
  variant: ImageVariant,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'png' | 'jpg';
  } = {}
): string | null {
  const baseUrl = getImageUrl(card, variant);
  if (!baseUrl) return null;

  // Only apply transformations to Cloudinary URLs
  if (USE_LOCAL_IMAGES || !baseUrl.includes('cloudinary.com')) {
    return baseUrl;
  }

  // Build transformation string
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.quality) transforms.push(`q_${options.quality}`);
  if (options.format) transforms.push(`f_${options.format}`);

  if (transforms.length === 0) {
    // Default optimizations
    transforms.push('q_auto', 'f_auto');
  }

  // Insert transformations into Cloudinary URL
  // From: .../upload/v123/...
  // To:   .../upload/w_50,q_auto,f_auto/v123/...
  return baseUrl.replace('/upload/', `/upload/${transforms.join(',')}/`);
}

/**
 * Get thumbnail URL for card table (search results)
 * Uses HD optimized and scaled down, falls back to android
 */
export function getThumbnailUrl(card: Card): string | null {
  // Try HD first (highest quality, Cloudinary will resize and cache)
  const hdUrl = getOptimizedImageUrl(card, 'hd', {
    width: 80,
    quality: 'auto',
    format: 'auto'
  });
  if (hdUrl) return hdUrl;

  // Fall back to android
  return getOptimizedImageUrl(card, 'android', {
    width: 80,
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Get medium size image for popups
 * Uses HD optimized, falls back to android
 */
export function getPopupImageUrl(card: Card): string | null {
  // Try HD first with resize
  const hdUrl = getOptimizedImageUrl(card, 'hd', {
    width: 200,
    quality: 'auto',
    format: 'auto'
  });
  if (hdUrl) return hdUrl;

  // Fall back to android
  return getOptimizedImageUrl(card, 'android', {
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Get HD image for detail pages
 */
export function getHDImageUrl(card: Card): string | null {
  return getOptimizedImageUrl(card, 'hd', {
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * Placeholder image for missing/failed images
 */
export const PLACEHOLDER_IMAGE = '/placeholder-card.svg';

/**
 * Generate a circle thumbnail from HD image using Cloudinary transformations.
 * Uses content-aware cropping and face detection to create a circular thumbnail.
 * This is a fallback for cards missing android (circle) images.
 */
export function getCircleThumbnailFromHD(card: Card, size: number = 128): string | null {
  // Get the HD image URL
  const hdUrl = getImageUrl(card, 'hd');
  if (!hdUrl) return null;

  // Only apply transformations to Cloudinary URLs
  if (!hdUrl.includes('cloudinary.com')) {
    return hdUrl;
  }

  // Cloudinary transformations for circle thumbnail:
  // - w_{size},h_{size}: Target dimensions
  // - c_thumb: Thumbnail crop mode (smart cropping)
  // - g_face: Focus on face detection (best for character art)
  // - r_max: Maximum border radius (creates circle)
  // - f_auto,q_auto: Automatic format and quality
  const transforms = `w_${size},h_${size},c_thumb,g_face,r_max,f_auto,q_auto`;

  return hdUrl.replace('/upload/', `/upload/${transforms}/`);
}

/**
 * Get android circle image, with fallback to HD-generated circle
 * For cards 1-100 that don't have android images on CDN
 */
export function getAndroidImageWithFallback(card: Card, size: number = 128): string | null {
  // First try to get actual android image
  const androidUrl = getImageUrl(card, 'android');
  if (androidUrl) {
    // Apply size optimization if it's a Cloudinary URL
    if (androidUrl.includes('cloudinary.com')) {
      const transforms = `w_${size},h_${size},c_fill,r_max,f_auto,q_auto`;
      return androidUrl.replace('/upload/', `/upload/${transforms}/`);
    }
    return androidUrl;
  }

  // Fallback: generate circle from HD using content-aware crop
  return getCircleThumbnailFromHD(card, size);
}
