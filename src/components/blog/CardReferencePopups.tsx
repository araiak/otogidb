import { useState, useEffect, useCallback } from 'react';
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
 */
export default function CardReferencePopups({ cards, skills = {} }: CardReferencePopupsProps) {
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);

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

  useEffect(() => {
    // Find all card reference links
    const cardRefs = document.querySelectorAll<HTMLAnchorElement>('a.card-ref[data-card-id]');

    cardRefs.forEach(link => {
      link.addEventListener('mouseenter', handleMouseEnter as EventListener);
      link.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      cardRefs.forEach(link => {
        link.removeEventListener('mouseenter', handleMouseEnter as EventListener);
        link.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [handleMouseEnter, handleMouseLeave]);

  if (!activeCard) return null;

  const imageUrl = getPopupImageUrl(activeCard);
  const skillData = activeCard.skill ? skills[activeCard.skill.id] : null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="popup z-50"
    >
      <div className="flex gap-3">
        {/* Card Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl || PLACEHOLDER_IMAGE}
            alt={activeCard.name || `Card #${activeCard.id}`}
            className="w-24 h-auto rounded"
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs mb-2">
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
            <div>
              <div className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                {activeCard.skill.name || 'Unknown Skill'}
              </div>
              <div
                className="text-xs text-secondary line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: formatSkillDescription(activeCard.skill.description, skillData, activeCard.stats.rarity) || 'No description'
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
