import { useState, useEffect, useMemo } from 'react';
import type {
  TierData,
  TierMode,
  TierGrade,
  UnitType,
  Attribute,
  TierFilters,
  DisplayTierCard,
} from '../../types/tiers';
import {
  loadTierData,
  processTierData,
  getTierColor,
  getTierBgColor,
} from '../../lib/tiers';
import { UNIT_TYPE_NAMES, ATTRIBUTE_NAMES, TIER_MODE_NAMES } from '../../types/tiers';
import TierFiltersComponent from './TierFilters';
import TierSection from './TierSection';
import type { Card } from '../../types/card';
import CardHoverProvider from '../cards/CardHoverProvider';

export default function TierList() {
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [cardData, setCardData] = useState<Record<string, Card>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<TierFilters>({
    mode: 'overall',
    role: null,
    attribute: null,
    searchQuery: '',
    grayUnavailable: false, // User can enable to gray out unavailable cards
  });

  // Load tier data and card data on mount
  useEffect(() => {
    Promise.all([
      loadTierData(),
      fetch('/data/cards_index.json').then(r => r.json()),
    ])
      .then(([tiers, cardsJson]) => {
        setTierData(tiers);
        setCardData(cardsJson.cards || {});
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setError('Failed to load tier data. Please try again later.');
        setLoading(false);
      });
  }, []);

  // Read URL params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const mode = params.get('mode') as TierMode | null;
    const role = params.get('role');
    const attr = params.get('attr');

    setFilters((prev) => ({
      ...prev,
      mode: mode && Object.keys(TIER_MODE_NAMES).includes(mode) ? mode : 'overall',
      role: role ? (parseInt(role) as UnitType) : null,
      attribute: attr ? (parseInt(attr) as Attribute) : null,
    }));
  }, []);

  // Update URL when filters change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (filters.mode !== 'overall') params.set('mode', filters.mode);
    if (filters.role !== null) params.set('role', String(filters.role));
    if (filters.attribute !== null) params.set('attr', String(filters.attribute));

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [filters]);

  // Process tier data with filters
  const groupedCards = useMemo(() => {
    if (!tierData) return null;
    return processTierData(tierData, filters);
  }, [tierData, filters]);

  // Count cards in each tier
  const tierCounts = useMemo(() => {
    if (!groupedCards) return {};
    const counts: Record<TierGrade, number> = {
      'S+': groupedCards['S+'].length,
      S: groupedCards.S.length,
      A: groupedCards.A.length,
      B: groupedCards.B.length,
      C: groupedCards.C.length,
      D: groupedCards.D.length,
      'N/A': groupedCards['N/A'].length,
    };
    return counts;
  }, [groupedCards]);

  const totalCards = useMemo(() => {
    if (!groupedCards) return 0;
    return Object.values(groupedCards).reduce((sum, arr) => sum + arr.length, 0);
  }, [groupedCards]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <span className="ml-3 text-secondary">Loading tier data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-accent text-white rounded hover:bg-accent/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!tierData || !groupedCards) {
    return <div className="text-center py-12 text-secondary">No tier data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <TierFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        totalCards={totalCards}
        version={tierData.version}
      />

      {/* Normalization context note */}
      <div className="text-xs text-secondary px-1">
        {filters.mode === 'individual' ? (
          <span>Ranked globally across all damage dealers (Melee &amp; Ranged). Healers &amp; Assists excluded.</span>
        ) : (
          <span>Ranked within role — cards compete against others of the same type (Melee vs Melee, etc.)</span>
        )}
      </div>

      {/* Individual mode notice */}
      {filters.mode === 'individual' && (tierCounts as Record<string, number>)['N/A'] === totalCards && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm">
          <strong>Note:</strong> Individual DPS data is not yet available. A new benchmark
          run is required to populate this mode.
        </div>
      )}

      {/* Tier sections */}
      {(['S+', 'S', 'A', 'B', 'C', 'D'] as TierGrade[]).map((tier) => {
        const cards = groupedCards[tier];
        if (cards.length === 0) return null;

        return (
          <TierSection
            key={tier}
            tier={tier}
            cards={cards}
            mode={filters.mode}
            searchQuery={filters.searchQuery}
            grayUnavailable={filters.grayUnavailable}
          />
        );
      })}

      {/* Empty state */}
      {totalCards === 0 && (
        <div className="text-center py-12 text-secondary">
          No cards match the current filters.
        </div>
      )}

      {/* Card hover provider for popup previews */}
      <CardHoverProvider
        cards={cardData}
        tiers={tierData}
        selector="[data-card-id]"
        placement="top"
        compact={true}
      />
    </div>
  );
}
