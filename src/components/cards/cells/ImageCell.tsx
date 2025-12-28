import { useState, useCallback } from 'react';
import type { Card } from '../../../types/card';
import type { SkillData } from '../../../lib/formatters';
import type { SupportedLocale } from '../../../lib/i18n';
import { getThumbnailUrl, PLACEHOLDER_IMAGE } from '../../../lib/images';
import { CardFloatingPopup } from '../CardHoverProvider';

// Tier data type for a single card (must match CardPreviewContent)
interface TierCardData {
  percentiles: {
    five_round: number;
    one_round: number;
    defense: number;
    individual: number;
    overall: number;
    reserve: number;
  };
  tiers: {
    five_round: string;
    one_round: string;
    defense: string;
    individual: string;
    overall: string;
    reserve: string;
  };
}

interface ImageCellProps {
  card: Card;
  skills: Record<string, SkillData>;
  tierData?: TierCardData | null;
  locale: SupportedLocale;
}

// Track retry attempts per image URL to avoid infinite loops
const retryAttempts = new Map<string, number>();
const MAX_RETRIES = 2;

/**
 * Table cell component for card images with hover popup.
 * Displays a thumbnail that links to the card page and shows a preview popup on hover.
 * Includes automatic retry for failed image loads before falling back to placeholder.
 */
export default function ImageCell({ card, skills, tierData = null, locale }: ImageCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const url = getThumbnailUrl(card);
  const cardUrl = `/${locale}/cards/${card.id}`;

  // Handle image load errors with retry logic
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    const currentSrc = img.src;

    // Don't retry if already showing placeholder
    if (currentSrc === PLACEHOLDER_IMAGE || !url) {
      return;
    }

    // Check retry count for this URL
    const attempts = retryAttempts.get(url) || 0;
    if (attempts < MAX_RETRIES) {
      // Retry after a short delay
      retryAttempts.set(url, attempts + 1);
      setTimeout(() => {
        // Add cache-busting query param for retry
        img.src = `${url}${url.includes('?') ? '&' : '?'}_retry=${attempts + 1}`;
      }, 500 * (attempts + 1)); // Exponential backoff: 500ms, 1000ms
    } else {
      // Max retries reached, fall back to placeholder
      img.src = PLACEHOLDER_IMAGE;
    }
  }, [url]);

  return (
    <>
      <a
        href={cardUrl}
        ref={setReferenceElement}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={url || PLACEHOLDER_IMAGE}
          alt={card.name || `Card #${card.id}`}
          className="w-10 h-10 rounded object-cover cursor-pointer hover:ring-2 hover:ring-accent transition-all"
          loading="lazy"
          onError={handleImageError}
        />
      </a>
      <CardFloatingPopup
        card={card}
        isOpen={isHovered}
        referenceElement={referenceElement}
        skills={skills}
        tierData={tierData}
        placement="right-start"
        compact={true}
        locale={locale}
      />
    </>
  );
}
