import { useEffect, useRef } from 'react';
import type { DisplayTierCard, TierGrade, TierMode } from '../../types/tiers';
import { UNIT_TYPE_NAMES, ATTRIBUTE_NAMES, TIER_MODE_NAMES } from '../../types/tiers';
import { getTierColor, getPercentile, getTier } from '../../lib/tiers';

interface ScoreBreakdownProps {
  card: DisplayTierCard;
  mode: TierMode;
  onClose: () => void;
}

function TierBadge({ tier }: { tier: TierGrade }) {
  const color = getTierColor(tier);
  return (
    <span
      className="font-bold px-1.5 rounded text-sm"
      style={{ color, backgroundColor: `${color}20` }}
    >
      {tier}
    </span>
  );
}

function PercentileBar({
  label,
  percentile,
  tier,
}: {
  label: string;
  percentile: number;
  tier: TierGrade;
}) {
  const color = getTierColor(tier);
  const width = Math.max(percentile, 1);

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs mb-0.5">
        <span>{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-secondary">{percentile.toFixed(1)}%</span>
          <TierBadge tier={tier} />
        </span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
}

export default function ScoreBreakdown({ card, mode, onClose }: ScoreBreakdownProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside as EventListener);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const roleName = UNIT_TYPE_NAMES[card.unit_type];
  const attrName = ATTRIBUTE_NAMES[card.attribute];

  const getAttrColorClass = () => {
    switch (card.attribute) {
      case 1:
        return 'text-yellow-400'; // Divina
      case 2:
        return 'text-purple-400'; // Phantasma
      case 3:
        return 'text-green-400'; // Anima
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        ref={popupRef}
        className="w-full max-w-sm rounded-lg shadow-xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-3 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <h3 className="font-bold">{card.card_name}</h3>
            <div className="flex items-center gap-2 text-xs text-secondary">
              <span>{'★'.repeat(card.rarity)}</span>
              <span>{roleName}</span>
              <span className={getAttrColorClass()}>{attrName}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Overall tier */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Overall Tier</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{card.percentiles.overall.toFixed(1)}%</span>
              <TierBadge tier={card.tiers.overall} />
            </div>
          </div>

          {/* Percentile breakdown */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs text-secondary mb-3">Score Breakdown</div>

            <PercentileBar
              label="5-Round"
              percentile={card.percentiles.five_round}
              tier={card.tiers.five_round}
            />
            <PercentileBar
              label="1-Round"
              percentile={card.percentiles.one_round}
              tier={card.tiers.one_round}
            />
            <PercentileBar
              label="Defense"
              percentile={card.percentiles.defense}
              tier={card.tiers.defense}
            />
            {card.tiers.individual !== 'N/A' && (
              <PercentileBar
                label="Individual DPS"
                percentile={card.percentiles.individual}
                tier={card.tiers.individual}
              />
            )}
          </div>

          {/* Raw scores */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div className="text-xs text-secondary mb-2">Raw Benchmark Scores</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-secondary">5-Round:</span>
                <span>{formatNumber(card.raw.five_round)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">1-Round:</span>
                <span>{formatNumber(card.raw.one_round)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary">Defense:</span>
                <span>{card.raw.defense.toFixed(0)}s</span>
              </div>
              {card.raw.individual > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">Individual:</span>
                  <span>{formatNumber(card.raw.individual)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Link to full details */}
          <a
            href={`/en/cards/${card.card_id}`}
            className="block text-center text-sm text-accent hover:underline pt-2"
          >
            View Full Card Details →
          </a>
        </div>
      </div>
    </div>
  );
}
