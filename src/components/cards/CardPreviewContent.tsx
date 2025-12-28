import type { Card } from '../../types/card';
import { getPopupImageUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber, formatSkillDescription } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';
import type { SupportedLocale } from '../../lib/i18n';

// Tier data type (subset of what's in tiers.json)
interface TierCardData {
  percentiles: {
    five_round: number;
    one_round: number;
    defense: number;
    individual: number;
    overall: number;
    reserve: number;
  };
  tiers: {
    five_round: string;
    one_round: string;
    defense: string;
    individual: string;
    overall: string;
    reserve: string;  // Not part of overall - measures passive ability value in reserve slot
  };
  reserve_breakdown?: {
    five_round: { percentile: number; tier: string };
    one_round: { percentile: number; tier: string };
    defense: { percentile: number; tier: string };
  } | null;
}

// Helper to get tier color
function getTierColor(tier: string): string {
  switch (tier) {
    case 'S+': return '#FF6B6B';
    case 'S': return '#FFD700';
    case 'A': return '#C0C0C0';
    case 'B': return '#CD7F32';
    case 'C': return '#808080';
    case 'D': return '#404040';
    default: return '#606060';
  }
}

interface CardPreviewContentProps {
  card: Card;
  skills?: Record<string, any>;
  /** Tier data for this card (optional) */
  tierData?: TierCardData | null;
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
 * Uses responsive sizing that scales up on larger screens.
 */
export default function CardPreviewContent({
  card,
  skills = {},
  tierData = null,
  compact = true,
  showDetailsLink = false,
  locale = 'en',
}: CardPreviewContentProps) {
  const imageUrl = getPopupImageUrl(card);
  const skillData = card.skill ? skills[card.skill.id] : null;

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
        <h3 className={`font-bold ${nameSize} mb-1`}>
          {card.name || `Card #${card.id}`}
        </h3>

        <div className="flex items-center gap-2 mb-2">
          <AttributeIcon value={card.stats.attribute_name} size={iconSize as 'sm' | 'md'} />
          <TypeIcon value={card.stats.type_name} size={iconSize as 'sm' | 'md'} />
          <RarityStars value={card.stats.rarity} size="sm" />
        </div>

        {/* Stats Grid */}
        <div className={`grid ${statsGridCols} gap-y-0.5 lg:gap-y-1 ${contentSize} mb-2`}>
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
            <div className={`${contentSize} font-medium`} style={{ color: 'var(--color-accent)' }}>
              Skill: {card.skill.name || 'Unknown Skill'}
            </div>
            <div
              className={`${contentSize} text-secondary`}
              dangerouslySetInnerHTML={{
                __html: formatSkillDescription(card.skill.description, skillData, card.stats.rarity) || 'No description'
              }}
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
