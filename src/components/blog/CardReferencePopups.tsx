import { useState, useEffect, useCallback, useRef } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from '../cards/GameIcon';

interface CardReferencePopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
}

/**
 * Hydrates .card-ref links in blog content with hover popups.
 * Finds all links with class="card-ref" and data-card-id attributes,
 * then adds hover listeners to show card preview popups.
 * On mobile, injects view icons that open a modal preview.
 */
export default function CardReferencePopups({ cards, skills = {} }: CardReferencePopupsProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  const [mobilePreviewCard, setMobilePreviewCard] = useState<Card | null>(null);
  const mobilePreviewRef = useRef<HTMLDivElement>(null);

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
    // Find all card reference links
    const cardRefs = document.querySelectorAll<HTMLAnchorElement>('a.card-ref[data-card-id]');

    // Track injected icons for cleanup
    const injectedIcons: HTMLButtonElement[] = [];

    cardRefs.forEach(link => {
      // Desktop: hover listeners
      link.addEventListener('mouseenter', handleMouseEnter as EventListener);
      link.addEventListener('mouseleave', handleMouseLeave);

      // Mobile: inject view icon if not already present
      if (!link.nextElementSibling?.classList.contains('card-ref-mobile-icon')) {
        const cardId = link.dataset.cardId;
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

          // Insert icon after the link
          link.insertAdjacentElement('afterend', icon);
          injectedIcons.push(icon);
        }
      }
    });

    return () => {
      cardRefs.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter as EventListener);
        link.removeEventListener('mouseleave', handleMouseLeave);
      });

      // Clean up injected icons
      injectedIcons.forEach(icon => icon.remove());
    };
  }, [cards, handleMouseEnter, handleMouseLeave]);

  // Desktop floating popup
  const renderFloatingPopup = () => {
    if (!activeCard) return null;

    const imageUrl = getPopupImageUrl(activeCard);
    const skillData = activeCard.skill ? skills[activeCard.skill.id] : null;

    return (
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="popup z-50 max-w-md hidden md:block"
      >
        <div className="flex gap-3">
          {/* Card Image */}
          <div className="flex-shrink-0">
            <img
              src={imageUrl || PLACEHOLDER_IMAGE}
              alt={activeCard.name || `Card #${activeCard.id}`}
              className="w-28 h-auto rounded"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
              }}
            />
          </div>

          {/* Card Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base mb-1">{activeCard.name || `Card #${activeCard.id}`}</h3>

            <div className="flex items-center gap-2 mb-2">
              <AttributeIcon value={activeCard.stats.attribute_name} size="sm" />
              <TypeIcon value={activeCard.stats.type_name} size="sm" />
              <RarityStars value={activeCard.stats.rarity} size="sm" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 text-xs mb-2">
              <div>
                <span className="text-secondary">ATK:</span>{' '}
                <span className="font-mono">{formatNumber(activeCard.stats.max_atk)}</span>
              </div>
              <div>
                <span className="text-secondary">HP:</span>{' '}
                <span className="font-mono">{formatNumber(activeCard.stats.max_hp)}</span>
              </div>
              <div>
                <span className="text-secondary">SPD:</span>{' '}
                <span className="font-mono">{formatNumber(activeCard.stats.speed)}</span>
              </div>
              <div>
                <span className="text-secondary">CRIT:</span>{' '}
                <span className="font-mono">{formatNumber(activeCard.stats.crit)}</span>
              </div>
            </div>

            {/* Skill */}
            {activeCard.skill && (
              <div className="mb-2">
                <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                  Skill: {activeCard.skill.name || 'Unknown Skill'}
                </div>
                <div
                  className="text-xs text-secondary"
                  dangerouslySetInnerHTML={{
                    __html: formatSkillDescription(activeCard.skill.description, skillData, activeCard.stats.rarity) || 'No description'
                  }}
                />
              </div>
            )}

            {/* Abilities */}
            {activeCard.abilities && activeCard.abilities.length > 0 && (
              <div className="space-y-1">
                {activeCard.abilities.map((ability, idx) => (
                  <div key={ability.id || idx}>
                    <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                      Lv.{ability.unlock_level}: {ability.name || 'Unknown Ability'}
                    </div>
                    <div
                      className="text-xs text-secondary"
                      dangerouslySetInnerHTML={{
                        __html: formatSkillDescription(ability.description, null, activeCard.stats.rarity) || 'No description'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Mobile preview modal
  const renderMobileModal = () => {
    if (!mobilePreviewCard) return null;

    const imageUrl = getPopupImageUrl(mobilePreviewCard);
    const skillData = mobilePreviewCard.skill ? skills[mobilePreviewCard.skill.id] : null;

    return (
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
            {/* Card Image and Basic Info */}
            <div className="flex gap-4 mb-4">
              <img
                src={imageUrl || PLACEHOLDER_IMAGE}
                alt={mobilePreviewCard.name || `Card #${mobilePreviewCard.id}`}
                className="w-24 h-auto rounded flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                }}
              />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AttributeIcon value={mobilePreviewCard.stats.attribute_name} size="sm" />
                  <TypeIcon value={mobilePreviewCard.stats.type_name} size="sm" />
                  <RarityStars value={mobilePreviewCard.stats.rarity} size="sm" />
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <span className="text-secondary">ATK:</span>{' '}
                    <span className="font-mono">{formatNumber(mobilePreviewCard.stats.max_atk)}</span>
                  </div>
                  <div>
                    <span className="text-secondary">HP:</span>{' '}
                    <span className="font-mono">{formatNumber(mobilePreviewCard.stats.max_hp)}</span>
                  </div>
                  <div>
                    <span className="text-secondary">SPD:</span>{' '}
                    <span className="font-mono">{formatNumber(mobilePreviewCard.stats.speed)}</span>
                  </div>
                  <div>
                    <span className="text-secondary">CRIT:</span>{' '}
                    <span className="font-mono">{formatNumber(mobilePreviewCard.stats.crit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skill */}
            {mobilePreviewCard.skill && (
              <div className="mb-3">
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--color-accent)' }}>
                  Skill: {mobilePreviewCard.skill.name || 'Unknown Skill'}
                </div>
                <div
                  className="text-xs text-secondary line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: formatSkillDescription(mobilePreviewCard.skill.description, skillData, mobilePreviewCard.stats.rarity) || 'No description'
                  }}
                />
              </div>
            )}

            {/* Abilities */}
            {mobilePreviewCard.abilities && mobilePreviewCard.abilities.length > 0 && (
              <div className="mb-3 space-y-2">
                {mobilePreviewCard.abilities.map((ability, idx) => (
                  <div key={ability.id || idx}>
                    <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                      Lv.{ability.unlock_level}: {ability.name || 'Unknown Ability'}
                    </div>
                    <div
                      className="text-xs text-secondary"
                      dangerouslySetInnerHTML={{
                        __html: formatSkillDescription(ability.description, null, mobilePreviewCard.stats.rarity) || 'No description'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* View Full Details Link */}
            <a
              href={`/cards/${mobilePreviewCard.id}`}
              className="block w-full text-center py-2 px-4 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white'
              }}
            >
              View Full Details
            </a>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderFloatingPopup()}
      {renderMobileModal()}
    </>
  );
}
