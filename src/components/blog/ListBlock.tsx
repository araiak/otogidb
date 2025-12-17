import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback, getPlaceholderMascot } from '../../lib/images';
import CardPreviewContent from '../cards/CardPreviewContent';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../lib/i18n';

interface ListBlockProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
}

/**
 * ListBlock - Hydrates all .card-list-block containers
 * Renders a list of specific cards by ID with hover popups (desktop) and tap preview (mobile)
 *
 * Usage in markdown:
 *   :list[111,123,456]
 *
 * The cards will be displayed in the order specified.
 */
export default function ListBlock({ cards, skills = {} }: ListBlockProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const [locale, setLocale] = useState<SupportedLocale>('en');

  // Detect locale from URL on mount
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
    if (pathMatch && SUPPORTED_LOCALES.includes(pathMatch[1] as SupportedLocale)) {
      setLocale(pathMatch[1] as SupportedLocale);
    }
  }, []);

  const { refs, floatingStyles } = useFloating({
    open: !!activeCard,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  });

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.currentTarget as HTMLElement;
    const cardId = target.dataset.cardId;
    if (cardId && cards[cardId]) {
      setActiveCard(cards[cardId]);
      setReferenceElement(target);
    }
  }, [cards]);

  const handleMouseLeave = useCallback(() => {
    setActiveCard(null);
    setReferenceElement(null);
  }, []);

  const handleMobileTap = useCallback((cardId: string, e: Event) => {
    // Check if we're on mobile (no hover support)
    if (window.matchMedia('(hover: none)').matches) {
      e.preventDefault();
      if (cards[cardId]) {
        setMobilePreviewCard(cards[cardId]);
      }
    }
  }, [cards]);

  // Handle click outside mobile preview to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobilePreviewRef.current && !mobilePreviewRef.current.contains(e.target as Node)) {
        setMobilePreviewCard(null);
      }
    };

    if (mobilePreviewCard) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside as EventListener);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [mobilePreviewCard]);

  useEffect(() => {
    // Find all list block containers
    const containers = document.querySelectorAll<HTMLElement>('.card-list-block');
    if (containers.length === 0) return;

    // Track created elements for cleanup
    const eventListeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];

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

        // Desktop: hover listeners
        link.addEventListener('mouseenter', handleMouseEnter as EventListener);
        link.addEventListener('mouseleave', handleMouseLeave);
        eventListeners.push({ el: link, type: 'mouseenter', handler: handleMouseEnter as EventListener });
        eventListeners.push({ el: link, type: 'mouseleave', handler: handleMouseLeave });

        // Mobile: tap to preview
        const tapHandler = (e: Event) => handleMobileTap(card.id, e);
        link.addEventListener('click', tapHandler as EventListener);
        eventListeners.push({ el: link, type: 'click', handler: tapHandler as EventListener });
      });
    });

    return () => {
      // Cleanup event listeners
      eventListeners.forEach(({ el, type, handler }) => {
        el.removeEventListener(type, handler);
      });
    };
  }, [cards, locale, handleMouseEnter, handleMouseLeave, handleMobileTap]);

  return (
    <>
      {/* Desktop floating popup */}
      {activeCard && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="popup z-50 max-w-md lg:max-w-lg xl:max-w-xl hidden md:block"
        >
          <CardPreviewContent
            card={activeCard}
            skills={skills}
            compact={true}
            locale={locale}
          />
        </div>
      )}

      {/* Mobile preview modal */}
      {mobilePreviewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:hidden">
          <div
            ref={mobilePreviewRef}
            className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h3 className="font-bold text-base truncate pr-2">
                {mobilePreviewCard.name || `Card #${mobilePreviewCard.id}`}
              </h3>
              <button
                onClick={() => setMobilePreviewCard(null)}
                className="p-1 rounded-full hover:bg-gray-500/20 flex-shrink-0"
                aria-label="Close preview"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <CardPreviewContent
                card={mobilePreviewCard}
                skills={skills}
                compact={false}
                showDetailsLink={true}
                locale={locale}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
