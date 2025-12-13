import { useState } from 'react';
import type { Card } from '../../types/card';
import { getImageUrl, getOptimizedImageUrl, type ImageVariant, PLACEHOLDER_IMAGE } from '../../lib/images';

interface CardImageProps {
  card: Card;
  variant: ImageVariant;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  showPlaceholder?: boolean;
}

const SIZE_MAP = {
  sm: { width: 50, className: 'w-10 h-10' },
  md: { width: 100, className: 'w-24 h-24' },
  lg: { width: 200, className: 'w-48 h-auto' },
  full: { width: undefined, className: 'w-full h-auto' },
};

export default function CardImage({
  card,
  variant,
  size = 'md',
  className = '',
  showPlaceholder = true,
}: CardImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeConfig = SIZE_MAP[size];
  const imageUrl = sizeConfig.width
    ? getOptimizedImageUrl(card, variant, { width: sizeConfig.width, quality: 'auto', format: 'auto' })
    : getImageUrl(card, variant);

  // If no image URL and no placeholder, render nothing
  if (!imageUrl && !showPlaceholder) {
    return null;
  }

  const finalSrc = hasError || !imageUrl ? PLACEHOLDER_IMAGE : imageUrl;

  return (
    <div className={`relative ${sizeConfig.className} ${className}`}>
      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 animate-pulse rounded ${sizeConfig.className}`}
          style={{ backgroundColor: 'var(--color-surface)' }}
        />
      )}

      <img
        src={finalSrc}
        alt={card.name || `Card #${card.id}`}
        loading="lazy"
        className={`rounded object-cover ${sizeConfig.className} ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
      />
    </div>
  );
}
