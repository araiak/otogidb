import type { Card } from '../../types/card';
import CardHoverProvider from './CardHoverProvider';

// Tier data type (must match TierCardData in CardPreviewContent)
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
    reserve: string;  // Not part of overall - measures passive ability value in reserve slot
  };
}

interface TierData {
  cards: Record<string, TierCardData>;
}

interface CardPopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
  /** Tier data for all cards (optional) */
  tiers?: TierData | null;
  /** CSS selector for elements that trigger popups (must have data-card-id attribute) */
  selector?: string;
  /** Whether to inject mobile preview icons next to elements */
  injectMobileIcons?: boolean;
}

/**
 * Adds hover popups to elements with data-card-id attributes.
 * Works with both blog card references and synergy card grids.
 *
 * Now uses the unified CardHoverProvider for consistent behavior.
 */
export default function CardPopups({
  cards,
  skills = {},
  tiers = null,
  selector = '[data-card-id]',
  injectMobileIcons = false,
}: CardPopupsProps) {
  return (
    <CardHoverProvider
      cards={cards}
      skills={skills}
      tiers={tiers}
      selector={selector}
      placement="top"
      injectMobileIcons={injectMobileIcons}
      compact={true}
    />
  );
}
