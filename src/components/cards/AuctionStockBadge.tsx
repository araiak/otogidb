import { useState, useEffect } from 'react';
import { fetchAvailabilityManifest, fetchAvailabilityData } from '../../lib/availability';

type StockLevel = 'high' | 'medium' | 'low' | 'unavailable';

interface AuctionStockBadgeProps {
  cardId: string;
  initialStockLevel: StockLevel;
}

const stockInfo = {
  high: {
    bg: 'bg-green-500/20',
    text: 'text-green-700 dark:text-green-300',
    label: 'Commonly Available',
    tooltip: 'Frequently seen in the auction house',
  },
  medium: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    label: 'Available',
    tooltip: 'Occasionally available in the auction house',
  },
  low: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-300',
    label: 'Rarely Listed',
    tooltip: 'Listed within the last week - may not be currently available',
  },
  unavailable: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-500 dark:text-gray-400',
    label: 'Not Listed',
    tooltip: 'Not seen in the auction house in over a week',
  },
} as const;

/**
 * Auction stock badge with client-side hydration.
 * Shows static data initially, then fetches live stock_level from R2.
 */
export default function AuctionStockBadge({
  cardId,
  initialStockLevel,
}: AuctionStockBadgeProps) {
  const [stockLevel, setStockLevel] = useState<StockLevel>(initialStockLevel);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveAvailability() {
      try {
        const manifest = await fetchAvailabilityManifest();
        if (cancelled || !manifest) {
          setIsLoading(false);
          return;
        }

        const data = await fetchAvailabilityData(manifest.current_version);
        if (cancelled || !data) {
          setIsLoading(false);
          return;
        }

        const cardAvailability = data.cards[cardId];
        if (cardAvailability?.auction?.stock_level) {
          // Use stock_level directly from R2 - already calculated by pipeline
          setStockLevel(cardAvailability.auction.stock_level);
          setIsLive(true);
        }
      } catch (error) {
        console.warn('[AuctionStockBadge] Failed to fetch live data:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchLiveAvailability();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const style = stockInfo[stockLevel];

  return (
    <span
      className={`px-2 py-0.5 text-xs rounded ${style.bg} ${style.text} font-medium cursor-help inline-flex items-center gap-1`}
      title={style.tooltip}
    >
      {style.label}
      {isLive && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Live data from R2" />
      )}
      {isLoading && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" title="Loading live data..." />
      )}
    </span>
  );
}
