/**
 * Tier data loading and calculation utilities.
 */

import type {
  TierData,
  TierCard,
  TierMode,
  TierGrade,
  UnitType,
  Attribute,
  DisplayTierCard,
  TierFilters,
} from '../types/tiers';
import {
  fetchAvailabilityManifest,
  fetchAvailabilityData,
} from './availability';

let tierDataCache: TierData | null = null;
let availabilityCache: Record<string, boolean> | null = null;

/**
 * Get data paths from manifest (set by BaseLayout at build time).
 * Falls back to base paths if manifest not available.
 */
function getDataPaths(): { tiers: string } {
  const dataPaths = (window as any).OTOGIDB_DATA_PATHS || {};
  return {
    tiers: dataPaths.tiers?.path || '/data/tiers.json',
  };
}

/**
 * Load availability data from R2 availability.json.
 * Uses the same R2 fetch logic as AvailabilityBadge for single source of truth.
 */
async function loadAvailabilityData(): Promise<Record<string, boolean>> {
  if (availabilityCache) {
    return availabilityCache;
  }

  try {
    // Fetch from R2 using shared availability functions
    const manifest = await fetchAvailabilityManifest();
    if (!manifest) {
      console.warn('[Tiers] No availability manifest, defaulting all to available');
      return {};
    }

    const data = await fetchAvailabilityData(manifest.current_version);
    if (!data) {
      console.warn('[Tiers] Failed to fetch availability data');
      return {};
    }

    const availability: Record<string, boolean> = {};
    for (const [cardId, card] of Object.entries(data.cards || {})) {
      availability[cardId] = card.currently_available ?? true;
    }
    availabilityCache = availability;
    return availability;
  } catch {
    return {};
  }
}

/**
 * Load tier data from the public data directory.
 */
export async function loadTierData(): Promise<TierData> {
  if (tierDataCache) {
    return tierDataCache;
  }

  const { tiers } = getDataPaths();
  const [tierResponse, availability] = await Promise.all([
    fetch(tiers),
    loadAvailabilityData(),
  ]);

  if (!tierResponse.ok) {
    throw new Error(`Failed to load tier data: ${tierResponse.status}`);
  }

  const tierData: TierData = await tierResponse.json();

  // Merge availability data into tier cards
  for (const [cardId, card] of Object.entries(tierData.cards)) {
    (card as any).currently_available = availability[cardId] ?? true;
  }

  tierDataCache = tierData;
  return tierDataCache!;
}

/**
 * Get the raw score for a card in a given mode.
 */
export function getRawScore(card: TierCard, mode: TierMode): number {
  switch (mode) {
    case 'five_round':
      return card.raw.five_round;
    case 'one_round':
      return card.raw.one_round;
    case 'defense':
      return card.raw.defense;
    case 'individual':
      return card.raw.individual;
    case 'overall':
      // Overall uses a weighted combination, use percentile instead
      return card.percentiles.overall;
    case 'reserve':
      // Reserve uses percentile as score (no raw score available)
      return card.percentiles.reserve;
    default:
      return 0;
  }
}

/**
 * Get the percentile for a card in a given mode.
 */
export function getPercentile(card: TierCard, mode: TierMode): number {
  switch (mode) {
    case 'five_round':
      return card.percentiles.five_round;
    case 'one_round':
      return card.percentiles.one_round;
    case 'defense':
      return card.percentiles.defense;
    case 'individual':
      return card.percentiles.individual;
    case 'overall':
      return card.percentiles.overall;
    case 'reserve':
      return card.percentiles.reserve;
    default:
      return 0;
  }
}

/**
 * Get the tier grade for a card in a given mode.
 */
export function getTier(card: TierCard, mode: TierMode): TierGrade {
  switch (mode) {
    case 'five_round':
      return card.tiers.five_round;
    case 'one_round':
      return card.tiers.one_round;
    case 'defense':
      return card.tiers.defense;
    case 'individual':
      return card.tiers.individual;
    case 'overall':
      return card.tiers.overall;
    case 'reserve':
      return card.tiers.reserve;
    default:
      return 'D';
  }
}

/**
 * Filter cards by role and/or attribute.
 */
export function filterCards(
  cards: TierCard[],
  role: UnitType | null,
  attribute: Attribute | null
): TierCard[] {
  return cards.filter((card) => {
    if (role !== null && card.unit_type !== role) return false;
    if (attribute !== null && card.attribute !== attribute) return false;
    return true;
  });
}

/**
 * Group cards by tier.
 */
export function groupByTier(
  cards: DisplayTierCard[],
  mode: TierMode
): Record<TierGrade, DisplayTierCard[]> {
  const groups: Record<TierGrade, DisplayTierCard[]> = {
    'S+': [],
    S: [],
    A: [],
    B: [],
    C: [],
    D: [],
    'N/A': [],
  };

  for (const card of cards) {
    const tier = getTier(card, mode);

    if (tier === 'N/A') {
      groups['N/A'].push(card);
    } else {
      groups[tier].push(card);
    }
  }

  // Sort each tier by percentile (highest first)
  for (const tier of Object.keys(groups) as TierGrade[]) {
    groups[tier].sort((a, b) => getPercentile(b, mode) - getPercentile(a, mode));
  }

  return groups;
}

/**
 * Process tier data with filters.
 * Filters remove cards that don't match; tiers are preserved from global calculation.
 */
export function processTierData(
  data: TierData,
  filters: TierFilters
): Record<TierGrade, DisplayTierCard[]> {
  // Get all cards as array
  const allCards = Object.values(data.cards);

  // Apply filters (just removes non-matching cards, keeps original tiers)
  const filteredCards = filterCards(allCards, filters.role, filters.attribute);

  // Group by tier using original global tiers
  return groupByTier(filteredCards, filters.mode);
}

/**
 * Get tier color for styling.
 */
export function getTierColor(tier: TierGrade): string {
  switch (tier) {
    case 'S+':
      return '#FF6B6B'; // Red-pink for elite
    case 'S':
      return '#FFD700'; // Gold
    case 'A':
      return '#C0C0C0'; // Silver
    case 'B':
      return '#CD7F32'; // Bronze
    case 'C':
      return '#808080'; // Gray
    case 'D':
      return '#404040'; // Dark gray
    case 'N/A':
      return '#606060';
    default:
      return '#808080';
  }
}

/**
 * Get tier background color for styling.
 */
export function getTierBgColor(tier: TierGrade): string {
  switch (tier) {
    case 'S+':
      return 'rgba(255, 107, 107, 0.2)'; // Red-pink for elite
    case 'S':
      return 'rgba(255, 215, 0, 0.15)';
    case 'A':
      return 'rgba(192, 192, 192, 0.15)';
    case 'B':
      return 'rgba(205, 127, 50, 0.15)';
    case 'C':
      return 'rgba(128, 128, 128, 0.1)';
    case 'D':
      return 'rgba(64, 64, 64, 0.1)';
    case 'N/A':
      return 'rgba(96, 96, 96, 0.1)';
    default:
      return 'transparent';
  }
}
