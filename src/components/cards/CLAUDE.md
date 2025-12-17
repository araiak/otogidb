# Card Hover System - AI Agent Guide

This guide explains how to add card hover popups to any component in the otogidb codebase.

## Overview

The card hover system provides consistent hover previews across the site:
- **Desktop**: Floating popup appears on mouse hover
- **Mobile**: Modal appears on tap (touch devices)

## Components

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| `CardPreviewContent` | Shared popup/modal content | Never used directly, used by other components |
| `CardHoverProvider` | Universal hover provider | When elements exist at render time |
| `CardFloatingPopup` | Manual hover control | When you manage hover state yourself (tables) |
| `useCardHover` | Hook for custom implementations | For dynamic elements created after render |

## Quick Start

### Option 1: Elements Exist at Render Time

Use `CardHoverProvider` when your card links are rendered in the initial HTML:

```tsx
import CardHoverProvider from '../cards/CardHoverProvider';

function MyComponent({ cards, skills }) {
  return (
    <>
      {/* Your card links with data-card-id */}
      <div className="card-grid">
        {Object.values(cards).map(card => (
          <a
            key={card.id}
            href={`/cards/${card.id}`}
            data-card-id={card.id}
          >
            {card.name}
          </a>
        ))}
      </div>

      {/* Add hover provider */}
      <CardHoverProvider
        cards={cards}
        skills={skills}
        selector="[data-card-id]"
        placement="top"
        compact={true}
      />
    </>
  );
}
```

### Option 2: Elements Created Dynamically (like FilteredCardsBlock)

When creating elements dynamically via DOM manipulation, manage hover state manually:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import CardPreviewContent from '../cards/CardPreviewContent';

function MyDynamicComponent({ cards, skills }) {
  // State for desktop hover popup
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

  // State for mobile modal
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

  // Floating UI setup
  const { refs, floatingStyles } = useFloating({
    open: !!activeCard,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: { reference: referenceElement },
  });

  // Event handlers
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
    if (window.matchMedia('(hover: none)').matches) {
      e.preventDefault();
      if (cards[cardId]) setMobilePreviewCard(cards[cardId]);
    }
  }, [cards]);

  // Create elements and attach listeners
  useEffect(() => {
    const eventListeners: Array<{ el: HTMLElement; type: string; handler: EventListener }> = [];

    // Create your dynamic elements
    const link = document.createElement('a');
    link.href = `/cards/${card.id}`;
    link.dataset.cardId = card.id;

    // Attach listeners directly when creating elements
    link.addEventListener('mouseenter', handleMouseEnter as EventListener);
    link.addEventListener('mouseleave', handleMouseLeave);
    eventListeners.push({ el: link, type: 'mouseenter', handler: handleMouseEnter as EventListener });
    eventListeners.push({ el: link, type: 'mouseleave', handler: handleMouseLeave });

    // Mobile tap handler
    const tapHandler = (e: Event) => handleMobileTap(card.id, e);
    link.addEventListener('click', tapHandler as EventListener);
    eventListeners.push({ el: link, type: 'click', handler: tapHandler as EventListener });

    // Cleanup
    return () => {
      eventListeners.forEach(({ el, type, handler }) => {
        el.removeEventListener(type, handler);
      });
    };
  }, [cards, handleMouseEnter, handleMouseLeave, handleMobileTap]);

  // Click outside to close mobile modal
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

  return (
    <>
      {/* Desktop floating popup */}
      {activeCard && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="popup z-50 max-w-md lg:max-w-lg xl:max-w-xl hidden md:block"
        >
          <CardPreviewContent card={activeCard} skills={skills} compact={true} />
        </div>
      )}

      {/* Mobile modal */}
      {mobilePreviewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 md:hidden">
          <div
            ref={mobilePreviewRef}
            className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold truncate">{mobilePreviewCard.name}</h3>
              <button onClick={() => setMobilePreviewCard(null)} className="p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <CardPreviewContent card={mobilePreviewCard} skills={skills} compact={false} showDetailsLink={true} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

### Option 3: Table Cells (like CardTable)

For table cells where you control hover state:

```tsx
import { CardFloatingPopup } from './CardHoverProvider';

function ImageCell({ card, skills }) {
  const [isHovered, setIsHovered] = useState(false);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

  return (
    <>
      <a
        ref={setReferenceElement}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        href={`/cards/${card.id}`}
      >
        <img src={card.imageUrl} alt={card.name} />
      </a>
      <CardFloatingPopup
        card={card}
        isOpen={isHovered}
        referenceElement={referenceElement}
        skills={skills}
        placement="right-start"
        compact={true}
      />
    </>
  );
}
```

## Props Reference

### CardPreviewContent

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `card` | `Card` | required | Card data to display |
| `skills` | `Record<string, any>` | `{}` | Skill data for description formatting |
| `compact` | `boolean` | `true` | Use smaller text and 4-column stats |
| `showDetailsLink` | `boolean` | `false` | Show "View Full Details" link |

### CardHoverProvider

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cards` | `Record<string, Card>` | required | Card data lookup by ID |
| `skills` | `Record<string, any>` | `{}` | Skill data for formatting |
| `selector` | `string` | `'[data-card-id]'` | CSS selector for hover elements |
| `placement` | `Placement` | `'top'` | Floating popup position |
| `offsetDistance` | `number` | `8` | Distance from element |
| `injectMobileIcons` | `boolean` | `false` | Add view icons for mobile |
| `compact` | `boolean` | `true` | Use compact styling |

### CardFloatingPopup

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `card` | `Card \| null` | required | Card to show |
| `isOpen` | `boolean` | required | Whether popup is visible |
| `referenceElement` | `HTMLElement \| null` | required | Element to position against |
| `skills` | `Record<string, any>` | `{}` | Skill data |
| `placement` | `Placement` | `'right-start'` | Popup position |
| `compact` | `boolean` | `true` | Use compact styling |

## Key Requirements

1. **data-card-id attribute**: Elements must have `data-card-id="123"` attribute
2. **Cards record**: Pass cards as `Record<string, Card>` keyed by card ID
3. **Skills optional**: Pass skills record for proper description formatting
4. **CSS classes**: Use `.popup` class for consistent styling (defined in global.css)

## Existing Implementations

| File | Pattern Used |
|------|--------------|
| `CardTable.tsx` | `CardFloatingPopup` for table cells |
| `FilteredCardsBlock.tsx` | Manual state + `CardPreviewContent` |
| `TeamBlock.tsx` | Manual state + `CardPreviewContent` |
| `CardReferencePopups.tsx` | `CardHoverProvider` wrapper |
| `CardPopups.tsx` | `CardHoverProvider` wrapper |
