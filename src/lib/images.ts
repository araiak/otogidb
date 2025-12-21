import type { Card } from '../types/card';

// Cloudinary base URL for constructing image URLs from asset_id
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dn3j8sqcc/image/upload';
const CLOUDINARY_FOLDER = 'otogi';

export type ImageVariant = 'android' | 'hd';

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
  if (variant === 'android') {
    // Don't construct android URLs for cards that don't have them
    if (!hasAndroidImage(assetId)) return null;
    return `${CLOUDINARY_BASE}/${CLOUDINARY_FOLDER}/android/${assetId}.png`;
  }

  if (variant === 'hd') {
    return `${CLOUDINARY_BASE}/${CLOUDINARY_FOLDER}/cards_hd/${assetId}_hd.png`;
  }

  return null;
}

/**
 * Get the appropriate image URL for a card
 * Returns Cloudinary URL from image_urls, or constructs one from asset_id
 *
 * Returns null if the image doesn't exist, allowing callers to use placeholders.
 */
export function getImageUrl(card: Card, variant: ImageVariant): string | null {
  // Try image_urls first (Cloudinary URLs from pipeline)
  const existingUrl = card.image_urls?.[variant];
  if (existingUrl) return existingUrl;

  // Fallback: construct URL from asset_id if available
  if (card.asset_id) {
    return constructCloudinaryUrl(card.asset_id, variant);
  }

  return null;
}

/**
 * Get optimized Cloudinary URL with transformations
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
  if (!baseUrl.includes('cloudinary.com')) {
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

// =============================================================================
// STANDARDIZED TRANSFORMS - Keep these minimal to reduce Cloudinary credits
// Each unique transform string × image = 1 derived asset
// =============================================================================
const STANDARD_TRANSFORMS = {
  // Android circle: Don't resize - serve at original size (~200px) for quality
  // CSS will handle display size, browser downscaling looks better than Cloudinary upscaling
  androidCircle: 'c_scale,r_max,f_auto,q_auto',
  // HD circle at 120px (2x for retina) - high-res source so resize looks good
  hdCircle: 'w_120,h_120,c_thumb,g_face,r_max,f_auto,q_auto',
  // 80px thumbnail for table rows
  thumb: 'w_80,f_auto,q_auto',
  // 200px for hover/tap popups
  popup: 'w_200,f_auto,q_auto',
  // Original size with optimization for detail pages
  hd: 'f_auto,q_auto',
} as const;

/**
 * Get thumbnail URL for card table (search results) - 80px
 * Uses HD optimized and scaled down, falls back to android
 */
export function getThumbnailUrl(card: Card): string | null {
  // Try HD first (highest quality, Cloudinary will resize and cache)
  const hdUrl = getImageUrl(card, 'hd');
  if (hdUrl && hdUrl.includes('cloudinary.com')) {
    return hdUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.thumb}/`);
  }
  if (hdUrl) return hdUrl;

  // Fall back to android
  const androidUrl = getImageUrl(card, 'android');
  if (androidUrl && androidUrl.includes('cloudinary.com')) {
    return androidUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.thumb}/`);
  }
  return androidUrl;
}

/**
 * Get medium size image for popups - 200px
 * Uses HD optimized, falls back to android
 */
export function getPopupImageUrl(card: Card): string | null {
  // Try HD first with resize
  const hdUrl = getImageUrl(card, 'hd');
  if (hdUrl && hdUrl.includes('cloudinary.com')) {
    return hdUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.popup}/`);
  }
  if (hdUrl) return hdUrl;

  // Fall back to android (no resize, it's already small)
  const androidUrl = getImageUrl(card, 'android');
  if (androidUrl && androidUrl.includes('cloudinary.com')) {
    return androidUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.hd}/`);
  }
  return androidUrl;
}

/**
 * Get HD image for detail pages - original size with optimization
 */
export function getHDImageUrl(card: Card): string | null {
  const hdUrl = getImageUrl(card, 'hd');
  if (hdUrl && hdUrl.includes('cloudinary.com')) {
    return hdUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.hd}/`);
  }
  return hdUrl;
}

/**
 * Get HD image with placeholder fallback for detail pages
 */
export function getHDImageUrlWithFallback(card: Card): string {
  const hdUrl = getHDImageUrl(card);
  if (hdUrl) return hdUrl;
  return getPlaceholderHD();
}

/**
 * Placeholder images served locally from /public/
 * Cached efficiently via Cloudflare edge (same-origin, immutable)
 */

// Local paths - served from /public/ directory
const PLACEHOLDER_CARD_PATH = '/placeholder-card.png';
const PLACEHOLDER_MASCOT_PATH = '/mascot.png';

/**
 * Get HD placeholder (original size)
 */
export function getPlaceholderHD(): string {
  return PLACEHOLDER_CARD_PATH;
}

/**
 * Get mascot placeholder
 */
export function getPlaceholderMascot(): string {
  return PLACEHOLDER_MASCOT_PATH;
}

/**
 * Get placeholder card image
 * Note: Circle cropping should be done via CSS border-radius if needed
 */
export function getPlaceholderCircle(): string {
  return PLACEHOLDER_CARD_PATH;
}

/**
 * Default placeholder image (HD card style)
 */
export const PLACEHOLDER_IMAGE = getPlaceholderHD();

/**
 * Generate a 120px circle thumbnail from HD image using Cloudinary transformations.
 * Uses content-aware cropping and face detection to create a circular thumbnail.
 * This is a fallback for cards missing android (circle) images.
 *
 * 120px (2x) for retina displays - HD source is high-res so resize looks crisp.
 */
export function getCircleThumbnailFromHD(card: Card): string | null {
  // Get the HD image URL
  const hdUrl = getImageUrl(card, 'hd');
  if (!hdUrl) return null;

  // Only apply transformations to Cloudinary URLs
  if (!hdUrl.includes('cloudinary.com')) {
    return hdUrl;
  }

  return hdUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.hdCircle}/`);
}

/**
 * Get android circle image with fallback to HD-generated circle, then mascot
 * For cards 1-100 that don't have android images on CDN
 *
 * Android: served at original size (~200px) - browser downscaling looks sharper than upscaling
 * HD fallback: 120px circle (2x for retina) - high-res source so resize is crisp
 */
export function getAndroidImageWithFallback(card: Card): string {
  // First try to get actual android image
  const androidUrl = getImageUrl(card, 'android');
  if (androidUrl) {
    // Apply circle optimization if it's a Cloudinary URL - no resize, keep original quality
    if (androidUrl.includes('cloudinary.com')) {
      return androidUrl.replace('/upload/', `/upload/${STANDARD_TRANSFORMS.androidCircle}/`);
    }
    return androidUrl;
  }

  // Fallback: generate circle from HD using content-aware crop
  const hdCircle = getCircleThumbnailFromHD(card);
  if (hdCircle) return hdCircle;

  // Final fallback: placeholder card cropped to circle
  return getPlaceholderCircle();
}
