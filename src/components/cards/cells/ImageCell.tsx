import { useState } from 'react';
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

/**
 * Table cell component for card images with hover popup.
 * Displays a thumbnail that links to the card page and shows a preview popup on hover.
 */
export default function ImageCell({ card, skills, tierData = null, locale }: ImageCellProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const url = getThumbnailUrl(card);
  const cardUrl = `/${locale}/cards/${card.id}`;

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
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
          }}
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
