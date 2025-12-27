import type { Card } from '../../types/card';
import CardHoverProvider from '../cards/CardHoverProvider';

// Tier data type
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

interface TierData {
  cards: Record<string, TierCardData>;
}

interface CardReferencePopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
  tiers?: TierData | null;
}

/**
 * Hydrates .card-ref links in blog content with hover popups.
 * Finds all links with class="card-ref" and data-card-id attributes,
 * then adds hover listeners to show card preview popups.
 * On mobile, injects view icons that open a modal preview.
 * Also updates link text with localized card names from the provided cards data.
 *
 * Now uses the unified CardHoverProvider for consistent behavior.
 */
export default function CardReferencePopups({ cards, skills = {}, tiers = null }: CardReferencePopupsProps) {
  return (
    <CardHoverProvider
      cards={cards}
      skills={skills}
      tiers={tiers}
      selector="a.card-ref[data-card-id]"
      placement="top"
      injectMobileIcons={true}
      compact={true}
      updateLinkText={true}
    />
  );
}
