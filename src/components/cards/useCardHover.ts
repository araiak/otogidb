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
  mobilePreviewRef: React.RefObject<HTMLDivElement>;
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
}: UseCardHoverOptions): UseCardHoverReturn {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: !!activeCard,
    placement,
    middleware: [offset(offsetDistance), flip(), shift({ padding: 10 })],
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

  // Attach hover listeners to elements matching selector
  useEffect(() => {
    const root = container || document;
    const elements = root.querySelectorAll<HTMLElement>(selector);
    const injectedIcons: HTMLButtonElement[] = [];

    // Track mobile click handlers for cleanup
    const mobileClickHandlers: Array<{ el: HTMLElement; handler: EventListener }> = [];

    elements.forEach(element => {
      // Desktop: hover listeners
      element.addEventListener('mouseenter', handleMouseEnter as EventListener);
      element.addEventListener('mouseleave', handleMouseLeave);

      // Mobile: tap to preview (intercept click on touch devices)
      const cardId = element.dataset.cardId;
      if (cardId && cards[cardId]) {
        const mobileClickHandler = (e: Event) => {
          // Only intercept on touch devices (no hover support)
          if (window.matchMedia('(hover: none)').matches) {
            e.preventDefault();
            setMobilePreviewCard(cards[cardId]);
          }
        };
        element.addEventListener('click', mobileClickHandler as EventListener);
        mobileClickHandlers.push({ el: element, handler: mobileClickHandler as EventListener });
      }

      // Mobile: inject view icon if enabled and not already present
      if (injectMobileIcons && !element.nextElementSibling?.classList.contains('card-ref-mobile-icon')) {
        if (cardId && cards[cardId]) {
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

    return () => {
      elements.forEach(element => {
        element.removeEventListener('mouseenter', handleMouseEnter as EventListener);
        element.removeEventListener('mouseleave', handleMouseLeave);
      });

      // Clean up mobile click handlers
      mobileClickHandlers.forEach(({ el, handler }) => {
        el.removeEventListener('click', handler);
      });

      // Clean up injected icons
      injectedIcons.forEach(icon => icon.remove());
    };
  }, [cards, selector, container, injectMobileIcons, handleMouseEnter, handleMouseLeave]);

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
