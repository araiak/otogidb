import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback, getPlaceholderMascot } from '../../lib/images';
import CardPreviewContent from '../cards/CardPreviewContent';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../lib/i18n';

interface TeamBlockProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
}

interface TeamMember {
  cardId: string;
  required: boolean;
}

/**
 * Parse a team query string into structured team data
 * Format: req=id1,id2&opt=id3,id4
 */
function parseTeamQuery(query: string): TeamMember[] {
  if (!query) return [];

  const members: TeamMember[] = [];

  // Decode HTML entities
  const decoded = query
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  const params = new URLSearchParams(decoded);

  // Required cards
  const reqIds = params.get('req');
  if (reqIds) {
    reqIds.split(',').forEach(id => {
      const trimmedId = id.trim();
      if (trimmedId) {
        members.push({ cardId: trimmedId, required: true });
      }
    });
  }

  // Optional cards
  const optIds = params.get('opt');
  if (optIds) {
    optIds.split(',').forEach(id => {
      const trimmedId = id.trim();
      if (trimmedId) {
        members.push({ cardId: trimmedId, required: false });
      }
    });
  }

  return members;
}

// Get locale from URL synchronously (avoids useEffect timing issues)
function getLocaleFromUrl(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';
  const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  if (pathMatch && SUPPORTED_LOCALES.includes(pathMatch[1] as SupportedLocale)) {
    return pathMatch[1] as SupportedLocale;
  }
  return 'en';
}

/**
 * TeamBlock - Hydrates all .team-block containers
 * Renders team compositions with required/optional markers and hover popups
 */
export default function TeamBlock({ cards, skills = {} }: TeamBlockProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);
  const [locale] = useState<SupportedLocale>(getLocaleFromUrl);

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
    // Find all team block containers
    const containers = document.querySelectorAll<HTMLElement>('.team-block');
    if (containers.length === 0) return;

    // Track created elements for cleanup
    const eventListeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];

    containers.forEach((container) => {
      // Skip if already hydrated
      if (container.dataset.hydrated === 'true') return;
      container.dataset.hydrated = 'true';

      const mainQuery = container.dataset.teamMain;
      const reserveQuery = container.dataset.teamReserve;

      if (!mainQuery) return;

      const mainMembers = parseTeamQuery(mainQuery);
      const reserveMembers = reserveQuery ? parseTeamQuery(reserveQuery) : [];

      // Style container
      container.className = 'team-block my-6 p-4 rounded-lg border';
      container.style.borderColor = 'var(--color-border)';
      container.style.backgroundColor = 'var(--color-surface)';

      // Helper to create a team section
      const createTeamSection = (title: string, members: TeamMember[], isReserve: boolean) => {
        if (members.length === 0) return null;

        const section = document.createElement('div');
        section.className = isReserve ? 'mt-4 pt-4 border-t' : '';
        if (isReserve) {
          section.style.borderColor = 'var(--color-border)';
        }

        // Section title
        const titleEl = document.createElement('div');
        titleEl.className = 'text-sm font-medium mb-3 flex items-center gap-2';
        titleEl.innerHTML = `
          <span>${title}</span>
          <span class="text-xs text-secondary">(${members.length} card${members.length !== 1 ? 's' : ''})</span>
        `;
        section.appendChild(titleEl);

        // Cards grid
        const grid = document.createElement('div');
        grid.className = 'flex flex-wrap gap-3';
        section.appendChild(grid);

        members.forEach(member => {
          const card = cards[member.cardId];
          if (!card) {
            // Card not found - show placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'text-center opacity-50';
            placeholder.innerHTML = `
              <div class="w-14 h-14 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto">
                <span class="text-xs">?</span>
              </div>
              <div class="text-[10px] mt-1 text-secondary">#${member.cardId}</div>
            `;
            grid.appendChild(placeholder);
            return;
          }

          // Card link wrapper
          const link = document.createElement('a');
          link.href = `/${locale}/cards/${card.id}`;
          link.className = 'team-member-card text-center group relative';
          link.dataset.cardId = card.id;

          // Image container (for badge positioning)
          const imgContainer = document.createElement('div');
          imgContainer.className = 'relative inline-block';

          // Card image
          const img = document.createElement('img');
          img.src = getAndroidImageWithFallback(card);
          img.alt = card.name || `Card #${card.id}`;
          img.className = `w-14 h-14 rounded-full mx-auto border-2 transition-colors ${
            member.required
              ? 'border-yellow-500 group-hover:border-yellow-400'
              : 'border-transparent group-hover:border-accent'
          }`;
          img.loading = 'lazy';
          img.onerror = () => { img.src = getPlaceholderMascot(); };
          imgContainer.appendChild(img);

          // Required badge
          if (member.required) {
            const badge = document.createElement('div');
            badge.className = 'absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center';
            badge.innerHTML = `
              <svg class="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            `;
            badge.title = 'Required';
            imgContainer.appendChild(badge);
          }

          link.appendChild(imgContainer);

          // Card name
          const name = document.createElement('div');
          name.className = 'text-[10px] truncate mt-1 text-secondary group-hover:text-primary transition-colors max-w-[60px]';
          name.textContent = card.name || `#${card.id}`;
          link.appendChild(name);

          grid.appendChild(link);

          // Desktop: hover listeners - attach directly when creating elements
          link.addEventListener('mouseenter', handleMouseEnter as EventListener);
          link.addEventListener('mouseleave', handleMouseLeave);
          eventListeners.push({ el: link, type: 'mouseenter', handler: handleMouseEnter as EventListener });
          eventListeners.push({ el: link, type: 'mouseleave', handler: handleMouseLeave });

          // Mobile: tap to preview
          const tapHandler = (e: Event) => handleMobileTap(card.id, e);
          link.addEventListener('click', tapHandler as EventListener);
          eventListeners.push({ el: link, type: 'click', handler: tapHandler as EventListener });
        });

        return section;
      };

      // Create main team section
      const mainSection = createTeamSection('Main Team', mainMembers, false);
      if (mainSection) {
        container.appendChild(mainSection);
      }

      // Create reserve section
      const reserveSection = createTeamSection('Reserve', reserveMembers, true);
      if (reserveSection) {
        container.appendChild(reserveSection);
      }

      // Add legend
      const legend = document.createElement('div');
      legend.className = 'mt-4 pt-3 border-t text-xs text-secondary flex items-center gap-4';
      legend.style.borderColor = 'var(--color-border)';
      legend.innerHTML = `
        <span class="flex items-center gap-1">
          <span class="w-3 h-3 rounded-full bg-yellow-500 inline-flex items-center justify-center">
            <svg class="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </span>
          Required
        </span>
        <span>Click/tap card to preview</span>
      `;
      container.appendChild(legend);
    });

    return () => {
      // Cleanup event listeners
      eventListeners.forEach(({ el, type, handler }) => {
        el.removeEventListener(type, handler);
      });
    };
  }, [cards, handleMouseEnter, handleMouseLeave, handleMobileTap]);

  return (
    <>
      {/* Desktop floating popup - using unified CardPreviewContent */}
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

            {/* Content - using unified CardPreviewContent */}
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
