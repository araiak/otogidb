import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate, type Placement } from '@floating-ui/react';
import type { Card } from '../../types/card';

export interface UseCardHoverOptions {
  /** Card data lookup */
  cards: Record<string, Card>;
  /** CSS selector for elements with data-card-id attribute */
  selector?: string;
  /** Floating popup placement */
  placement?: Placement;
  /** Offset from reference element */
  offsetDistance?: number;
  /** Whether to inject mobile preview icons */
  injectMobileIcons?: boolean;
  /** Custom container to search within (defaults to document) */
  container?: HTMLElement | null;
  /** Whether to update link text with localized card names */
  updateLinkText?: boolean;
}

export interface UseCardHoverReturn {
  /** Currently hovered card (desktop) */
  activeCard: Card | null;
  /** Reference element for floating positioning */
  referenceElement: HTMLElement | null;
  /** Card shown in mobile modal */
  mobilePreviewCard: Card | null;
  /** Close mobile modal */
  closeMobilePreview: () => void;
  /** Floating UI refs and styles */
  floating: {
    refs: ReturnType<typeof useFloating>['refs'];
    floatingStyles: ReturnType<typeof useFloating>['floatingStyles'];
  };
  /** Ref for mobile modal (for click-outside detection) */
  mobilePreviewRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Reusable hook for card hover functionality.
 * Handles desktop floating popups and mobile modals.
 */
export function useCardHover({
  cards,
  selector = '[data-card-id]',
  placement = 'top',
  offsetDistance = 8,
  injectMobileIcons = false,
  container = null,
  updateLinkText = false,
}: UseCardHoverOptions): UseCardHoverReturn {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: !!activeCard,
    placement,
    strategy: 'fixed', // Use fixed positioning to avoid layout shifts
    middleware: [offset(offsetDistance), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  });

  const closeMobilePreview = useCallback(() => {
    setMobilePreviewCard(null);
  }, []);

  // Handle click outside mobile preview to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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

  // Use event delegation for hover - handles dynamically added elements (e.g., expanding tiers)
  useEffect(() => {
    const root = container || document;

    // Event delegation: handle mouseover on the container, check if target matches selector
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(selector) as HTMLElement | null;
      if (target) {
        const cardId = target.dataset.cardId;
        if (cardId && cards[cardId]) {
          setActiveCard(cards[cardId]);
          setReferenceElement(target);
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(selector) as HTMLElement | null;
      const relatedTarget = (e.relatedTarget as HTMLElement | null)?.closest(selector);
      // Only hide if we're leaving a card element and not entering another
      if (target && !relatedTarget) {
        setActiveCard(null);
        setReferenceElement(null);
      }
    };

    // Mobile click handler with delegation
    const handleClick = (e: Event) => {
      if (!window.matchMedia('(hover: none)').matches) return;

      const target = (e.target as HTMLElement).closest(selector) as HTMLElement | null;
      if (target) {
        const cardId = target.dataset.cardId;
        if (cardId && cards[cardId]) {
          e.preventDefault();
          setMobilePreviewCard(cards[cardId]);
        }
      }
    };

    // Attach delegated listeners to root
    (root as HTMLElement).addEventListener('mouseover', handleMouseOver);
    (root as HTMLElement).addEventListener('mouseout', handleMouseOut);
    (root as HTMLElement).addEventListener('click', handleClick as EventListener);

    // Handle text updates and icon injection if needed
    const injectedIcons: HTMLButtonElement[] = [];
    const originalTexts: Map<HTMLElement, string> = new Map();

    if (updateLinkText || injectMobileIcons) {
      const elements = root.querySelectorAll<HTMLElement>(selector);
      elements.forEach(element => {
        const cardId = element.dataset.cardId;
        if (cardId && cards[cardId]) {
          if (updateLinkText) {
            const card = cards[cardId];
            const localizedName = card.name || `Card #${cardId}`;
            originalTexts.set(element, element.textContent || '');
            element.textContent = localizedName;
          }

          if (injectMobileIcons && !element.nextElementSibling?.classList.contains('card-ref-mobile-icon')) {
            const icon = document.createElement('button');
            icon.className = 'card-ref-mobile-icon';
            icon.setAttribute('aria-label', 'Preview card');
            icon.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            `;
            icon.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              setMobilePreviewCard(cards[cardId]);
            });
            element.insertAdjacentElement('afterend', icon);
            injectedIcons.push(icon);
          }
        }
      });
    }

    return () => {
      (root as HTMLElement).removeEventListener('mouseover', handleMouseOver);
      (root as HTMLElement).removeEventListener('mouseout', handleMouseOut);
      (root as HTMLElement).removeEventListener('click', handleClick as EventListener);

      injectedIcons.forEach(icon => icon.remove());
      originalTexts.forEach((text, el) => {
        el.textContent = text;
      });
    };
  }, [cards, selector, container, injectMobileIcons, updateLinkText]);

  return {
    activeCard,
    referenceElement,
    mobilePreviewCard,
    closeMobilePreview,
    floating: {
      refs,
      floatingStyles,
    },
    mobilePreviewRef,
  };
}

/**
 * Manual hover handler for use with individual elements.
 * Use this when you need more control over hover behavior.
 */
export function useCardHoverManual(cards: Record<string, Card>, placement: Placement = 'right-start') {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: !!activeCard,
    placement,
    strategy: 'fixed', // Use fixed positioning to avoid layout shifts
    middleware: [offset(10), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  });

  const showCard = useCallback((cardId: string, element: HTMLElement) => {
    if (cards[cardId]) {
      setActiveCard(cards[cardId]);
      setReferenceElement(element);
    }
  }, [cards]);

  const hideCard = useCallback(() => {
    setActiveCard(null);
    setReferenceElement(null);
  }, []);

  return {
    activeCard,
    showCard,
    hideCard,
    floating: {
      refs,
      floatingStyles,
    },
  };
}
