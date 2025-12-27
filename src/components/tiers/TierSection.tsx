import { useState, useEffect, useMemo } from 'react';
import type { TierMode, TierGrade, DisplayTierCard } from '../../types/tiers';
import { getTierColor, getTierBgColor, getPercentile } from '../../lib/tiers';
import TierCard from './TierCard';

interface TierSectionProps {
  tier: TierGrade;
  cards: DisplayTierCard[];
  mode: TierMode;
  searchQuery?: string;
  grayUnavailable?: boolean;
}

export default function TierSection({
  tier,
  cards,
  mode,
  searchQuery = '',
  grayUnavailable = false,
}: TierSectionProps) {
  const [expanded, setExpanded] = useState(tier === 'S+' || tier === 'S' || tier === 'A');

  // Check if any cards match the search
  const matchingCardIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<number>();
    const query = searchQuery.toLowerCase();
    return new Set(
      cards
        .filter((card) => card.card_name.toLowerCase().includes(query))
        .map((card) => card.card_id)
    );
  }, [cards, searchQuery]);

  const hasMatches = matchingCardIds.size > 0;

  // Auto-expand tier if it has matching cards
  useEffect(() => {
    if (hasMatches) {
      setExpanded(true);
    }
  }, [hasMatches]);

  const tierColor = getTierColor(tier);
  const tierBgColor = getTierBgColor(tier);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: tierBgColor }}
    >
      {/* Tier header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-bold w-10 text-center"
            style={{ color: tierColor }}
          >
            {tier}
          </span>
          <span className="text-secondary">
            {cards.length} card{cards.length !== 1 ? 's' : ''}
            {hasMatches && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 text-accent rounded">
                {matchingCardIds.size} match{matchingCardIds.size !== 1 ? 'es' : ''}
              </span>
            )}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-secondary transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Cards grid */}
      {expanded && (
        <div className="p-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {cards.map((card) => (
              <TierCard
                key={card.card_id}
                card={card}
                mode={mode}
                isHighlighted={matchingCardIds.has(card.card_id)}
                grayUnavailable={grayUnavailable}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
