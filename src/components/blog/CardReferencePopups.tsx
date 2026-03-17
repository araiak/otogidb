import { useState, useEffect } from 'react';
import type { Card } from '../../types/card';
import CardHoverProvider from '../cards/CardHoverProvider';
import { getCardsData, type CardLocale } from '../../lib/cards';
import { getLocaleFromUrl } from '../../lib/i18n';

/**
 * Hydrates .card-ref links in blog content with hover popups.
 * Self-fetches card data via the shared IndexedDB cache — no prop needed.
 */
export default function CardReferencePopups() {
  const [cards, setCards] = useState<Record<string, Card>>({});

  useEffect(() => {
    const locale = getLocaleFromUrl() as CardLocale;
    getCardsData({ locale })
      .then((result) => setCards(result.cards))
      .catch(err => console.error('[CardReferencePopups] Failed to load card data:', err));
  }, []);

  return (
    <CardHoverProvider
      cards={cards}
      selector="a.card-ref[data-card-id]"
      placement="top"
      injectMobileIcons={true}
      compact={true}
      updateLinkText={true}
    />
  );
}
