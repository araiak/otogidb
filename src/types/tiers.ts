/**
 * Types for tier list data from benchmark simulations.
 */

export type TierGrade = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'N/A';

export type TierMode = 'overall' | 'five_round' | 'one_round' | 'defense' | 'individual' | 'reserve';

export type UnitType = 1 | 2 | 3 | 4; // 1=Melee, 2=Ranged, 3=Healer, 4=Assist

export type Attribute = 1 | 2 | 3; // 1=Divina, 2=Phantasma, 3=Anima

export interface TierRawScores {
  five_round: number;
  one_round: number;
  defense: number;
  individual: number;
  contribution_pct: number;
}

export interface TierVsBaseline {
  five_round: number; // % change from baseline
  one_round: number;
  defense: number;
}

export interface TierPercentiles {
  five_round: number;
  one_round: number;
  defense: number;
  individual: number;
  overall: number;
  reserve: number;
}

export interface TierGrades {
  five_round: TierGrade;
  one_round: TierGrade;
  defense: TierGrade;
  individual: TierGrade;
  overall: TierGrade;
  reserve: TierGrade;  // Not part of overall - measures passive ability value in reserve slot
}

export interface ReserveModeBreakdown {
  percentile: number;
  tier: TierGrade;
}

export interface ReserveBreakdown {
  five_round: ReserveModeBreakdown;
  one_round: ReserveModeBreakdown;
  defense: ReserveModeBreakdown;
}

export interface TierCard {
  card_id: number;
  card_name: string;
  unit_type: UnitType;
  attribute: Attribute;
  rarity: number;
  raw: TierRawScores;
  vs_baseline?: TierVsBaseline;
  percentiles: TierPercentiles;
  tiers: TierGrades;
  reserve_breakdown?: ReserveBreakdown | null;  // Per-mode reserve tiers (null for assists)
}

export interface RoleModeStats {
  mean: number;
  stdev: number;
  min: number;
  max: number;
}

export interface RoleStats {
  count: number;
  five_round: RoleModeStats;
  one_round: RoleModeStats;
  defense: RoleModeStats;
  individual: RoleModeStats;
}

export interface TierLists {
  overall: Record<TierGrade, number[]>;
  five_round: Record<TierGrade, number[]>;
  one_round: Record<TierGrade, number[]>;
  defense: Record<TierGrade, number[]>;
  individual: Record<TierGrade, number[]>;
  reserve: Record<TierGrade, number[]>;
}

export interface TierData {
  version: string;
  cards: Record<string, TierCard>;
  tier_lists: TierLists;
  role_stats: {
    melee: RoleStats;
    ranged: RoleStats;
    healer: RoleStats;
    assist: RoleStats;
  };
}

// Filter options for the tier list UI
export interface TierFilters {
  mode: TierMode;
  role: UnitType | null; // null = all roles
  attribute: Attribute | null; // null = all attributes
  searchQuery: string; // Search by card name
  grayUnavailable: boolean; // Gray out cards not currently available
}

// Display card for UI rendering
export interface DisplayTierCard extends TierCard {
  currently_available?: boolean; // From cards_index acquisition data
}

// Utility type maps
export const UNIT_TYPE_NAMES: Record<UnitType, string> = {
  1: 'Melee',
  2: 'Ranged',
  3: 'Healer',
  4: 'Assist',
};

export const ATTRIBUTE_NAMES: Record<Attribute, string> = {
  1: 'Divina',
  2: 'Phantasma',
  3: 'Anima',
};

export const TIER_MODE_NAMES: Record<TierMode, string> = {
  overall: 'Overall',
  five_round: '5-Round',
  one_round: '1-Round',
  defense: 'Defense',
  individual: 'Individual DPS',
  reserve: 'Reserve',
};
