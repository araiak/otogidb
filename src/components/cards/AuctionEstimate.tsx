import { useState, useEffect } from 'react';
import { fetchAvailabilityManifest, fetchAvailabilityData } from '../../lib/availability';

interface AuctionEstimateProps {
  cardId: string;
  estimatedDate: string;
  eventName: string;
  note: string;
  /** Whether the card has build-time auction data (from auctions.json) */
  hasAuctionData: boolean;
}

/**
 * Auction estimate display with client-side R2 check.
 *
 * Hides automatically when:
 * 1. Build-time auction data exists (hasAuctionData = true), OR
 * 2. R2 availability data shows the card has been on auction
 *
 * This ensures the estimate only shows for cards that have never appeared on auction.
 */
export default function AuctionEstimate({
  cardId,
  estimatedDate,
  eventName,
  note,
  hasAuctionData,
}: AuctionEstimateProps) {
  const [shouldHide, setShouldHide] = useState(hasAuctionData);
  const [isChecking, setIsChecking] = useState(!hasAuctionData);

  useEffect(() => {
    // If we already have build-time auction data, no need to check R2
    if (hasAuctionData) {
      setIsChecking(false);
      return;
    }

    let cancelled = false;

    async function checkR2Availability() {
      try {
        const manifest = await fetchAvailabilityManifest();
        if (cancelled || !manifest) {
          setIsChecking(false);
          return;
        }

        const data = await fetchAvailabilityData(manifest.current_version);
        if (cancelled || !data) {
          setIsChecking(false);
          return;
        }

        const cardAvailability = data.cards[cardId];
        // Only hide if card has actually been SEEN on auction (has last_seen data)
        // Just having auction config (available: false) doesn't mean it's been auctioned yet
        if (cardAvailability?.auction?.last_seen) {
          setShouldHide(true);
        }
      } catch (error) {
        console.warn('[AuctionEstimate] Failed to fetch R2 data:', error);
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    checkR2Availability();

    return () => {
      cancelled = true;
    };
  }, [cardId, hasAuctionData]);

  // Don't render if card has auction data (build-time or R2)
  if (shouldHide) {
    return null;
  }

  // Show loading state while checking R2
  if (isChecking) {
    return (
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-secondary">Checking auction status...</span>
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-1.5">
        <span className="text-xs text-secondary flex-shrink-0">Estimated Auction:</span>
        <div className="flex-1">
          <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
            ~{estimatedDate}
          </div>
          <div
            className="text-[10px] text-secondary italic mt-0.5 cursor-help"
            title={note}
          >
            Based on {eventName} event pattern
          </div>
        </div>
      </div>
    </div>
  );
}
