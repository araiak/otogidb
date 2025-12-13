import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import type { Card } from '../../types/card';
import { getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription, type SkillData } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';

interface CardPopupProps {
  card: Card;
  isOpen: boolean;
  referenceElement: HTMLElement | null;
  skillData?: SkillData | null;
}

export default function CardPopup({ card, isOpen, referenceElement, skillData }: CardPopupProps) {
  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'right-start',
    middleware: [offset(10), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
    elements: {
      reference: referenceElement,
    },
  });

  if (!isOpen || !referenceElement) return null;

  const imageUrl = getPopupImageUrl(card);

  return (
    <div
      ref={refs.setFloating}
      style={floatingStyles}
      className="popup z-50"
    >
      <div className="flex gap-4">
        {/* Card Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl || PLACEHOLDER_IMAGE}
            alt={card.name || `Card #${card.id}`}
            className="w-32 h-auto rounded"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>

        {/* Card Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1">{card.name || `Card #${card.id}`}</h3>

          <div className="flex items-center gap-2 mb-2">
            <AttributeIcon value={card.stats.attribute_name} size="md" />
            <TypeIcon value={card.stats.type_name} size="md" />
            <RarityStars value={card.stats.rarity} size="sm" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
            <div>
              <span className="text-secondary">ATK:</span>{' '}
              <span className="font-mono">{formatNumber(card.stats.max_atk)}</span>
            </div>
            <div>
              <span className="text-secondary">HP:</span>{' '}
              <span className="font-mono">{formatNumber(card.stats.max_hp)}</span>
            </div>
            <div>
              <span className="text-secondary">SPD:</span>{' '}
              <span className="font-mono">{formatNumber(card.stats.speed)}</span>
            </div>
            <div>
              <span className="text-secondary">CRIT:</span>{' '}
              <span className="font-mono">{formatNumber(card.stats.crit)}</span>
            </div>
          </div>

          {/* Skill */}
          {card.skill && (
            <div className="mb-2">
              <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                {card.skill.name || 'Unknown Skill'}
              </div>
              <div
                className="text-sm text-secondary line-clamp-2"
                dangerouslySetInnerHTML={{
                  __html: formatSkillDescription(card.skill.description, skillData, card.stats.rarity) || 'No description'
                }}
              />
            </div>
          )}

          {/* Abilities Preview */}
          {card.abilities && card.abilities.length > 0 && (
            <div className="text-sm">
              <span className="text-secondary">Abilities:</span>{' '}
              {card.abilities.map(a => a.name).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
