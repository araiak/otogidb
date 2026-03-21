import { useState } from 'react';
import type { Card } from '../../types/card';
import { getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription, formatDescription } from '../../lib/formatters';
import { computeMlbStats, substituteSkillTemplate } from '../../lib/lb';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';
import type { SupportedLocale } from '../../lib/i18n';

const LB_MODE_KEY = 'otogidb-lb-mode';

interface CardPreviewContentProps {
  card: Card;
  skills?: Record<string, any>;
  /** Compact mode uses smaller text and 4-column stats */
  compact?: boolean;
  /** Show "View Full Details" link at bottom */
  showDetailsLink?: boolean;
  /** Locale for URL generation (defaults to 'en') */
  locale?: SupportedLocale;
}

/**
 * Shared card preview content used in floating popups and mobile modals.
 * Single source of truth for card preview UI across the app.
 *
 * Reads the LB0/MLB toggle from localStorage on mount so the popup always
 * reflects the user's current table setting (the popup remounts on each hover).
 *
 * Uses responsive sizing that scales up on larger screens.
 */
export default function CardPreviewContent({
  card,
  skills = {},
  compact = true,
  showDetailsLink = false,
  locale = 'en',
}: CardPreviewContentProps) {
  // Lazy initializer: reads localStorage synchronously so there's no flash.
  // The popup remounts on each hover, so this always reflects the current toggle state.
  const [isMLB] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LB_MODE_KEY) !== 'lb0';
    } catch {
      return true; // default: MLB
    }
  });

  const imageUrl = getPopupImageUrl(card);
  const skillData = card.skill ? skills[card.skill.id] : null;
  const mlbStats = computeMlbStats(card.stats);

  // Which ATK/HP values to show
  const displayAtk = isMLB && mlbStats ? mlbStats.mlb_atk : card.stats.max_atk;
  const displayHp  = isMLB && mlbStats ? mlbStats.mlb_hp  : card.stats.max_hp;

  // Responsive sizes that scale up on larger screens
  // compact: smaller base, scales up on lg/xl
  // non-compact: larger base for mobile modals
  const nameSize = compact
    ? 'text-base lg:text-lg xl:text-xl'
    : 'text-lg';
  const contentSize = compact
    ? 'text-xs lg:text-sm'
    : 'text-sm';
  const imageWidth = compact
    ? 'w-28 lg:w-32 xl:w-36'
    : 'w-32';
  const iconSize = compact ? 'sm' : 'md';
  const statsGridCols = compact
    ? 'grid-cols-4 gap-x-2 lg:gap-x-3'
    : 'grid-cols-2 gap-x-4';
  const gap = compact ? 'gap-3 lg:gap-4' : 'gap-3';

  // Build skill description for the active LB mode
  const skillDescription = (() => {
    const skill = card.skill;
    if (!skill) return null;
    // Index cards: raw template + pre-computed LB0/MLB values
    if (!skillData && skill.slv_mlb !== undefined) {
      const vals = isMLB
        ? { value: skill.slv_mlb,  probability: skill.prob_mlb,  delay1: skill.delay_mlb  }
        : { value: skill.slv_lb0,  probability: skill.prob_lb0,  delay1: skill.delay_lb0  };
      return formatDescription(substituteSkillTemplate(skill.description, vals)) || 'No description';
    }
    // Full card data: use skillData with formatSkillDescription (MLB by default)
    return formatSkillDescription(skill.description, skillData, card.stats.rarity) || 'No description';
  })();

  return (
    <div className={`flex ${gap}`}>
      {/* Card Image */}
      <div className="flex-shrink-0">
        <img
          src={imageUrl || PLACEHOLDER_IMAGE}
          alt={card.name || `Card #${card.id}`}
          className={`${imageWidth} h-auto rounded`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
          }}
        />
      </div>

      {/* Card Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-bold ${nameSize} truncate`}>
            {card.name || `Card #${card.id}`}
          </h3>
          {mlbStats && (
            <span
              className="text-xs ml-2 flex-shrink-0 px-1 rounded"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white', fontSize: '0.65rem' }}
            >
              {isMLB ? 'MLB' : 'LB0'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-2">
          <AttributeIcon value={card.stats.attribute_name} size={iconSize as 'sm' | 'md'} />
          <TypeIcon value={card.stats.type_name} size={iconSize as 'sm' | 'md'} />
          <RarityStars value={card.stats.rarity} size="sm" />
        </div>

        {/* Stats Grid */}
        <div className={`grid ${statsGridCols} gap-y-0.5 lg:gap-y-1 ${contentSize} mb-2`}>
          <div>
            <span className="text-secondary">ATK:</span>{' '}
            <span className="font-mono">{formatNumber(displayAtk)}</span>
          </div>
          <div>
            <span className="text-secondary">HP:</span>{' '}
            <span className="font-mono">{formatNumber(displayHp)}</span>
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
        {card.skill && skillDescription && (
          <div className="mb-2">
            <div className={`${contentSize} font-medium`} style={{ color: 'var(--color-accent)' }}>
              Skill: {card.skill.name || 'Unknown Skill'}
            </div>
            <div
              className={`${contentSize} text-secondary`}
              dangerouslySetInnerHTML={{ __html: skillDescription }}
            />
          </div>
        )}

        {/* Abilities */}
        {card.abilities && card.abilities.length > 0 && (
          <div className="space-y-1 lg:space-y-1.5">
            {card.abilities.map((ability, idx) => (
              <div key={ability.id || idx}>
                <div className={`${contentSize} font-medium`} style={{ color: 'var(--color-accent)' }}>
                  Lv.{ability.unlock_level}: {ability.name || 'Unknown Ability'}
                </div>
                <div
                  className={`${contentSize} text-secondary`}
                  dangerouslySetInnerHTML={{
                    __html: formatSkillDescription(ability.description, null, card.stats.rarity) || 'No description'
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* View Full Details Link */}
        {showDetailsLink && (
          <a
            href={`/${locale}/cards/${card.id}`}
            className={`block w-full text-center py-2 px-4 rounded ${contentSize} font-medium transition-colors mt-3`}
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'white'
            }}
          >
            View Full Details
          </a>
        )}
      </div>
    </div>
  );
}
