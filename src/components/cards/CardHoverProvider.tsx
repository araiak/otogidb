import type { Placement } from '@floating-ui/react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { useCardHover } from './useCardHover';
import CardPreviewContent from './CardPreviewContent';

interface CardHoverProviderProps {
  /** Card data lookup by ID */
  cards: Record<string, Card>;
  /** Skill data for formatting descriptions */
  skills?: Record<string, any>;
  /** CSS selector for elements with data-card-id attribute */
  selector?: string;
  /** Floating popup placement */
  placement?: Placement;
  /** Offset from reference element in pixels */
  offsetDistance?: number;
  /** Whether to inject mobile preview icons next to elements */
  injectMobileIcons?: boolean;
  /** Use compact styling (smaller text, 4-col stats) */
  compact?: boolean;
  /** Custom container to search within */
  container?: HTMLElement | null;
  /** Whether to update link text with localized card names */
  updateLinkText?: boolean;
}

/**
 * Universal card hover provider component.
 * Drop this anywhere to enable card preview popups on elements with data-card-id.
 *
 * Usage:
 * ```tsx
 * <CardHoverProvider
 *   cards={cardsRecord}
 *   selector="[data-card-id]"
 *   placement="top"
 * />
 * ```
 *
 * Then add data-card-id to any element:
 * ```html
 * <a href="/cards/123" data-card-id="123">Card Name</a>
 * ```
 */
export default function CardHoverProvider({
  cards,
  skills = {},
  selector = '[data-card-id]',
  placement = 'top',
  offsetDistance = 8,
  injectMobileIcons = false,
  compact = true,
  container = null,
  updateLinkText = false,
}: CardHoverProviderProps) {
  const {
    activeCard,
    mobilePreviewCard,
    closeMobilePreview,
    floating,
    mobilePreviewRef,
  } = useCardHover({
    cards,
    selector,
    placement,
    offsetDistance,
    injectMobileIcons,
    container,
    updateLinkText,
  });

  return (
    <>
      {/* Desktop floating popup - responsive sizing */}
      {activeCard && (
        <div
          ref={floating.refs.setFloating}
          style={floating.floatingStyles}
          className="popup z-50 max-w-md lg:max-w-lg xl:max-w-xl hidden md:block"
        >
          <CardPreviewContent
            card={activeCard}
            skills={skills}
            compact={compact}
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
                onClick={closeMobilePreview}
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
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Standalone floating popup component for manual hover control.
 * Use this when you need to manage hover state yourself (e.g., in tables).
 */
export function CardFloatingPopup({
  card,
  isOpen,
  referenceElement,
  skills = {},
  placement = 'right-start',
  compact = true,
}: {
  card: Card | null;
  isOpen: boolean;
  referenceElement: HTMLElement | null;
  skills?: Record<string, any>;
  placement?: Placement;
  compact?: boolean;
}) {
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement,
    strategy: 'fixed', // Use fixed positioning to avoid clipping from overflow containers
    middleware: [offset(10), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  });

  if (!isOpen || !referenceElement || !card) return null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="popup z-50 max-w-md lg:max-w-lg xl:max-w-xl"
    >
      <CardPreviewContent
        card={card}
        skills={skills}
        compact={compact}
      />
    </div>
  );
}
