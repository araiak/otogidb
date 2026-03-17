import type { Card } from '../../types/card';
import CardHoverProvider from '../cards/CardHoverProvider';

interface CardReferencePopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
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
export default function CardReferencePopups({ cards, skills = {} }: CardReferencePopupsProps) {
  return (
    <CardHoverProvider
      cards={cards}
      skills={skills}
      selector="a.card-ref[data-card-id]"
      placement="top"
      injectMobileIcons={true}
      compact={true}
      updateLinkText={true}
    />
  );
}
