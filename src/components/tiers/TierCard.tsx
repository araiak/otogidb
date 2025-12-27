import { useState } from 'react';
import type { TierMode, DisplayTierCard } from '../../types/tiers';
import { getPercentile } from '../../lib/tiers';
import { UNIT_TYPE_NAMES, ATTRIBUTE_NAMES } from '../../types/tiers';
import { getAndroidImageWithFallback } from '../../lib/images';

interface TierCardProps {
  card: DisplayTierCard;
  mode: TierMode;
  isHighlighted?: boolean;
  grayUnavailable?: boolean;
}

// Minimal card object to use with standardized image functions
function getCardImageUrl(cardId: number): string {
  const assetId = String(100000 + cardId);
  // Create minimal card-like object for the image function
  const pseudoCard = {
    asset_id: assetId,
    image_urls: undefined,
  };
  return getAndroidImageWithFallback(pseudoCard as any);
}

// Format large numbers compactly (1.5M, 850K, etc.)
function formatDamage(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

// Format time in seconds compactly (e.g., "120s" or "2:30")
function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
  }
  return `${Math.round(seconds)}s`;
}

// Format % change from baseline (e.g., "+15%", "-5%")
function formatPctChange(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

export default function TierCard({
  card,
  mode,
  isHighlighted = false,
  grayUnavailable = false,
}: TierCardProps) {
  const [imageError, setImageError] = useState(false);

  const percentile = getPercentile(card, mode);

  const imageUrl = getCardImageUrl(card.card_id);
  const placeholderUrl = '/placeholder-card.png';

  // Check if card should be grayed out
  const isUnavailable = grayUnavailable && card.currently_available === false;

  // Detect locale from URL for card link
  const getLocale = () => {
    if (typeof window === 'undefined') return 'en';
    const match = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
    return match ? match[1] : 'en';
  };

  return (
    <a
      href={`/${getLocale()}/cards/${card.card_id}`}
      data-card-id={card.card_id}
      className={`relative group block ${isUnavailable ? 'opacity-40' : ''}`}
    >
      {/* Card image - small circle like updates page */}
      <div className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${
        isHighlighted
          ? 'ring-yellow-400 ring-offset-2 ring-offset-black scale-125 z-10'
          : 'ring-transparent group-hover:ring-accent'
      } ${isUnavailable ? 'grayscale' : ''}`}
           style={{ backgroundColor: 'var(--color-bg)' }}>
        <img
          src={imageError ? placeholderUrl : imageUrl}
          alt={card.card_name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </div>

      {/* Score badge - shows meaningful values per mode */}
      <div className={`absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 px-1 py-0 text-[8px] font-bold rounded-full whitespace-nowrap ${
        isUnavailable ? 'bg-gray-600/80 text-gray-300' : 'bg-black/80 text-white'
      }`}>
        {mode === 'individual' && card.raw?.individual > 0
          ? formatDamage(card.raw.individual)
          : mode === 'defense' && card.raw?.defense > 0
          ? formatTime(card.raw.defense)
          : mode === 'five_round' && card.vs_baseline?.five_round !== undefined
          ? formatPctChange(card.vs_baseline.five_round)
          : mode === 'one_round' && card.vs_baseline?.one_round !== undefined
          ? formatPctChange(card.vs_baseline.one_round)
          : `${percentile.toFixed(0)}%`}
      </div>

    </a>
  );
}
