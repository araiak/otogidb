import { useState, useEffect } from 'react';
import type { Card } from '../../types/card';
import CardHoverProvider from './CardHoverProvider';
import { getCardsData, type CardLocale } from '../../lib/cards';
import { getLocaleFromUrl } from '../../lib/i18n';

interface CardPopupsProps {
  /** Optional: if not provided, card data is fetched from cards_index via IndexedDB cache */
  cards?: Record<string, Card>;
  /** CSS selector for elements that trigger popups (must have data-card-id attribute) */
  selector?: string;
  /** Whether to inject mobile preview icons next to elements */
  injectMobileIcons?: boolean;
}

/**
 * Adds hover popups to elements with data-card-id attributes.
 * When cards are not passed as props, fetches from cards_index via the shared
 * IndexedDB cache (same data source as CardTable — typically already loaded).
 */
export default function CardPopups({
  cards: cardsProp,
  selector = '[data-card-id]',
  injectMobileIcons = false,
}: CardPopupsProps) {
  const [cards, setCards] = useState<Record<string, Card>>(cardsProp || {});

  useEffect(() => {
    if (cardsProp) return; // Caller provided data — no need to fetch
    const locale = getLocaleFromUrl() as CardLocale;
    getCardsData({ locale })
      .then((result) => setCards(result.cards))
      .catch(err => console.error('[CardPopups] Failed to load card data:', err));
  }, [cardsProp]);

  return (
    <CardHoverProvider
      cards={cards}
      selector={selector}
      placement="top"
      injectMobileIcons={injectMobileIcons}
      compact={true}
    />
  );
}
