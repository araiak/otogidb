import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getAndroidImageWithFallback, getPlaceholderMascot } from '../../lib/images';
import CardPreviewContent from '../cards/CardPreviewContent';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../lib/i18n';

interface FilteredCardsBlockProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
}

interface ParsedFilters {
  q?: string;
  ability?: string[];
  skill?: string[];
  attribute?: string[];
  type?: string[];
  rarity?: number[];
  bond?: string[];
  source?: string[];
  playable?: boolean;
  available?: boolean;
}

/**
 * Parse a filter query string into structured filters
 * Supports all filters from /cards page: q, attr, type, rarity, bond, skill, ability, source, available, npc
 */
function parseFilterQuery(query: string): ParsedFilters {
  const filters: ParsedFilters = {};

  // Decode HTML entities (escapeHtml converts & to &amp; which breaks URLSearchParams)
  const decoded = query
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  // Handle query with or without leading ?
  const queryString = decoded.startsWith('?') ? decoded.slice(1) : decoded;
  const params = new URLSearchParams(queryString);

  // Search query (text search on name)
  const q = params.get('q');
  if (q) {
    filters.q = q.trim();
  }

  // Ability tags (comma-separated, must all exist on ONE ability)
  const ability = params.get('ability');
  if (ability) {
    filters.ability = ability.split(',').map(s => s.trim());
  }

  // Skill tags (comma-separated, must all exist on the card's skill)
  const skill = params.get('skill');
  if (skill) {
    filters.skill = skill.split(',').map(s => s.trim());
  }

  // Attribute (comma-separated) - support both 'attr' (CardTable format) and 'attribute'
  const attribute = params.get('attr') || params.get('attribute');
  if (attribute) {
    filters.attribute = attribute.split(',').map(s => s.trim().toLowerCase());
  }

  // Type (comma-separated)
  const type = params.get('type');
  if (type) {
    filters.type = type.split(',').map(s => s.trim().toLowerCase());
  }

  // Rarity (comma-separated numbers)
  const rarity = params.get('rarity');
  if (rarity) {
    filters.rarity = rarity.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  }

  // Source (comma-separated: gacha, event, exchange, auction, daily)
  const source = params.get('source');
  if (source) {
    filters.source = source.split(',').map(s => s.trim().toLowerCase());
  }

  // Bond type (comma-separated: Attack, Skill, HP)
  const bond = params.get('bond');
  if (bond) {
    filters.bond = bond.split(',').map(s => s.trim());
  }

  // Playable - support both 'playable=true' and 'npc=1' (inverse)
  const playable = params.get('playable');
  const npc = params.get('npc');
  if (playable !== null) {
    filters.playable = playable.toLowerCase() === 'true';
  } else if (npc !== null) {
    // npc=1 means show NPCs, so playable should be undefined (show all)
    // Default behavior (no npc param) hides NPCs, so set playable to true
    filters.playable = npc !== '1';
  } else {
    // Default: hide NPC cards
    filters.playable = true;
  }

  // Available now (true/false or '1')
  const available = params.get('available');
  if (available !== null) {
    filters.available = available.toLowerCase() === 'true' || available === '1';
  }

  return filters;
}

/**
 * Check if a card matches the parsed filters
 */
function matchesFilters(card: Card, filters: ParsedFilters): boolean {
  // Search query (case-insensitive name search)
  if (filters.q) {
    const searchTerm = filters.q.toLowerCase();
    const name = (card.name || '').toLowerCase();
    if (!name.includes(searchTerm)) return false;
  }

  // Ability tags: ANY single ability must have ALL selected tags
  if (filters.ability && filters.ability.length > 0) {
    const abilities = card.abilities || [];
    if (abilities.length === 0) return false;
    const hasMatchingAbility = abilities.some(ability => {
      const tags = ability.tags || [];
      return filters.ability!.every(f => tags.includes(f));
    });
    if (!hasMatchingAbility) return false;
  }

  // Skill tags: card's skill must have ALL selected tags
  if (filters.skill && filters.skill.length > 0) {
    const skillTags = card.skill?.tags || [];
    if (skillTags.length === 0) return false;
    const hasAllSkillTags = filters.skill.every(f => skillTags.includes(f));
    if (!hasAllSkillTags) return false;
  }

  // Attribute filter
  if (filters.attribute && filters.attribute.length > 0) {
    const cardAttr = card.stats.attribute_name.toLowerCase();
    if (!filters.attribute.includes(cardAttr)) return false;
  }

  // Type filter
  if (filters.type && filters.type.length > 0) {
    const cardType = card.stats.type_name.toLowerCase();
    if (!filters.type.includes(cardType)) return false;
  }

  // Rarity filter
  if (filters.rarity && filters.rarity.length > 0) {
    if (!filters.rarity.includes(card.stats.rarity)) return false;
  }

  // Source filter
  if (filters.source && filters.source.length > 0) {
    const cardSources = card.acquisition?.sources || [];
    const sourceMap: Record<string, boolean> = {
      standard: card.acquisition?.gacha?.in_standard_pool || false,
      gacha: cardSources.includes('gacha'),
      event: cardSources.includes('event'),
      exchange: cardSources.includes('exchange'),
      auction: cardSources.includes('auction'),
      daily: cardSources.includes('daily'),
    };
    // Card must match at least one selected source
    const hasMatchingSource = filters.source.some(s => sourceMap[s]);
    if (!hasMatchingSource) return false;
  }

  // Bond type filter
  if (filters.bond && filters.bond.length > 0) {
    const bonds = card.bonds || [];
    if (bonds.length === 0) return false;
    // Check if any of the card's bond types match the filter
    const hasMatchingBond = bonds.some(bond => filters.bond!.includes(bond.type));
    if (!hasMatchingBond) return false;
  }

  // Playable filter
  if (filters.playable !== undefined) {
    if (card.playable !== filters.playable) return false;
  }

  // Available now filter
  if (filters.available !== undefined) {
    const isAvailable = card.acquisition?.currently_available || false;
    if (isAvailable !== filters.available) return false;
  }

  return true;
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
 * FilteredCardsBlock - Hydrates all .filtered-cards-block containers
 * Renders matching cards as a grid with hover popups (desktop) and tap preview (mobile)
 */
export default function FilteredCardsBlock({ cards, skills = {} }: FilteredCardsBlockProps) {
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
    // Find all filter block containers
    const containers = document.querySelectorAll<HTMLElement>('.filtered-cards-block');
    if (containers.length === 0) return;

    // Track created elements for cleanup
    const eventListeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];

    containers.forEach((container) => {
      // Skip if already hydrated
      if (container.dataset.hydrated === 'true') return;
      container.dataset.hydrated = 'true';

      const query = container.dataset.filterQuery;
      if (!query) return;

      // Parse filters and get matching cards
      const filters = parseFilterQuery(query);
      const allCards = Object.values(cards);
      const matching = allCards.filter(card => matchesFilters(card, filters));
      matching.sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));

      // Add styling to container
      container.className = 'filtered-cards-block my-6 p-4 rounded-lg border';
      container.style.borderColor = 'var(--color-border)';
      container.style.backgroundColor = 'var(--color-surface)';

      // Create count label
      const countLabel = document.createElement('div');
      countLabel.className = 'text-xs text-secondary mb-3';
      countLabel.textContent = `${matching.length} card${matching.length !== 1 ? 's' : ''} matching filter`;
      container.appendChild(countLabel);

      if (matching.length === 0) {
        // Make empty state more compact with link to try on cards page
        container.className = 'filtered-cards-block my-4 p-3 rounded-lg border opacity-60';
        container.style.borderColor = 'var(--color-border)';
        container.style.backgroundColor = 'var(--color-surface)';

        const empty = document.createElement('div');
        empty.className = 'text-sm text-secondary flex items-center justify-between';

        const text = document.createElement('span');
        text.textContent = 'No cards match this filter';
        empty.appendChild(text);

        // Decode query for the link (reverse the escapeHtml)
        const decodedQuery = query
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'");

        const link = document.createElement('a');
        link.href = `/${locale}/cards${decodedQuery}`;
        link.className = 'text-xs hover:underline';
        link.style.color = 'var(--color-accent)';
        link.textContent = 'Try on Cards page →';
        empty.appendChild(link);

        container.innerHTML = '';
        container.appendChild(empty);
        return;
      }

      // Create grid
      const grid = document.createElement('div');
      grid.className = 'grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2';
      container.appendChild(grid);

      // Add cards to grid
      matching.forEach(card => {
        const link = document.createElement('a');
        link.href = `/${locale}/cards/${card.id}`;
        link.className = 'filter-result-card text-center group';
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

        // Desktop: hover listeners - attach directly when creating elements
        link.addEventListener('mouseenter', handleMouseEnter as EventListener);
        link.addEventListener('mouseleave', handleMouseLeave);
        eventListeners.push({ el: link, type: 'mouseenter', handler: handleMouseEnter as EventListener });
        eventListeners.push({ el: link, type: 'mouseleave', handler: handleMouseLeave });

        // Mobile: tap to preview (intercept click on touch devices)
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
