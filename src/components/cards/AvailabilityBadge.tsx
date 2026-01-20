import { useState, useEffect } from 'react';
import {
  fetchAvailabilityManifest,
  fetchAvailabilityData,
  computeClientSideAvailability,
} from '../../lib/availability';

interface AvailabilityBadgeProps {
  cardId: string;
  initialAvailable: boolean;
}

/**
 * Availability badge with client-side hydration.
 * Shows "Available Now" or "Not Available" based on live R2 data.
 *
 * Uses currently_available directly from R2 - already calculated by pipeline
 * using compute_card_availability() from availability_service.py
 */
export default function AvailabilityBadge({
  cardId,
  initialAvailable,
}: AvailabilityBadgeProps) {
  const [isAvailable, setIsAvailable] = useState(initialAvailable);
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
        if (cardAvailability?.currently_available !== undefined) {
          // Use shared function for client-side end_date check
          const computed = computeClientSideAvailability(cardAvailability);
          setIsAvailable(computed.currentlyAvailable);
          setIsLive(true);
        }
      } catch (error) {
        console.warn('[AvailabilityBadge] Failed to fetch live data:', error);
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

  if (isAvailable) {
    return (
      <span
        className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-700 dark:text-green-400 font-medium cursor-help inline-flex items-center gap-1"
        title="Currently obtainable through at least one method"
      >
        Available Now
        {isLive && (
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Live data from R2" />
        )}
        {isLoading && (
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" title="Loading live data..." />
        )}
      </span>
    );
  }

  return (
    <span
      className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-700 dark:text-red-400 font-medium cursor-help inline-flex items-center gap-1"
      title="Not currently obtainable - may return in future events or banners"
    >
      Not Available
      {isLive && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Live data from R2" />
      )}
      {isLoading && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" title="Loading live data..." />
      )}
    </span>
  );
}
