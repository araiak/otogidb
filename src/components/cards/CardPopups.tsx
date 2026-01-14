import type { Card } from '../../types/card';
import CardHoverProvider from './CardHoverProvider';

interface CardPopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
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
  selector = '[data-card-id]',
  injectMobileIcons = false,
}: CardPopupsProps) {
  return (
    <CardHoverProvider
      cards={cards}
      skills={skills}
      selector={selector}
      placement="top"
      injectMobileIcons={injectMobileIcons}
      compact={true}
    />
  );
}
