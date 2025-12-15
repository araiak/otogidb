import { useState, useEffect, useCallback } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';

interface CardPopupsProps {
  cards: Record<string, Card>;
  skills?: Record<string, any>;
  /** CSS selector for elements that trigger popups (must have data-card-id attribute) */
  selector?: string;
}

/**
 * Adds hover popups to elements with data-card-id attributes.
 * Works with both blog card references and synergy card grids.
 */
export default function CardPopups({
  cards,
  skills = {},
  selector = '[data-card-id]'
}: CardPopupsProps) {
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
    // Find all elements matching the selector
    const elements = document.querySelectorAll<HTMLElement>(selector);

    elements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnter as EventListener);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      elements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnter as EventListener);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, [selector, handleMouseEnter, handleMouseLeave]);

  if (!activeCard) return null;

  const imageUrl = getPopupImageUrl(activeCard);
  const skillData = activeCard.skill ? skills[activeCard.skill.id] : null;

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="popup z-50 max-w-md"
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
}
