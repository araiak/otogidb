/**
 * Team Damage Calculator Types
 * Type definitions for the 5-member team + 2 reserve calculator
 */

import type { Card, Ability } from '../types/card';

// ============================================================================
// Bond Types
// ============================================================================

// Legacy bond type (kept for backwards compatibility with saved states)
export type BondType =
  | 'none'
  | 'atk15'
  | 'skill15'
  | 'atk10'
  | 'skill10'
  | 'atk7'
  | 'skill7'
  | 'atk5'
  | 'skill5'
  | 'split5'
  | 'split7';

// New single bond slot type
export type BondSlotType = 'none' | 'atk5' | 'atk7' | 'skill5' | 'skill7';

export const BOND_SLOT_VALUES: Record<BondSlotType, { atk: number; skill: number }> = {
  'none': { atk: 0, skill: 0 },
  'atk5': { atk: 0.05, skill: 0 },
  'atk7': { atk: 0.075, skill: 0 },
  'skill5': { atk: 0, skill: 0.05 },
  'skill7': { atk: 0, skill: 0.075 },
};

export const BOND_SLOT_LABELS: Record<BondSlotType, string> = {
  'none': 'None',
  'atk5': '+5% ATK',
  'atk7': '+7.5% ATK',
  'skill5': '+5% Skill',
  'skill7': '+7.5% Skill',
};

// Default bond slot value
export const DEFAULT_BOND_SLOT: BondSlotType = 'none';

// Legacy BOND_VALUES kept for backwards compatibility
export const BOND_VALUES: Record<BondType, { atk: number; skill: number }> = {
  'none': { atk: 0, skill: 0 },
  'atk15': { atk: 0.15, skill: 0 },
  'skill15': { atk: 0, skill: 0.15 },
  'atk10': { atk: 0.10, skill: 0 },
  'skill10': { atk: 0, skill: 0.10 },
  'atk7': { atk: 0.075, skill: 0 },
  'skill7': { atk: 0, skill: 0.075 },
  'atk5': { atk: 0.05, skill: 0 },
  'skill5': { atk: 0, skill: 0.05 },
  'split5': { atk: 0.05, skill: 0.05 },
  'split7': { atk: 0.075, skill: 0.075 },
};

// Helper to combine bond slots into total values
export function combineBondSlots(bond1: BondSlotType, bond2: BondSlotType, bond3: BondSlotType): { atk: number; skill: number } {
  const v1 = BOND_SLOT_VALUES[bond1];
  const v2 = BOND_SLOT_VALUES[bond2];
  const v3 = BOND_SLOT_VALUES[bond3];
  return {
    atk: v1.atk + v2.atk + v3.atk,
    skill: v1.skill + v2.skill + v3.skill,
  };
}

// ============================================================================
// Ability Parsing Types
// ============================================================================

export type AbilityTarget =
  | 'self'           // Only affects the card with this ability
  | 'self_ime'       // Self immediate effect
  | 'team'           // Affects all team members
  | 'attribute'      // Affects all members of a specific attribute
  | 'ranked'         // Affects top N members by a stat
  | 'enemy'          // Affects enemies
  | 'current_target' // Affects current target
  | 'ally';          // Affects allies

export type AbilityTiming =
  | 'passive'     // Always active
  | 'wave_start'  // At start of each wave
  | 'final_wave'  // At start of final wave
  | 'entry';      // When card enters battle

export interface AbilityEffect {
  stat: 'atk' | 'critRate' | 'critDmg' | 'dmg' | 'skillDmg' | 'speed' | 'level' | 'shield' | 'defense' | 'normalDmg' | 'hp';
  value: number;  // Percentage as decimal (0.15 = 15%)
  isDebuff?: boolean;  // True if this reduces enemy stats
}

export interface ParsedAbility {
  id: string;
  name: string;
  description: string;
  unlockLevel: number;
  sourceCardId: string;
  isFromAssist: boolean;

  // Targeting
  targetType: AbilityTarget;
  attributeFilter: 'Divina' | 'Phantasma' | 'Anima' | null;
  rankCount: number | null;       // e.g., "top 2" -> 2
  rankSortBy: 'atk' | 'speed' | 'hp' | null;

  // Effects
  effects: AbilityEffect[];

  // Conditions
  synergyPartners: string[];      // Card IDs that must be present
  requiresLeader: boolean;        // Only active when source card is leader
  timing: AbilityTiming;

  // Stacking
  stackable: boolean;
}

// ============================================================================
// Random Targeting Mode
// ============================================================================

/**
 * How to resolve random/ambiguous ability targets
 * Used for abilities like "2 random Divina allies" where no stat-based sorting exists
 */
export type RandomTargetMode =
  | 'average'  // Distribute effect proportionally across all eligible (default)
  | 'first'    // First N eligible members (deterministic)
  | 'last'     // Last N eligible members
  | 'best'     // Members with highest relevant stats (optimistic)
  | 'worst'    // Members with lowest relevant stats (pessimistic)
  | 'random';  // True random selection

export const RANDOM_TARGET_MODE_LABELS: Record<RandomTargetMode, string> = {
  average: 'Average',
  first: 'First N',
  last: 'Last N',
  best: 'Best Case',
  worst: 'Worst Case',
  random: 'Random',
};

export const RANDOM_TARGET_MODE_DESCRIPTIONS: Record<RandomTargetMode, string> = {
  average: 'Distribute effect proportionally to all eligible members',
  first: 'Select first N eligible members (slots 1→5)',
  last: 'Select last N eligible members (slots 5→1)',
  best: 'Select members with highest relevant stats',
  worst: 'Select members with lowest relevant stats',
  random: 'Randomly select from eligible members',
};

// ============================================================================
// Stat Breakdown Types
// ============================================================================

export interface StatSource {
  base: number;
  bond: number;
  assist: number;
  abilities: number;
  total: number;
}

export interface StatBreakdown {
  level: { base: number; limitBreak: number; bonus: number; abilities: number; total: number };
  atk: StatSource;
  critRate: StatSource;
  critDmg: StatSource;
  dmg: { abilities: number; total: number };
  skillDmg: { bond: number; assist: number; abilities: number; total: number };
  speed: StatSource;
}

export interface ComputedMemberStats {
  effectiveLevel: number;
  displayAtk: number;
  effectiveSpeed: number;
  effectiveCritRate: number;      // Capped at 100%
  effectiveCritDmg: number;       // Base 2.0 + bonuses
  dmgBonus: number;               // Total DMG%
  skillDmgBonus: number;          // Total Skill DMG%
  attackInterval: number;         // Seconds between attacks

  breakdown: StatBreakdown;
}

// ============================================================================
// Damage Result Types
// ============================================================================

export interface MemberDamageResult {
  normalDamage: number;
  normalDamageMin: number;        // Min damage (no exceed bonus)
  normalDamageMax: number;        // Max damage (full exceed bonus)
  normalDamageCrit: number;
  normalDamageCritMin: number;
  normalDamageCritMax: number;
  normalDamageExpected: number;
  normalDamageCapped: boolean;
  normalDps: number;
  normalDpsMin: number;           // Min DPS (based on min expected damage)
  normalDpsMax: number;           // Max DPS (based on max expected damage)

  skillBaseDamage: number;        // Raw skill damage before modifiers
  skillDamage: number;
  skillDamageMin: number;         // Min skill damage (no exceed)
  skillDamageMax: number;         // Max skill damage (full exceed)
  skillDamageCrit: number;
  skillDamageCritMin: number;
  skillDamageCritMax: number;
  skillDamageExpected: number;
  skillDamageExpectedMin: number; // Min expected skill damage (with crit, no exceed)
  skillDamageExpectedMax: number; // Max expected skill damage (with crit, full exceed)
  skillDamageCapped: boolean;
}

// ============================================================================
// Skill Buff Types
// ============================================================================

export interface SkillBuff {
  // What the skill does to targets
  dmgBonus: number;           // +X% DMG dealt by targets
  dmgReduction: number;       // +X% DMG reduction for targets
  dmgTakenDebuff: number;     // Enemies take +X% more DMG (shield debuff)
  dmgDealtDebuff: number;     // Enemies deal -X% less DMG
  critRateBonus: number;      // +X% crit rate (from "On Skill" abilities)
  critDmgBonus: number;       // +X% crit DMG (from "On Skill" abilities)
  speedBonus: number;         // +X% ATK speed
  speedDebuff: number;        // Enemies -X% ATK speed
}

export interface ParsedSkillEffect {
  targetType: 'ally' | 'enemy' | 'self';
  targetCount: number;        // 1 = single, 2-5 = multi, 99 = all
  targetPriority: 'highest_atk' | 'lowest_hp' | 'current' | 'random' | 'all' | null;
  buffs: SkillBuff;
  duration?: number;          // Duration in seconds (from effect data)
}

// ============================================================================
// Team Member State
// ============================================================================

export interface TeamMemberState {
  // Card selection
  cardId: string | null;
  card: Card | null;

  // Assist selection
  assistCardId: string | null;
  assistCard: Card | null;

  // Configuration
  limitBreak: number;             // 0-4 (MLB = 4)
  levelBonus: number;             // 0-30
  bond1: BondSlotType;            // First bond slot (default: atk7)
  bond2: BondSlotType;            // Second bond slot (default: atk7)
  bond3: BondSlotType;            // Third bond slot (locked to 'none' if assist selected, default: atk7)
  bondType: BondType;             // Legacy (kept for backwards compatibility)

  // Skill activation toggle
  // When active, skill buffs are applied to targets
  skillActive: boolean;

  // Slot type
  isReserve: boolean;             // true for reserve slots (index 5-6)

  // Computed values (populated after calculation phases)
  computedStats: ComputedMemberStats | null;
  damageResult: MemberDamageResult | null;  // null for reserve slots
  abilityContributions: Phase3AbilityContribution[];  // Source tracking for UI tooltips

  // Parsed skill effects (populated when card is set)
  skillEffect: ParsedSkillEffect | null;
}

// ============================================================================
// Team Context (Phase 2)
// ============================================================================

export interface TeamContext {
  // Sorted member indices (main team only, 0-4)
  byAtk: number[];                // Indices sorted by ATK descending
  bySpeed: number[];              // Indices sorted by Speed descending
  byHp: number[];                 // Indices sorted by HP descending

  // All members sorted (main + reserve, 0-6) for ability resolution
  allByAtk: number[];

  // Attribute counts
  attributeCounts: {
    divina: number;
    phantasma: number;
    anima: number;
  };

  // Present card IDs for synergy checking
  presentCardIds: Set<string>;
  presentAssistIds: Set<string>;

  // Leader (index 0)
  leaderCardId: string | null;
}

// ============================================================================
// Enemy State
// ============================================================================

/**
 * Enemy attribute type for race bonus calculation
 * Set to 'None' to disable race bonus (default)
 */
export type EnemyAttribute = 'None' | 'Divina' | 'Phantasma' | 'Anima';

/**
 * Race bonus constants from RE validation (2025-12-24 via Ghidra)
 * See docs/re-findings/functions/combat/CaucalRaceOverTeamBonus.md
 * GameConst offsets: +0x110 (leader), +0x114 (member), +0x118 (assist)
 *
 * Race triangle (who has advantage over whom):
 * - Anima beats Divina
 * - Divina beats Phantasma
 * - Phantasma beats Anima
 */
export const RACE_BONUS_CONSTANTS = {
  leaderBonus: 0.10,    // +10% if leader has advantage
  memberBonus: 0.05,    // +5% per team member with advantage
  assistBonus: 0.05,    // +5% per assist with advantage
} as const;

/**
 * Returns the attribute that has type advantage over the given enemy attribute
 * Returns null for 'None' enemy attribute
 */
export function getAdvantageAttribute(enemyAttr: EnemyAttribute): 'Divina' | 'Phantasma' | 'Anima' | null {
  switch (enemyAttr) {
    case 'Divina': return 'Anima';       // Anima beats Divina
    case 'Phantasma': return 'Divina';   // Divina beats Phantasma
    case 'Anima': return 'Phantasma';    // Phantasma beats Anima
    default: return null;
  }
}

/**
 * Returns the attribute that the given enemy has advantage over (disadvantaged type)
 * Used for calculating the disadvantage penalty
 * Returns null for 'None' enemy attribute
 */
export function getDisadvantageAttribute(enemyAttr: EnemyAttribute): 'Divina' | 'Phantasma' | 'Anima' | null {
  switch (enemyAttr) {
    case 'Divina': return 'Phantasma';   // Divina beats Phantasma
    case 'Phantasma': return 'Anima';    // Phantasma beats Anima
    case 'Anima': return 'Divina';       // Anima beats Divina
    default: return null;
  }
}

export interface EnemyState {
  baseShield: number;             // -0.75 to 0.85 (negative = vulnerability)
  baseDefense: number;            // 0 to 0.85 (separate from shield, multiplicative)
  isFinalWave: boolean;           // Enable Final Wave abilities
  waveCount: number;              // Number of waves passed (for Wave Start stacking)
  attribute: EnemyAttribute;      // Enemy attribute for race bonus (default: 'None')
  ignoreShieldCap: boolean;       // If true, skip -75%/+85% shield cap (World Boss mode)
  worldBossBonus: number;         // Additional multiplier for World Boss (e.g., 1.0 = none, 2.0 = 2x)
  healersDontAttack: boolean;     // If true, healers deal 0 damage (busy healing)
}

// ============================================================================
// Main Team State
// ============================================================================

export const MAIN_TEAM_SIZE = 5;
export const RESERVE_SIZE = 2;
export const TOTAL_SLOTS = MAIN_TEAM_SIZE + RESERVE_SIZE;

export interface TeamState {
  // 5 main members + 2 reserve slots (indices 0-4 = main, 5-6 = reserve)
  members: TeamMemberState[];
  activeTabIndex: number;         // 0-6
  enemy: EnemyState;

  // Ability target overrides for ranked/random abilities
  // Maps ability ID to array of target member indices
  abilityTargetOverrides: Record<string, number[]>;

  // How to resolve random ability targets (default: 'first')
  randomTargetMode: RandomTargetMode;

  // Calculated context (populated after Phase 2)
  teamContext: TeamContext | null;

  // Data loading state
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface StoredMemberState {
  cardId: string | null;
  assistCardId: string | null;
  limitBreak: number;
  levelBonus: number;
  bond1?: BondSlotType;           // Optional for backwards compatibility
  bond2?: BondSlotType;           // Optional for backwards compatibility
  bond3?: BondSlotType;           // Optional for backwards compatibility
  bondType: BondType;             // Legacy, kept for backwards compatibility
  skillActive: boolean;
}

export interface StoredTeamState {
  members: StoredMemberState[];
  enemy: {
    baseShield: number;
    baseDefense?: number;      // Optional for backwards compatibility
    isFinalWave: boolean;
    waveCount: number;
    attribute?: EnemyAttribute; // Optional for backwards compatibility
    ignoreShieldCap?: boolean; // Optional for backwards compatibility (World Boss mode)
    worldBossBonus?: number;   // Optional for backwards compatibility
    healersDontAttack?: boolean; // Optional for backwards compatibility
  };
  activeTabIndex: number;
  abilityTargetOverrides?: Record<string, number[]>;
}

// ============================================================================
// Reducer Action Types
// ============================================================================

export type TeamAction =
  | { type: 'SET_CARD'; memberIndex: number; cardId: string | null }
  | { type: 'SET_ASSIST'; memberIndex: number; cardId: string | null }
  | { type: 'SET_LIMIT_BREAK'; memberIndex: number; value: number }
  | { type: 'SET_LEVEL_BONUS'; memberIndex: number; value: number }
  | { type: 'SET_BOND_SLOT'; memberIndex: number; slot: 1 | 2 | 3; value: BondSlotType }
  | { type: 'SET_BOND_TYPE'; memberIndex: number; bondType: BondType }  // Legacy
  | { type: 'TOGGLE_SKILL'; memberIndex: number }
  | { type: 'SET_ACTIVE_TAB'; index: number }
  | { type: 'SET_ENEMY_BASE_SHIELD'; value: number }
  | { type: 'SET_ENEMY_BASE_DEFENSE'; value: number }
  | { type: 'SET_ENEMY_ATTRIBUTE'; value: EnemyAttribute }
  | { type: 'SET_FINAL_WAVE'; value: boolean }
  | { type: 'SET_WAVE_COUNT'; value: number }
  | { type: 'SET_IGNORE_SHIELD_CAP'; value: boolean }
  | { type: 'SET_WORLD_BOSS_BONUS'; value: number }
  | { type: 'SET_HEALERS_DONT_ATTACK'; value: boolean }
  | { type: 'SET_ABILITY_TARGETS'; abilityId: string; targets: number[] }
  | { type: 'SET_RANDOM_TARGET_MODE'; mode: RandomTargetMode }
  | { type: 'CLEAR_MEMBER'; memberIndex: number }
  | { type: 'CLEAR_ALL' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'UPDATE_COMPUTED'; members: TeamMemberState[]; teamContext: TeamContext }
  | { type: 'LOAD_FROM_STORAGE'; state: StoredTeamState };

// ============================================================================
// Phase Calculation Results
// ============================================================================

export interface Phase1Result {
  memberIndex: number;
  effectiveLevel: number;
  baseAtk: number;                // After level calculation
  baseCritRate: number;           // From card stats (crit / 10000)
  baseSpeed: number;
  baseHp: number;                 // For HP-based targeting

  // Bond contributions
  atkBondBonus: number;           // ATK multiplier from bonds
  skillBondBonus: number;         // Skill damage multiplier from bonds
}

export interface Phase3AbilityContribution {
  abilityId: string;
  abilityName: string;
  sourceCardId: string;
  sourceMemberIndex: number;
  isFromAssist: boolean;
  effects: { stat: string; value: number }[];
}

export interface Phase3Result {
  memberIndex: number;

  // Accumulated ability bonuses (all additive)
  dmgBonus: number;
  critRateBonus: number;
  critDmgBonus: number;
  skillDmgBonus: number;
  speedBonus: number;
  levelBonus: number;
  hpBonus: number;           // HP% boost (for display, doesn't affect damage)
  normalDmgBonus: number;    // Normal attack damage boost (separate from skill)

  // Enemy debuffs applied by this member's abilities
  enemyShieldDebuff: number;
  enemyDefenseDebuff: number;  // Defense reduction (multiplicative with shield)

  // Source tracking for breakdown
  abilityContributions: Phase3AbilityContribution[];
}

export interface Phase4Result {
  memberIndex: number;
  computedStats: ComputedMemberStats;
  damageResult: MemberDamageResult | null;  // null for reserve
  abilityContributions: Phase3AbilityContribution[];  // Source tracking for tooltips
}

export interface TeamCalculationResult {
  members: Phase4Result[];
  teamContext: TeamContext;

  // Enemy state with team debuffs applied
  effectiveEnemyShield: number;
  effectiveEnemyDefense: number;

  // Skill debuffs from active skills (dmgTakenDebuff)
  skillDebuffTotal: number;

  // Ability debuffs (from DMG Amp abilities like Final Wave)
  abilityDebuffTotal: number;

  // Defense debuffs from abilities (reduces enemy defense)
  defenseDebuffTotal: number;

  // Race bonus (team attribute advantage over enemy)
  raceBonus: number;

  // Aggregate totals (main team only)
  totalNormalDpsExpected: number;
  totalSkillDamageExpected: number;
}

// ============================================================================
// Helper Constants
// ============================================================================

export const ATTRIBUTE_NAMES = {
  1: 'Divina',
  2: 'Phantasma',
  3: 'Anima',
  4: 'Neutral',
} as const;

export const ATTRIBUTE_IDS = {
  'Divina': 1,
  'Phantasma': 2,
  'Anima': 3,
  'Neutral': 4,
} as const;

// Card type for assist filtering
export const ASSIST_TYPE = 4;
export const ASSIST_TYPE_NAME = 'Assist';

// ============================================================================
// Fight Calculator Types
// ============================================================================

/**
 * Snapshot of member damage values at a specific skill configuration
 * Captures ALL damage skills regardless of skill toggle (toggle is for buffs)
 */
export interface FightSnapshotMember {
  memberIndex: number;
  cardName: string | null;
  dps: number;
  dpsMin: number;
  dpsMax: number;
  // Skill damage per cast (only populated if skill deals damage)
  hasDamageSkill: boolean;
  skillDamage: number;          // Expected damage per cast
  skillDamageMin: number;       // Min damage per cast
  skillDamageMax: number;       // Max damage per cast
  skillCasts: number;           // User-configured cast count for this snapshot
}

/**
 * A snapshot of team damage output at a specific configuration
 * Used to model different phases of a fight (e.g., with/without skills)
 */
export interface FightSnapshot {
  id: string;
  name: string;

  // Captured member damage values (with per-member skill casts)
  members: FightSnapshotMember[];

  // Team totals at time of capture (DPS only, skill damage is per-member)
  totalDps: number;
  totalDpsMin: number;
  totalDpsMax: number;

  // User-configurable fight parameters
  durationSeconds: number;    // How long this phase lasts (ignored if isBase)
  isBase: boolean;            // If true, fills remaining fight time automatically
}

/**
 * Results from fight damage calculation
 */
export interface FightCalculationResult {
  // Per-snapshot breakdown
  snapshotResults: Array<{
    snapshotId: string;
    dpsDamage: number;
    dpsDamageMin: number;
    dpsDamageMax: number;
    skillDamage: number;
    skillDamageMin: number;
    skillDamageMax: number;
    totalDamage: number;
    totalDamageMin: number;
    totalDamageMax: number;
  }>;

  // Fight totals
  totalDamage: number;
  totalDamageMin: number;
  totalDamageMax: number;

  // Time accounting
  totalDurationUsed: number;
  remainingDuration: number;
}
