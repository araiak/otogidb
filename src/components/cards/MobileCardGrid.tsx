import type { Row } from '@tanstack/react-table';
import type { Card } from '../../types/card';
import { getThumbnailUrl, PLACEHOLDER_IMAGE } from '../../lib/images';
import { formatNumber } from '../../lib/formatters';
import { AttributeIcon, TypeIcon, RarityStars } from './GameIcon';

interface MobileCardGridProps {
  rows: Row<Card>[];
  getCardUrl: (id: string) => string;
  onPreviewCard: (card: Card) => void;
}

/**
 * Mobile card grid layouts for CardTable.
 * Renders two responsive variants:
 * - Extra-small (360-480px): Minimal with image + name
 * - Small-medium (480-768px): More detail with stats
 */
export default function MobileCardGrid({
  rows,
  getCardUrl,
  onPreviewCard,
}: MobileCardGridProps) {
  if (rows.length === 0) {
    return (
      <div className="md:hidden text-center py-8">
        <div className="text-secondary">
          <p className="text-lg font-medium">No cards found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Extra-Small Mobile (360-480px) - Minimal: Image + Name only */}
      <div className="xs:hidden md:hidden grid grid-cols-1 gap-2">
        {rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <div key={row.id} className="card-grid-item flex items-center gap-3 py-2">
              <a href={getCardUrl(card.id)} className="flex-shrink-0">
                <img
                  src={imgUrl || PLACEHOLDER_IMAGE}
                  alt={card.name || `Card #${card.id}`}
                  className="w-10 h-10 rounded object-cover"
                  loading="lazy"
                />
              </a>
              <a href={getCardUrl(card.id)} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate text-sm">{card.name || `Card #${card.id}`}</span>
                  {!card.playable && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium flex-shrink-0">NPC</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
              </a>
              <button
                onClick={() => onPreviewCard(card)}
                className="p-2 rounded-full flex-shrink-0 touch-target"
                style={{ backgroundColor: 'var(--color-surface)' }}
                aria-label="Preview card"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Small-Medium Mobile (480-768px) - More detail */}
      <div className="hidden xs:grid md:hidden grid-cols-1 gap-3">
        {rows.map(row => {
          const card = row.original;
          const imgUrl = getThumbnailUrl(card);
          return (
            <div key={row.id} className="card-grid-item flex items-center gap-3">
              <a href={getCardUrl(card.id)} className="flex-shrink-0">
                <img
                  src={imgUrl || PLACEHOLDER_IMAGE}
                  alt={card.name || `Card #${card.id}`}
                  className="w-12 h-12 rounded object-cover"
                  loading="lazy"
                />
              </a>
              <a href={getCardUrl(card.id)} className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">{card.name || `Card #${card.id}`}</span>
                  {!card.playable && (
                    <span className="px-1 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400 font-medium flex-shrink-0">NPC</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AttributeIcon value={card.stats.attribute_name} size="sm" />
                  <TypeIcon value={card.stats.type_name} size="sm" />
                  <RarityStars value={card.stats.rarity} size="sm" />
                </div>
                {card.skill && (
                  <div className="text-xs text-secondary truncate">{card.skill.name}</div>
                )}
              </a>
              <div className="text-right text-sm mr-2">
                <div>ATK: {formatNumber(card.stats.max_atk)}</div>
                <div className="text-secondary">HP: {formatNumber(card.stats.max_hp)}</div>
              </div>
              <button
                onClick={() => onPreviewCard(card)}
                className="p-2 rounded-full flex-shrink-0 touch-target"
                style={{ backgroundColor: 'var(--color-surface)' }}
                aria-label="Preview card"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
