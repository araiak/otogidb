import { useState, useEffect } from 'react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback, getPlaceholderMascot } from '../../lib/images';
import CardHoverProvider from '../cards/CardHoverProvider';
import { getLocaleFromUrl, type SupportedLocale } from '../../lib/i18n';
import { getCardsData, type CardLocale } from '../../lib/cards';

/**
 * ListBlock - Hydrates all .card-list-block containers
 * Renders a list of specific cards by ID with hover popups (desktop) and tap preview (mobile)
 * Self-fetches card data via the shared IndexedDB cache — no prop needed.
 *
 * Usage in markdown:
 *   :list[111,123,456]
 *
 * The cards will be displayed in the order specified.
 */
export default function ListBlock() {
  const [locale] = useState<SupportedLocale>(getLocaleFromUrl);
  const [cards, setCards] = useState<Record<string, Card>>({});
  // Counter to trigger CardHoverProvider re-scan after DOM hydration
  const [hydrationKey, setHydrationKey] = useState(0);

  useEffect(() => {
    const loc = getLocaleFromUrl() as CardLocale;
    getCardsData({ locale: loc })
      .then((result) => setCards(result.cards))
      .catch(err => console.error('[ListBlock] Failed to load card data:', err));
  }, []);

  useEffect(() => {
    // Wait until card data is loaded before processing containers
    if (Object.keys(cards).length === 0) return;

    // Find all list block containers
    const containers = document.querySelectorAll<HTMLElement>('.card-list-block');
    if (containers.length === 0) return;

    let hydrated = false;

    containers.forEach((container) => {
      // Skip if already hydrated
      if (container.dataset.hydrated === 'true') return;
      container.dataset.hydrated = 'true';

      const cardIds = container.dataset.cardIds;
      if (!cardIds) return;

      // Parse comma-separated card IDs and look them up
      const ids = cardIds.split(',').map(id => id.trim()).filter(Boolean);
      const cardList: Card[] = [];

      for (const id of ids) {
        const card = cards[id];
        if (card) {
          cardList.push(card);
        }
      }

      // Add styling to container
      container.className = 'card-list-block my-6 p-4 rounded-lg border';
      container.style.borderColor = 'var(--color-border)';
      container.style.backgroundColor = 'var(--color-surface)';

      // Create count label
      const countLabel = document.createElement('div');
      countLabel.className = 'text-xs text-secondary mb-3';
      const missingCount = ids.length - cardList.length;
      if (missingCount > 0) {
        countLabel.textContent = `${cardList.length} card${cardList.length !== 1 ? 's' : ''} (${missingCount} not found)`;
      } else {
        countLabel.textContent = `${cardList.length} card${cardList.length !== 1 ? 's' : ''}`;
      }
      container.appendChild(countLabel);

      if (cardList.length === 0) {
        // Empty state
        container.className = 'card-list-block my-4 p-3 rounded-lg border opacity-60';
        container.style.borderColor = 'var(--color-border)';
        container.style.backgroundColor = 'var(--color-surface)';

        const empty = document.createElement('div');
        empty.className = 'text-sm text-secondary';
        empty.textContent = 'No cards found';

        container.innerHTML = '';
        container.appendChild(empty);
        return;
      }

      // Create grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2';
      container.appendChild(grid);

      // Add cards to grid (in specified order)
      cardList.forEach(card => {
        const link = document.createElement('a');
        link.href = `/${locale}/cards/${card.id}`;
        link.className = 'list-card text-center group';
        link.dataset.cardId = card.id;

        const img = document.createElement('img');
        img.src = getAndroidImageWithFallback(card);
        img.alt = card.name || `Card #${card.id}`;
        img.className = 'w-12 h-12 rounded-full mx-auto border-2 border-transparent group-hover:border-accent transition-colors';
        img.loading = 'lazy';
        img.onerror = () => { img.src = getPlaceholderMascot(); };
        link.appendChild(img);

        const name = document.createElement('div');
        name.className = 'text-[9px] truncate mt-1 text-secondary group-hover:text-primary transition-colors';
        name.textContent = card.name || `#${card.id}`;
        link.appendChild(name);

        grid.appendChild(link);
      });

      hydrated = true;
    });

    // Trigger CardHoverProvider to re-scan for new elements
    if (hydrated) {
      setHydrationKey(k => k + 1);
    }
  }, [cards, locale]);

  // Use shared CardHoverProvider for hover/tap functionality
  return (
    <CardHoverProvider
      key={hydrationKey}
      cards={cards}
      selector=".list-card[data-card-id]"
      placement="top"
      compact={true}
    />
  );
}
