/**
 * Game icon component for displaying attribute, type, and rarity icons.
 *
 * Uses local icons in development, Cloudinary CDN in production.
 */

import { getAttributeIconUrl, getTypeIconUrl, getStarIconUrl } from '../../lib/icons';

interface GameIconProps {
  type: 'attribute' | 'type' | 'rarity';
  value: string | number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// Size mappings for icons
const SIZES = {
  sm: { class: 'w-4 h-4', width: 16 },
  md: { class: 'w-5 h-5', width: 20 },
  lg: { class: 'w-6 h-6', width: 24 },
};

// Size mappings for star icons (slightly smaller due to overlap)
const STAR_SIZES = {
  sm: { class: 'w-3 h-3', width: 12 },
  md: { class: 'w-4 h-4', width: 16 },
  lg: { class: 'w-5 h-5', width: 20 },
};

export function AttributeIcon({
  value,
  size = 'md',
  showLabel = false,
  className = ''
}: Omit<GameIconProps, 'type'> & { value: string }) {
  const sizeConfig = SIZES[size];
  const iconUrl = getAttributeIconUrl(value, { width: sizeConfig.width * 2 }); // 2x for retina

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={value}>
      <img
        src={iconUrl}
        alt={value}
        className={`${sizeConfig.class} object-contain`}
        loading="lazy"
        decoding="async"
      />
      {showLabel && <span className="text-xs">{value}</span>}
    </span>
  );
}

export function TypeIcon({
  value,
  size = 'md',
  showLabel = false,
  className = ''
}: Omit<GameIconProps, 'type'> & { value: string }) {
  const sizeConfig = SIZES[size];
  const iconUrl = getTypeIconUrl(value, { width: sizeConfig.width * 2 }); // 2x for retina

  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={value}>
      <img
        src={iconUrl}
        alt={value}
        className={`${sizeConfig.class} object-contain`}
        loading="lazy"
        decoding="async"
      />
      {showLabel && <span className="text-xs">{value}</span>}
    </span>
  );
}

export function RarityStars({
  value,
  size = 'md',
  className = ''
}: Omit<GameIconProps, 'type' | 'showLabel'> & { value: number }) {
  const count = Math.min(Math.max(1, value), 5);
  const sizeConfig = STAR_SIZES[size];
  const starUrl = getStarIconUrl({ width: sizeConfig.width * 2 }); // 2x for retina

  return (
    <span className={`inline-flex items-center ${className}`} title={`${count} Star${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }, (_, i) => (
        <img
          key={i}
          src={starUrl}
          alt="★"
          className={`${sizeConfig.class} object-contain -ml-0.5 first:ml-0`}
          loading="lazy"
          decoding="async"
        />
      ))}
    </span>
  );
}

// Combined component for flexibility
export default function GameIcon({ type, value, size = 'md', showLabel = false, className = '' }: GameIconProps) {
  switch (type) {
    case 'attribute':
      return <AttributeIcon value={String(value)} size={size} showLabel={showLabel} className={className} />;
    case 'type':
      return <TypeIcon value={String(value)} size={size} showLabel={showLabel} className={className} />;
    case 'rarity':
      return <RarityStars value={Number(value)} size={size} className={className} />;
    default:
      return null;
  }
}
