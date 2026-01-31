/**
 * Team Damage Calculator Engine
 * Implements phased calculation that mirrors game combat flow
 */

import type { Card, Ability } from '../types/card';
// Skills data is now embedded in cards via card.skill.parsed
import {
  type TeamMemberState,
  type TeamContext,
  type EnemyState,
  type EnemyAttribute,
  type RandomTargetMode,
  type Phase1Result,
  type Phase3Result,
  type Phase3AbilityContribution,
  type Phase4Result,
  type TeamCalculationResult,
  type ParsedAbility,
  type AbilityEffect,
  type AbilityTarget,
  type AbilityTiming,
  type ComputedMemberStats,
  type MemberDamageResult,
  type DamageBreakdown,
  type StatBreakdown,
  BOND_VALUES,
  combineBondSlots,
  MAIN_TEAM_SIZE,
  TOTAL_SLOTS,
  ATTRIBUTE_NAMES,
  HEALER_TYPE,
  ASSIST_TYPE,
  RACE_BONUS_CONSTANTS,
  getAdvantageAttribute,
  getDisadvantageAttribute,
} from './team-calc-types';
import {
  DAMAGE_CAPS,
  STAT_CAPS,
  BASE_CRIT_MULT,
  LEVELS_PER_LB,
  LB_EXCEED_AVERAGE,
  LB_EXCEED_MIN,
  LB_EXCEED_MAX,
  calcAtkAtLevel,
} from './damage-calc';

// ============================================================================
// Resolved Targets with Scale Factor
// ============================================================================

/**
 * Result from resolveAbilityTargets when using average mode
 * For random-N abilities (like "2 random Divina allies"), average mode
 * distributes the effect proportionally across all eligible targets.
 *
 * Example: Ability targets "2 Divina allies" with +20% buff
 * - If 3 Divina are present: all 3 get 20% * (2/3) = 13.33% each
 * - If 2 Divina are present: both get 20% * (2/2) = 20% each
 * - If 1 Divina is present: that 1 gets 20% * (1/1) = 20%
 */
interface ResolvedTargets {
  /** Target member indices (in average mode, may include all eligible targets) */
  indices: number[];
  /** Scale factor to apply to effects (1.0 for non-average modes, N/eligible for average) */
  scaleFactor: number;
}

// ============================================================================
// Ability Parsing
// ============================================================================

// Map parsed effect types to calculator stat names
const EFFECT_TYPE_MAP: Record<string, AbilityEffect['stat']> = {
  'ATK': 'dmg',
  'SKILL_ATK': 'skillDmg',
  'CHIT': 'critRate',
  'CHIT_ATK': 'critDmg',
  'SPD': 'speed',
  'SHIELD': 'shield',
  'DEFENSE': 'defense',  // Enemy defense reduction (153 abilities use this)
  'LEVEL': 'level',
  'HP': 'hp',
  'NORM_ATK': 'normalDmg',
};

// Map parsed trigger types to timing
const TIMING_MAP: Record<string, AbilityTiming> = {
  'entry': 'passive',
  'entry_wave': 'wave_start',
  'last_wave': 'final_wave',
  'entry_leader': 'passive', // Leader abilities are passive with requiresLeader flag
  'attack_skill': 'passive', // On-skill abilities shown as passive
  'attack_normal': 'passive', // On-attack abilities shown as passive
};

// Map parsed target filter to attribute
function parseAttributeFilter(filter: string | null): 'Divina' | 'Phantasma' | 'Anima' | null {
  if (!filter) return null;
  if (filter.includes('type<1>')) return 'Divina';
  if (filter.includes('type<2>')) return 'Phantasma';
  if (filter.includes('type<3>')) return 'Anima';
  return null;
}

// Map parsed target filter to rank sort
function parseRankSort(filter: string | null): 'atk' | 'speed' | 'hp' | null {
  if (!filter) return null;
  if (filter === 'max_atk') return 'atk';
  if (filter === 'max_spd') return 'speed';
  if (filter === 'max_hp' || filter === 'min_hp' || filter === 'min_hpp') return 'hp';
  return null;
}

/**
 * Parse ability description and tags into structured targeting info.
 * Uses parsed data from pipeline when available, falls back to regex parsing.
 */
export function parseAbility(
  ability: Ability,
  sourceCardId: string,
  isFromAssist: boolean
): ParsedAbility {
  const tags = ability.tags || [];
  const parsed = ability.parsed;

  // Use parsed data if available
  if (parsed) {
    return parseAbilityFromParsedData(ability, sourceCardId, isFromAssist, parsed);
  }

  // Fall back to regex-based parsing
  return parseAbilityFromDescription(ability, sourceCardId, isFromAssist, tags);
}

/**
 * Parse ability using structured data from pipeline
 */
function parseAbilityFromParsedData(
  ability: Ability,
  sourceCardId: string,
  isFromAssist: boolean,
  parsed: NonNullable<Ability['parsed']>
): ParsedAbility {
  const tags = ability.tags || [];

  // Check tags to determine if this ability targets enemies
  // These tags indicate the ability affects enemies, not allies
  const ENEMY_TARGETING_TAGS = ['DMG Amp', 'Enemy DMG Down', 'Slow'];
  const targetsEnemyByTag = tags.some(t => ENEMY_TARGETING_TAGS.includes(t));

  // Determine targeting from parsed target
  let targetType: AbilityTarget = 'self';
  let attributeFilter: 'Divina' | 'Phantasma' | 'Anima' | null = null;
  let rankCount: number | null = null;
  let rankSortBy: 'atk' | 'speed' | 'hp' | null = null;

  // Track if this ability targets enemies (for debuff handling)
  let targetsEnemy = targetsEnemyByTag;

  // Ensure target exists before accessing
  if (!parsed.target) {
    parsed.target = { type: 'self', count: 1 };
  }

  switch (parsed.target.type) {
    case 'self':
      targetType = 'self';
      break;
    case 'team':
      targetType = 'team';
      break;
    case 'attribute':
      targetType = 'attribute';
      attributeFilter = parseAttributeFilter(parsed.target.filter || null);
      // Store count for attribute targeting (e.g., "2 allies Anima" = count 2)
      if (parsed.target.count && parsed.target.count > 0) {
        rankCount = parsed.target.count;
      }
      break;
    case 'ranked':
      // If tags indicate enemy targeting, treat as enemy ability
      if (targetsEnemyByTag) {
        targetType = 'team'; // Debuff benefits all team members
      } else {
        targetType = 'ranked';
        rankCount = parsed.target.count;
        rankSortBy = parseRankSort(parsed.target.filter || null);
      }
      break;
    case 'enemy':
    case 'current_target':
      // Enemy-targeting abilities - effects are debuffs
      targetType = 'team'; // Apply debuff benefit to all team members
      targetsEnemy = true;
      break;
  }

  // If count > 1 and not already ranked, it's team or ranked
  if (parsed.target.count > 1 && targetType === 'self') {
    targetType = 'team';
  }

  // Determine timing from parsed trigger
  const timing: AbilityTiming = TIMING_MAP[parsed.trigger || ''] || 'passive';

  // Convert parsed effects to calculator effects
  // Note: Some effects don't impact our damage calculation and are skipped
  const effects: AbilityEffect[] = [];
  for (const e of parsed.effects || []) {
    const stat = EFFECT_TYPE_MAP[e.type];
    if (!stat) continue;

    // Value is 0-100 scale, convert to 0-1 for percentages
    // Level is kept as integer
    const rawValue = stat === 'level' ? e.value : e.value / 100;

    // Mark as debuff if:
    // 1. Ability targets enemies, OR
    // 2. SHIELD/DEFENSE effect with negative value (enemies take more damage)
    const isDebuff = targetsEnemy || ((stat === 'shield' || stat === 'defense') && rawValue < 0);

    // Enemy-targeting abilities should NOT affect team stats
    // Shield/Defense debuffs are handled separately in damage calculation
    // All other enemy debuffs (speed, dmg down) are defensive and don't affect our damage
    if (targetsEnemy) {
      // Track shield debuffs (damage amp) and defense debuffs (defense reduction)
      if ((stat === 'shield' || stat === 'defense') && rawValue < 0) {
        effects.push({ stat, value: Math.abs(rawValue), isDebuff: true });
      }
      // Skip all other enemy-targeting effects - they don't change team stats
      continue;
    }

    effects.push({ stat, value: Math.abs(rawValue), isDebuff });
  }

  // Check synergy requirements from parsed conditions
  const conditions = parsed.conditions as { mns_ids?: string[] } | undefined;
  const synergyPartners = conditions?.mns_ids || ability.synergy_partners || [];

  return {
    id: ability.id,
    name: ability.name,
    description: ability.description,
    unlockLevel: ability.unlock_level || 1,
    sourceCardId,
    isFromAssist,
    targetType,
    attributeFilter,
    rankCount,
    rankSortBy,
    effects,
    synergyPartners,
    requiresLeader: parsed.trigger === 'entry_leader' || tags.includes('Leader'),
    timing,
    stackable: ability.stackable !== false,
  };
}

/**
 * Fallback parsing for abilities without parsed data.
 * NOTE: Does NOT extract effect values from descriptions - descriptions can have typos/bugs.
 * Only uses tags for basic targeting. Abilities without parsed data will have empty effects.
 */
function parseAbilityFromDescription(
  ability: Ability,
  sourceCardId: string,
  isFromAssist: boolean,
  tags: string[]
): ParsedAbility {
  // Warn in development - all abilities should have parsed data
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[team-calc] Ability "${ability.name}" (${ability.id}) has no parsed data, falling back to tag-based targeting only. Effects will be empty.`);
  }

  // Determine targeting from tags only (no regex on descriptions)
  let targetType: AbilityTarget = 'self';
  let attributeFilter: 'Divina' | 'Phantasma' | 'Anima' | null = null;
  let rankCount: number | null = null;
  let rankSortBy: 'atk' | 'speed' | 'hp' | null = null;

  // Check for team targeting
  if (tags.includes('Team')) {
    targetType = 'team';
  }

  // Check for attribute filter
  if (tags.includes('Divina')) {
    attributeFilter = 'Divina';
    if (targetType === 'team') targetType = 'attribute';
  } else if (tags.includes('Phantasma')) {
    attributeFilter = 'Phantasma';
    if (targetType === 'team') targetType = 'attribute';
  } else if (tags.includes('Anima')) {
    attributeFilter = 'Anima';
    if (targetType === 'team') targetType = 'attribute';
  }

  // Check for ranked targeting (Multi tag)
  if (tags.includes('Multi')) {
    targetType = 'ranked';
    // Default to top 2 by ATK - can't extract count without regex
    rankCount = 2;
    rankSortBy = 'atk';
  }

  // Determine timing from tags
  let timing: AbilityTiming = 'passive';
  if (tags.includes('Wave Start')) {
    timing = 'wave_start';
  } else if (tags.includes('Final Wave')) {
    timing = 'final_wave';
  }

  // No effect extraction from descriptions - return empty effects
  // This avoids bugs where description says 80% but actual value is 60%
  const effects: AbilityEffect[] = [];

  return {
    id: ability.id,
    name: ability.name,
    description: ability.description,
    unlockLevel: ability.unlock_level || 1,
    sourceCardId,
    isFromAssist,
    targetType,
    attributeFilter,
    rankCount,
    rankSortBy,
    effects,
    synergyPartners: ability.synergy_partners || [],
    requiresLeader: tags.includes('Leader'),
    timing,
    stackable: ability.stackable !== false,
  };
}

/**
 * Check if a card matches an attribute filter
 */
function matchesAttribute(card: Card | null, filter: 'Divina' | 'Phantasma' | 'Anima' | null): boolean {
  if (!filter || !card) return true;
  return card.stats.attribute_name === filter;
}

/**
 * Resolve which team members an ability targets
 *
 * @param ability - The parsed ability to resolve targets for
 * @param sourceIndex - Index of the member with this ability
 * @param teamContext - Team context with sorted indices
 * @param members - All team members
 * @param abilityTargetOverrides - User overrides for specific abilities
 * @param randomTargetMode - How to handle random/N-target abilities (default: 'best')
 * @returns ResolvedTargets with indices and scale factor
 */
export function resolveAbilityTargets(
  ability: ParsedAbility,
  sourceIndex: number,
  teamContext: TeamContext,
  members: TeamMemberState[],
  abilityTargetOverrides?: Record<string, number[]>,
  randomTargetMode: RandomTargetMode = 'best'
): ResolvedTargets {
  const noTargets: ResolvedTargets = { indices: [], scaleFactor: 1.0 };

  // Check synergy condition
  if (ability.synergyPartners.length > 0) {
    const hasPartner = ability.synergyPartners.some(partnerId =>
      teamContext.presentCardIds.has(partnerId) || teamContext.presentAssistIds.has(partnerId)
    );
    if (!hasPartner) return noTargets;
  }

  // Check leader condition
  if (ability.requiresLeader) {
    const sourceCard = members[sourceIndex]?.card;
    if (!sourceCard || sourceCard.id !== teamContext.leaderCardId) {
      return noTargets;
    }
  }

  switch (ability.targetType) {
    case 'self':
      // For assists, "self" means the card they're attached to
      return { indices: [sourceIndex], scaleFactor: 1.0 };

    case 'team':
      // All team members (main team only for damage purposes)
      return {
        indices: Array.from({ length: MAIN_TEAM_SIZE }, (_, i) => i)
          .filter(i => members[i]?.card != null),
        scaleFactor: 1.0,
      };

    case 'attribute': {
      // Filter by attribute, respecting count limit if specified
      // E.g., "2 allies Anima" = filter Anima, take first 2 by ATK
      const matchingIndices = Array.from({ length: MAIN_TEAM_SIZE }, (_, i) => i)
        .filter(i => {
          const member = members[i];
          return member?.card && matchesAttribute(member.card, ability.attributeFilter);
        });

      // If no count limit or count >= eligible, return all with full effect
      if (!ability.rankCount || ability.rankCount <= 0 || ability.rankCount >= matchingIndices.length) {
        return { indices: matchingIndices, scaleFactor: 1.0 };
      }

      // Count is specified and less than eligible targets
      // Handle based on randomTargetMode
      if (randomTargetMode === 'average') {
        // Average mode: distribute effect proportionally across ALL eligible targets
        // Scale = requestedCount / eligibleCount
        const scaleFactor = ability.rankCount / matchingIndices.length;
        return { indices: matchingIndices, scaleFactor };
      }

      // For 'best' mode (default): select top N by ATK
      // Sort matching indices by ATK (descending)
      const sortedByAtk = [...matchingIndices].sort((a, b) => {
        const atkA = members[a]?.card?.stats.max_atk || 0;
        const atkB = members[b]?.card?.stats.max_atk || 0;
        return atkB - atkA;
      });

      if (randomTargetMode === 'worst') {
        // Worst mode: select bottom N by ATK
        return { indices: sortedByAtk.slice(-ability.rankCount), scaleFactor: 1.0 };
      }
      if (randomTargetMode === 'first') {
        // First mode: select first N by slot order
        return { indices: matchingIndices.slice(0, ability.rankCount), scaleFactor: 1.0 };
      }
      if (randomTargetMode === 'last') {
        // Last mode: select last N by slot order
        return { indices: matchingIndices.slice(-ability.rankCount), scaleFactor: 1.0 };
      }

      // Default 'best' mode: top N by ATK
      return { indices: sortedByAtk.slice(0, ability.rankCount), scaleFactor: 1.0 };
    }

    case 'ranked': {
      // Check for user override first
      if (abilityTargetOverrides?.[ability.id]) {
        const override = abilityTargetOverrides[ability.id];
        // Validate override targets exist and are in main team
        return {
          indices: override.filter(idx =>
            idx >= 0 && idx < MAIN_TEAM_SIZE && members[idx]?.card != null
          ),
          scaleFactor: 1.0,
        };
      }

      // Top N by stat (automatic selection)
      if (!ability.rankCount || !ability.rankSortBy) {
        return noTargets;
      }

      let sortedIndices: number[];
      switch (ability.rankSortBy) {
        case 'atk':
          sortedIndices = teamContext.byAtk;
          break;
        case 'speed':
          sortedIndices = teamContext.bySpeed;
          break;
        case 'hp':
          sortedIndices = teamContext.byHp;
          break;
        default:
          sortedIndices = teamContext.byAtk;
      }

      // For ranked targeting (like "top 2 ATK"), averaging doesn't apply
      // because the stat-based ranking is deterministic
      return { indices: sortedIndices.slice(0, ability.rankCount), scaleFactor: 1.0 };
    }

    default:
      return { indices: [sourceIndex], scaleFactor: 1.0 };
  }
}

// ============================================================================
// Phase 1: Calculate Base Stats
// ============================================================================

/**
 * Calculate base stats for each team member (level, ATK, etc.)
 */
export function calculatePhase1BaseStats(
  members: TeamMemberState[]
): Phase1Result[] {
  return members.map((member, index) => {
    if (!member.card) {
      return {
        memberIndex: index,
        effectiveLevel: 0,
        baseAtk: 0,
        baseCritRate: 0,
        baseSpeed: 0,
        baseHp: 0,
        atkBondBonus: 0,
        skillBondBonus: 0,
      };
    }

    const card = member.card;
    const stats = card.stats;

    // Calculate effective level from LB + level bonus
    const lbLevels = member.limitBreak * LEVELS_PER_LB;
    const effectiveLevel = stats.max_level + lbLevels + member.levelBonus;

    // Calculate ATK at effective level
    const baseAtk = calcAtkAtLevel(stats.base_atk, stats.max_atk, stats.max_level, effectiveLevel);

    // Base crit rate from card stats
    const baseCritRate = stats.crit / 10000;

    // Base speed and HP
    const baseSpeed = stats.speed;
    const baseHp = calcAtkAtLevel(stats.base_hp, stats.max_hp, stats.max_level, effectiveLevel);

    // Bond contributions (three bond slots combined)
    // Note: bond3 is locked to 'none' if assist is selected
    const bondValues = combineBondSlots(member.bond1, member.bond2, member.bond3);
    let atkBondBonus = bondValues.atk;
    let skillBondBonus = bondValues.skill;

    // Add assist bond contribution if assist has bonds
    if (member.assistCard) {
      // Assist cards typically provide 5% bond
      // Check the assist's bond type if stored, otherwise use default
      const assistBonds = member.assistCard.bonds || [];
      for (const bond of assistBonds) {
        if (bond.type === 'Attack') {
          atkBondBonus += bond.bonus_percent / 100;
        } else if (bond.type === 'Skill') {
          skillBondBonus += bond.bonus_percent / 100;
        }
      }
    }

    return {
      memberIndex: index,
      effectiveLevel,
      baseAtk,
      baseCritRate,
      baseSpeed,
      baseHp,
      atkBondBonus,
      skillBondBonus,
    };
  });
}

// ============================================================================
// Phase 2: Build Team Context
// ============================================================================

/**
 * Build team context for ability targeting resolution
 */
export function calculatePhase2TeamContext(
  phase1Results: Phase1Result[],
  members: TeamMemberState[]
): TeamContext {
  // Filter to members with cards and get sorted indices
  const mainTeamWithCards = phase1Results
    .slice(0, MAIN_TEAM_SIZE)
    .filter(r => members[r.memberIndex]?.card != null);

  // Sort by ATK with bonds applied (descending)
  // This ensures bond changes affect ability targeting correctly
  const byAtk = [...mainTeamWithCards]
    .sort((a, b) => {
      const atkA = a.baseAtk * (1 + a.atkBondBonus);
      const atkB = b.baseAtk * (1 + b.atkBondBonus);
      return atkB - atkA;
    })
    .map(r => r.memberIndex);

  // Sort by Speed stat (descending)
  // Note: Higher speed stat = longer attack interval = slower attacks (inverted from typical conventions)
  // This sort is for ability targeting (e.g., "2 allies with highest ATK speed"), not attack order
  const bySpeed = [...mainTeamWithCards]
    .sort((a, b) => b.baseSpeed - a.baseSpeed)
    .map(r => r.memberIndex);

  // Sort by HP (descending)
  const byHp = [...mainTeamWithCards]
    .sort((a, b) => b.baseHp - a.baseHp)
    .map(r => r.memberIndex);

  // All members (including reserve) sorted by ATK with bonds
  const allWithCards = phase1Results.filter(r => members[r.memberIndex]?.card != null);
  const allByAtk = [...allWithCards]
    .sort((a, b) => {
      const atkA = a.baseAtk * (1 + a.atkBondBonus);
      const atkB = b.baseAtk * (1 + b.atkBondBonus);
      return atkB - atkA;
    })
    .map(r => r.memberIndex);

  // Count attributes
  const attributeCounts = { divina: 0, phantasma: 0, anima: 0 };
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const card = members[i]?.card;
    if (card) {
      const attr = card.stats.attribute_name;
      if (attr === 'Divina') attributeCounts.divina++;
      else if (attr === 'Phantasma') attributeCounts.phantasma++;
      else if (attr === 'Anima') attributeCounts.anima++;
    }
  }

  // Collect present card IDs
  const presentCardIds = new Set<string>();
  const presentAssistIds = new Set<string>();
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (members[i]?.card) {
      presentCardIds.add(members[i].card!.id);
    }
    if (members[i]?.assistCard) {
      presentAssistIds.add(members[i].assistCard!.id);
    }
  }

  // Leader is index 0
  const leaderCardId = members[0]?.card?.id || null;

  return {
    byAtk,
    bySpeed,
    byHp,
    allByAtk,
    attributeCounts,
    presentCardIds,
    presentAssistIds,
    leaderCardId,
  };
}

// ============================================================================
// Phase 3: Apply Abilities
// ============================================================================

/**
 * Apply abilities and calculate bonus stats for each member
 *
 * @param members - All team members
 * @param phase1Results - Base stats from Phase 1
 * @param teamContext - Team context with sorted indices
 * @param enemy - Enemy state (for wave conditions)
 * @param abilityTargetOverrides - User overrides for specific abilities
 * @param randomTargetMode - How to handle random/N-target abilities (default: 'best')
 */
export function calculatePhase3ApplyAbilities(
  members: TeamMemberState[],
  phase1Results: Phase1Result[],
  teamContext: TeamContext,
  enemy: EnemyState,
  abilityTargetOverrides?: Record<string, number[]>,
  randomTargetMode: RandomTargetMode = 'best'
): Phase3Result[] {
  // Initialize results for all members
  const results: Phase3Result[] = members.map((_, index) => ({
    memberIndex: index,
    dmgBonus: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    skillDmgBonus: 0,
    speedBonus: 0,
    levelBonus: 0,
    hpBonus: 0,
    normalDmgBonus: 0,
    enemyShieldDebuff: 0,
    enemyDefenseDebuff: 0,
    abilityContributions: [],
  }));

  // Track non-stackable abilities to avoid applying twice
  const appliedNonStackable = new Set<string>();

  // Track enemy debuffs that have been applied (should only apply ONCE per ability, not per target)
  // Key: ability ID, Value: true if already applied
  const appliedEnemyDebuffs = new Set<string>();

  // Process each member's abilities
  for (let sourceIndex = 0; sourceIndex < TOTAL_SLOTS; sourceIndex++) {
    const member = members[sourceIndex];
    if (!member?.card) continue;

    // Collect abilities from card and assist that are unlocked by level
    const abilities: ParsedAbility[] = [];
    const effectiveLevel = phase1Results[sourceIndex].effectiveLevel;

    // Card abilities - auto-activate if level requirement is met
    for (const ability of member.card.abilities || []) {
      const unlockLevel = ability.unlock_level || 1;
      if (effectiveLevel >= unlockLevel) {
        // Skip "On Skill" abilities - they're parsed separately for skill buffs
        if (ability.tags?.includes('On Skill')) continue;
        abilities.push(parseAbility(ability, member.card.id, false));
      }
    }

    // Assist abilities - always unlocked (we don't track assist card level separately)
    if (member.assistCard) {
      for (const ability of member.assistCard.abilities || []) {
        // Skip "On Skill" abilities
        if (ability.tags?.includes('On Skill')) continue;
        // For assists, the source index is still the member index (abilities apply relative to main card)
        abilities.push(parseAbility(ability, member.assistCard.id, true));
      }
    }

    // Apply each ability
    for (const ability of abilities) {
      // Skip if non-stackable and already applied
      // Non-stackable abilities (o: false) only take effect ONCE per team, regardless of source
      if (!ability.stackable) {
        const stackKey = ability.id; // Just ability ID for true once-per-team
        if (appliedNonStackable.has(stackKey)) continue;
        appliedNonStackable.add(stackKey);
      }

      // Check wave-based timing conditions
      if (ability.timing === 'final_wave' && !enemy.isFinalWave) {
        continue; // Skip Final Wave abilities if not on final wave
      }

      // Wave Start abilities stack based on wave count
      const waveMultiplier = ability.timing === 'wave_start' ? enemy.waveCount : 1;

      // Resolve targets (includes scale factor for average mode)
      const resolved = resolveAbilityTargets(ability, sourceIndex, teamContext, members, abilityTargetOverrides, randomTargetMode);
      if (resolved.indices.length === 0) continue;

      // Apply effects to each target
      for (const targetIndex of resolved.indices) {
        if (targetIndex >= results.length) continue;

        const contribution: Phase3AbilityContribution = {
          abilityId: ability.id,
          abilityName: ability.name,
          sourceCardId: ability.sourceCardId,
          sourceMemberIndex: sourceIndex,
          isFromAssist: ability.isFromAssist,
          effects: [],
        };

        for (const effect of ability.effects) {
          // Apply scale factor for average mode (distributes effect across eligible targets)
          const scaledValue = effect.value * waveMultiplier * resolved.scaleFactor;
          contribution.effects.push({ stat: effect.stat, value: scaledValue });

          switch (effect.stat) {
            case 'dmg':
              results[targetIndex].dmgBonus += scaledValue;
              break;
            case 'critRate':
              results[targetIndex].critRateBonus += scaledValue;
              break;
            case 'critDmg':
              results[targetIndex].critDmgBonus += scaledValue;
              break;
            case 'skillDmg':
              results[targetIndex].skillDmgBonus += scaledValue;
              break;
            case 'speed':
              results[targetIndex].speedBonus += scaledValue;
              break;
            case 'level':
              results[targetIndex].levelBonus += scaledValue;
              break;
            case 'hp':
              results[targetIndex].hpBonus += scaledValue;
              break;
            case 'normalDmg':
              results[targetIndex].normalDmgBonus += scaledValue;
              break;
            case 'shield':
              if (effect.isDebuff) {
                // Enemy shield debuffs should only be applied ONCE per ability, not per target
                // Use ability.id as the key to ensure each ability's debuff is only counted once
                const debuffKey = `${ability.id}-shield`;
                if (!appliedEnemyDebuffs.has(debuffKey)) {
                  appliedEnemyDebuffs.add(debuffKey);
                  // Apply to first target only (index 0) since this is a team-wide enemy debuff
                  results[0].enemyShieldDebuff += scaledValue;
                }
              }
              break;
            case 'defense':
              if (effect.isDebuff) {
                // Enemy defense debuffs - applied ONCE per ability like shield
                const debuffKey = `${ability.id}-defense`;
                if (!appliedEnemyDebuffs.has(debuffKey)) {
                  appliedEnemyDebuffs.add(debuffKey);
                  results[0].enemyDefenseDebuff += scaledValue;
                }
              }
              break;
          }
        }

        if (contribution.effects.length > 0) {
          results[targetIndex].abilityContributions.push(contribution);
        }
      }
    }
  }

  return results;
}

// ============================================================================
// Race Bonus Calculation
// ============================================================================

/**
 * Calculate team race bonus/penalty based on enemy attribute
 * RE Validated (2025-12-24 via Ghidra): CaucalRaceOverTeamBonus at 0x00C02644
 *
 * Race triangle (who has advantage):
 * - Anima beats Divina
 * - Divina beats Phantasma
 * - Phantasma beats Anima
 *
 * Bonus/Penalty mechanic:
 * - If YOUR leader has advantage over enemy: +10% base + 5% per team member matching leader's type
 * - If YOUR leader has disadvantage: -10% base - 5% per team member matching leader's type
 * - Member count includes main team (5), reserve (2), and assists (up to 7)
 * - Max bonus: +45%, Max penalty: -45%
 *
 * @param members Team members array
 * @param enemyAttribute Enemy attribute (use 'None' to disable)
 * @returns Total race bonus as decimal (+0.45 = 45% bonus, -0.45 = 45% penalty)
 */
export function calculateRaceBonus(
  members: TeamMemberState[],
  enemyAttribute: EnemyAttribute
): number {
  if (enemyAttribute === 'None') return 0;

  const leader = members[0]?.card;
  if (!leader) return 0;

  const leaderAttr = leader.stats.attribute_name as 'Divina' | 'Phantasma' | 'Anima' | 'Neutral' | undefined;
  if (!leaderAttr || leaderAttr === 'Neutral') return 0;

  const advantageAttr = getAdvantageAttribute(enemyAttribute);
  const disadvantageAttr = getDisadvantageAttribute(enemyAttribute);

  // Determine if leader has advantage, disadvantage, or neutral
  let multiplier = 0;
  if (leaderAttr === advantageAttr) {
    multiplier = 1;  // Advantage: positive bonus
  } else if (leaderAttr === disadvantageAttr) {
    multiplier = -1; // Disadvantage: negative penalty
  } else {
    return 0; // Neutral matchup
  }

  let bonus = 0;

  // Leader bonus/penalty (±10%)
  bonus += RACE_BONUS_CONSTANTS.leaderBonus;

  // Member bonus/penalty (±5% each for members matching leader's type)
  // Main team slots 0-4
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    if (members[i]?.card?.stats.attribute_name === leaderAttr) {
      bonus += RACE_BONUS_CONSTANTS.memberBonus;
    }
  }

  // Reserve slots 5-6
  for (let i = MAIN_TEAM_SIZE; i < TOTAL_SLOTS; i++) {
    if (members[i]?.card?.stats.attribute_name === leaderAttr) {
      bonus += RACE_BONUS_CONSTANTS.memberBonus;
    }
  }

  // Assist bonus/penalty (±5% each for assists matching leader's type)
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    if (members[i]?.assistCard?.stats.attribute_name === leaderAttr) {
      bonus += RACE_BONUS_CONSTANTS.assistBonus;
    }
  }

  return bonus * multiplier;
}

// ============================================================================
// Phase 4: Calculate Final Stats and Damage
// ============================================================================

/**
 * Calculate final stats and damage for each member
 *
 * Updates in RE audit (2026-01):
 * - Added LB exceed multiplier (avg 12.5% at LB5)
 * - Added separate defense calculation (multiplicative with shield)
 * - Added race bonus calculation
 * - Fixed skill base damage to use card level instead of skill max level
 */
export function calculatePhase4FinalDamage(
  phase1Results: Phase1Result[],
  phase3Results: Phase3Result[],
  enemy: EnemyState,
  members: TeamMemberState[],
  skillDebuffTotal: number = 0,
  totalEnemyShieldDebuff: number = 0,
  totalEnemyDefenseDebuff: number = 0,
  raceBonus: number = 0
): Phase4Result[] {
  return members.map((member, index) => {
    const phase1 = phase1Results[index];
    const phase3 = phase3Results[index];

    if (!member.card) {
      return {
        memberIndex: index,
        computedStats: createEmptyComputedStats(),
        damageResult: null,
        abilityContributions: [],
      };
    }

    // Calculate final level (base + ability level bonus)
    const finalLevel = phase1.effectiveLevel + phase3.levelBonus;

    // Recalculate ATK at final level
    const stats = member.card.stats;
    const finalAtk = calcAtkAtLevel(stats.base_atk, stats.max_atk, stats.max_level, finalLevel);

    // Apply ATK bond bonus (multiplicative)
    const displayAtk = finalAtk * (1 + phase1.atkBondBonus);

    // Internal ATK (display / 10)
    const effectiveAtk = displayAtk / 10;

    // Crit rate with bonuses, capped at 100%
    const effectiveCritRate = Math.min(
      phase1.baseCritRate + phase3.critRateBonus,
      STAT_CAPS.critRate
    );

    // Crit damage multiplier
    const effectiveCritDmg = BASE_CRIT_MULT + phase3.critDmgBonus;

    // Expected crit multiplier
    const expectedCritMult = 1 + effectiveCritRate * (effectiveCritDmg - 1);

    // Speed with bonuses
    // Formula validated 2026-01-06 via Frida timing: interval = (speed + 750) / 900
    const baseInterval = (stats.speed + 750) / 900;
    let effectiveSpeed: number;
    if (phase3.speedBonus >= 0) {
      const cappedBonus = Math.min(phase3.speedBonus, STAT_CAPS.speedBuff);
      effectiveSpeed = baseInterval * (1 - cappedBonus / 2);
    } else {
      const cappedDebuff = Math.max(phase3.speedBonus, STAT_CAPS.speedDebuff);
      effectiveSpeed = baseInterval * (1 + Math.abs(cappedDebuff));
    }
    const attackInterval = Math.max(effectiveSpeed, 0.5);

    // Total DMG and Skill DMG bonuses
    const totalDmgBonus = phase3.dmgBonus;
    const totalNormalDmgBonus = phase3.normalDmgBonus;  // Normal attack specific modifier
    const totalSkillDmgBonus = phase1.skillBondBonus + phase3.skillDmgBonus;

    // Build stat breakdown
    const breakdown: StatBreakdown = {
      level: {
        base: stats.max_level,
        limitBreak: member.limitBreak * LEVELS_PER_LB,
        bonus: member.levelBonus,
        abilities: phase3.levelBonus,
        total: finalLevel,
      },
      atk: {
        base: finalAtk,
        bond: finalAtk * phase1.atkBondBonus,
        assist: 0, // Included in bond
        abilities: 0, // ATK abilities are rare
        total: displayAtk,
      },
      critRate: {
        base: phase1.baseCritRate,
        bond: 0,
        assist: 0,
        abilities: phase3.critRateBonus,
        total: effectiveCritRate,
      },
      critDmg: {
        base: BASE_CRIT_MULT,
        bond: 0,
        assist: 0,
        abilities: phase3.critDmgBonus,
        total: effectiveCritDmg,
      },
      dmg: {
        abilities: phase3.dmgBonus,
        total: totalDmgBonus,
      },
      skillDmg: {
        bond: phase1.skillBondBonus,
        assist: 0,
        abilities: phase3.skillDmgBonus,
        total: totalSkillDmgBonus,
      },
      speed: {
        base: stats.speed,
        bond: 0,
        assist: 0,
        abilities: phase3.speedBonus, // Speed bonus percentage (not multiplied by stat)
        total: stats.speed, // Raw speed stat (interval is calculated separately)
      },
    };

    const computedStats: ComputedMemberStats = {
      effectiveLevel: finalLevel,
      displayAtk,
      effectiveSpeed: stats.speed, // Raw speed stat (attack interval handles bonuses)
      effectiveCritRate,
      effectiveCritDmg,
      dmgBonus: totalDmgBonus,
      skillDmgBonus: totalSkillDmgBonus,
      attackInterval,
      breakdown,
    };

    // Calculate damage only for main team members
    let damageResult: MemberDamageResult | null = null;
    if (!member.isReserve) {
      // Check if card is a healer by role (stats.type === 3)
      // Note: checking skill type (HEAL/HEAL_DOT) misses healers with buff skills (e.g. Campanella)
      const isHealer = member.card.stats.type === HEALER_TYPE;

      // If healersDontAttack is enabled and this is a healer, return 0 damage
      if (enemy.healersDontAttack && isHealer) {
        damageResult = {
          normalDamage: 0,
          normalDamageMin: 0,
          normalDamageMax: 0,
          normalDamageCrit: 0,
          normalDamageCritMin: 0,
          normalDamageCritMax: 0,
          normalDamageExpected: 0,
          normalDamageCapped: false,
          normalDps: 0,
          normalDpsMin: 0,
          normalDpsMax: 0,
          skillBaseDamage: 0,
          skillDamage: 0,
          skillDamageMin: 0,
          skillDamageMax: 0,
          skillDamageCrit: 0,
          skillDamageCritMin: 0,
          skillDamageCritMax: 0,
          skillDamageExpected: 0,
          skillDamageExpectedMin: 0,
          skillDamageExpectedMax: 0,
          skillDamageCapped: false,
        };
      } else {
      // LB Exceed multiplier (RE Validated 2025-12-24)
      // Formula: Random(0, 5% × LB_level), see CalculateExceedValue.md
      // LB0 = 0%, LB1 = 0-5% (avg 2.5%), LB2 = 0-10% (avg 5%), etc.
      // LB4/MLB = 0-20% (avg 10%)
      const exceedMult = LB_EXCEED_AVERAGE[member.limitBreak] ?? 1.0;
      const exceedMultMin = LB_EXCEED_MIN[member.limitBreak] ?? 1.0;
      const exceedMultMax = LB_EXCEED_MAX[member.limitBreak] ?? 1.0;

      // Apply enemy defense (separate from shield, multiplicative)
      // RE Validated: Defense uses LINEAR formula same as shield
      // Apply defense debuffs from abilities (reduces enemy defense = we deal more damage)
      const rawDefense = enemy.baseDefense - totalEnemyDefenseDebuff;
      const effectiveDefense = Math.max(0, Math.min(rawDefense, STAT_CAPS.shieldMax));
      const defenseMult = 1 - effectiveDefense;

      // Apply enemy shield with ability debuffs + skill debuffs (team-wide)
      // RE Validated: All debuffs go into same pool, stacking is ADDITIVE
      // World Boss mode: ignoreShieldCap bypasses the -75% floor
      const rawShieldValue = enemy.baseShield - totalEnemyShieldDebuff - skillDebuffTotal;
      const effectiveShield = enemy.ignoreShieldCap
        ? Math.min(rawShieldValue, STAT_CAPS.shieldMax)
        : Math.max(STAT_CAPS.shieldMin, Math.min(rawShieldValue, STAT_CAPS.shieldMax));
      const shieldMult = 1 - effectiveShield;

      // Apply World Boss bonus multiplier (manual adjustment for testing)
      const worldBossMult = enemy.worldBossBonus ?? 1.0;

      // Race bonus multiplier (RE Validated 2025-12-24)
      const raceMult = 1 + raceBonus;

      // Normal damage calculation
      // Formula: ATK × exceedMult × dmgMult × normalDmgMult × raceMult × defenseMult × shieldMult × worldBossMult
      // RE Validated: DoNormalDamageModify is a separate multiplier from DoDamageModify
      // RE Validated 2026-01-16: Combo bonus is cosmetic only (no damage effect)
      const dmgMult = 1 + totalDmgBonus;
      const normalDmgMult = 1 + totalNormalDmgBonus;  // Normal attack specific (DoNormalDamageModify)
      const normalBase = effectiveAtk * exceedMult * dmgMult * normalDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const normalBaseMin = effectiveAtk * exceedMultMin * dmgMult * normalDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const normalBaseMax = effectiveAtk * exceedMultMax * dmgMult * normalDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const normalDamage = Math.min(Math.round(normalBase), DAMAGE_CAPS.normal);
      const normalDamageMin = Math.min(Math.round(normalBaseMin), DAMAGE_CAPS.normal);
      const normalDamageMax = Math.min(Math.round(normalBaseMax), DAMAGE_CAPS.normal);
      const normalDamageCrit = Math.min(Math.round(normalBase * effectiveCritDmg), DAMAGE_CAPS.normal);
      const normalDamageCritMin = Math.min(Math.round(normalBaseMin * effectiveCritDmg), DAMAGE_CAPS.normal);
      const normalDamageCritMax = Math.min(Math.round(normalBaseMax * effectiveCritDmg), DAMAGE_CAPS.normal);
      const normalDamageExpected = Math.min(Math.round(normalBase * expectedCritMult), DAMAGE_CAPS.normal);
      const normalDamageExpectedMin = Math.min(Math.round(normalBaseMin * expectedCritMult), DAMAGE_CAPS.normal);
      const normalDamageExpectedMax = Math.min(Math.round(normalBaseMax * expectedCritMult), DAMAGE_CAPS.normal);
      const normalDamageCapped = normalDamageCrit >= DAMAGE_CAPS.normal;

      // DPS
      const attacksPerSecond = 1 / attackInterval;
      const normalDps = Math.round(normalDamageExpected * attacksPerSecond);
      const normalDpsMin = Math.round(normalDamageExpectedMin * attacksPerSecond);
      const normalDpsMax = Math.round(normalDamageExpectedMax * attacksPerSecond);

      // Skill damage - uses parsed data embedded in card
      // Only count damage for attack skills (immediate.type === 'ATK')
      // HEAL skills and pure buff skills have slv1/slvup for non-damage values
      // e.g., "Deals 4,682 DMG" = slv1 + slvup*(level-1) = 4682
      let skillBaseDamage = 0;
      if (member.card.skill?.parsed) {
        const parsed = member.card.skill.parsed;
        // Only count as damage if skill is an attack (not heal or buff)
        const isAttackSkill = parsed.immediate?.type === 'ATK';
        if (isAttackSkill) {
          // Skill level scales with card level (NOT capped at ml)
          // User verified: level 90 cards show skill values above ml calculation
          const skillLevel = finalLevel;
          // Skill base damage = slv1 + (level-1) * slvup
          skillBaseDamage = (parsed.slv1 || 0) + (skillLevel - 1) * (parsed.slvup || 0);
        }
      }

      const skillDmgMult = 1 + totalSkillDmgBonus;
      const skillBase = skillBaseDamage * exceedMult * dmgMult * skillDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const skillBaseMin = skillBaseDamage * exceedMultMin * dmgMult * skillDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const skillBaseMax = skillBaseDamage * exceedMultMax * dmgMult * skillDmgMult * raceMult * defenseMult * shieldMult * worldBossMult;
      const skillDamage = Math.min(Math.round(skillBase), DAMAGE_CAPS.skill);
      const skillDamageMin = Math.min(Math.round(skillBaseMin), DAMAGE_CAPS.skill);
      const skillDamageMax = Math.min(Math.round(skillBaseMax), DAMAGE_CAPS.skill);
      const skillDamageCrit = Math.min(Math.round(skillBase * effectiveCritDmg), DAMAGE_CAPS.skill);
      const skillDamageCritMin = Math.min(Math.round(skillBaseMin * effectiveCritDmg), DAMAGE_CAPS.skill);
      const skillDamageCritMax = Math.min(Math.round(skillBaseMax * effectiveCritDmg), DAMAGE_CAPS.skill);
      const skillDamageExpected = Math.min(Math.round(skillBase * expectedCritMult), DAMAGE_CAPS.skill);
      const skillDamageExpectedMin = Math.min(Math.round(skillBaseMin * expectedCritMult), DAMAGE_CAPS.skill);
      const skillDamageExpectedMax = Math.min(Math.round(skillBaseMax * expectedCritMult), DAMAGE_CAPS.skill);
      const skillDamageCapped = skillDamageCrit >= DAMAGE_CAPS.skill;

      // Build damage breakdown for debug display
      const dmgBreakdown: DamageBreakdown = {
        effectiveAtk,
        skillBaseDamage,
        attackInterval,
        exceedMult,
        dmgMult,
        normalDmgMult,
        skillDmgMult,
        defenseMult,
        shieldMult,
        raceMult,
        worldBossMult,
        effectiveCritRate,
        effectiveCritDmg,
        expectedCritMult,
        normalBaseRaw: normalBase,
        skillBaseRaw: skillBase,
      };

      damageResult = {
        normalDamage,
        normalDamageMin,
        normalDamageMax,
        normalDamageCrit,
        normalDamageCritMin,
        normalDamageCritMax,
        normalDamageExpected,
        normalDamageCapped,
        normalDps,
        normalDpsMin,
        normalDpsMax,
        skillBaseDamage,
        skillDamage,
        skillDamageMin,
        skillDamageMax,
        skillDamageCrit,
        skillDamageCritMin,
        skillDamageCritMax,
        skillDamageExpected,
        skillDamageExpectedMin,
        skillDamageExpectedMax,
        skillDamageCapped,
        breakdown: dmgBreakdown,
      };
      } // End else (non-healer damage calculation)
    }

    return {
      memberIndex: index,
      computedStats,
      damageResult,
      abilityContributions: phase3.abilityContributions,
    };
  });
}

function createEmptyComputedStats(): ComputedMemberStats {
  return {
    effectiveLevel: 0,
    displayAtk: 0,
    effectiveSpeed: 0,
    effectiveCritRate: 0,
    effectiveCritDmg: BASE_CRIT_MULT,
    dmgBonus: 0,
    skillDmgBonus: 0,
    attackInterval: 0,
    breakdown: {
      level: { base: 0, limitBreak: 0, bonus: 0, abilities: 0, total: 0 },
      atk: { base: 0, bond: 0, assist: 0, abilities: 0, total: 0 },
      critRate: { base: 0, bond: 0, assist: 0, abilities: 0, total: 0 },
      critDmg: { base: 0, bond: 0, assist: 0, abilities: 0, total: 0 },
      dmg: { abilities: 0, total: 0 },
      skillDmg: { bond: 0, assist: 0, abilities: 0, total: 0 },
      speed: { base: 0, bond: 0, assist: 0, abilities: 0, total: 0 },
    },
  };
}

// ============================================================================
// Main Calculation Entry Point
// ============================================================================

/**
 * Run all 4 phases and return complete team calculation results
 *
 * @param members - All team members
 * @param enemy - Enemy state
 * @param abilityTargetOverrides - User overrides for specific abilities
 * @param randomTargetMode - How to handle random/N-target abilities (default: 'best')
 */
export function calculateTeamDamage(
  members: TeamMemberState[],
  enemy: EnemyState,
  abilityTargetOverrides?: Record<string, number[]>,
  randomTargetMode: RandomTargetMode = 'best'
): TeamCalculationResult {
  // Phase 1: Base stats
  const phase1Results = calculatePhase1BaseStats(members);

  // Phase 2: Team context
  const teamContext = calculatePhase2TeamContext(phase1Results, members);

  // Phase 3: Apply abilities (with wave-based conditions)
  const phase3Results = calculatePhase3ApplyAbilities(members, phase1Results, teamContext, enemy, abilityTargetOverrides, randomTargetMode);

  // Apply skill buffs from active skills to phase3 results
  // This handles ally buffs (dmgBonus, critRate, etc.) from activated skills
  // Now with attribution tracking
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const member = members[i];
    if (!member.skillActive || !member.skillEffect) continue;

    const skillEffect = member.skillEffect;
    const buffs = skillEffect.buffs;
    const skillName = member.card?.skill?.name || 'Skill';
    const sourceCardId = member.card?.id || '';

    // Helper to apply buffs with attribution
    const applySkillBuffs = (targetIdx: number) => {
      if (!members[targetIdx]?.card) return;

      const effects: Phase3AbilityContribution['effects'] = [];

      if (buffs.dmgBonus) {
        phase3Results[targetIdx].dmgBonus += buffs.dmgBonus;
        effects.push({ stat: 'dmg', value: buffs.dmgBonus });
      }
      if (buffs.critRateBonus) {
        phase3Results[targetIdx].critRateBonus += buffs.critRateBonus;
        effects.push({ stat: 'critRate', value: buffs.critRateBonus });
      }
      if (buffs.critDmgBonus) {
        phase3Results[targetIdx].critDmgBonus += buffs.critDmgBonus;
        effects.push({ stat: 'critDmg', value: buffs.critDmgBonus });
      }
      if (buffs.speedBonus) {
        phase3Results[targetIdx].speedBonus += buffs.speedBonus;
        effects.push({ stat: 'speed', value: buffs.speedBonus });
      }

      // Add contribution for attribution
      if (effects.length > 0) {
        phase3Results[targetIdx].abilityContributions.push({
          abilityId: `skill-${sourceCardId}`,
          abilityName: `${skillName} (Skill)`,
          sourceCardId,
          sourceMemberIndex: i,
          isFromAssist: false,
          effects,
        });
      }
    };

    // Determine which members receive the buff based on target type
    if (skillEffect.targetType === 'ally') {
      // AoE ally buff - apply to all main team members
      if (skillEffect.targetCount === 99 || skillEffect.targetCount >= 5) {
        for (let j = 0; j < MAIN_TEAM_SIZE; j++) {
          applySkillBuffs(j);
        }
      } else if (skillEffect.targetCount > 1) {
        // Multi-target - apply to top N by ATK
        const targets = teamContext.byAtk.slice(0, skillEffect.targetCount);
        for (const targetIdx of targets) {
          applySkillBuffs(targetIdx);
        }
      } else {
        // Single target - apply to highest ATK ally
        const targetIdx = teamContext.byAtk[0];
        if (targetIdx !== undefined) {
          applySkillBuffs(targetIdx);
        }
      }
    } else if (skillEffect.targetType === 'self') {
      // Self-only buff
      applySkillBuffs(i);
    }
    // Note: enemy-targeting skills don't add ally buffs, only debuffs handled below
  }

  // Calculate skill debuff total from active skills (main team only)
  // This reduces enemy shield (enemy takes more damage)
  let skillDebuffTotal = 0;
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const member = members[i];
    if (member.skillActive && member.skillEffect) {
      skillDebuffTotal += member.skillEffect.buffs.dmgTakenDebuff || 0;
    }
  }

  // Calculate total enemy shield debuff from abilities (must be before Phase 4)
  let totalEnemyShieldDebuff = 0;
  let totalEnemyDefenseDebuff = 0;
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    totalEnemyShieldDebuff += phase3Results[i].enemyShieldDebuff;
    totalEnemyDefenseDebuff += phase3Results[i].enemyDefenseDebuff;
  }

  // Calculate race bonus (RE Validated 2025-12-24)
  // Returns 0 if enemy.attribute is 'None' (disabled by default)
  const raceBonus = calculateRaceBonus(members, enemy.attribute);

  // Phase 4: Final damage (with skill debuffs, ability debuffs, and race bonus applied)
  const phase4Results = calculatePhase4FinalDamage(
    phase1Results, phase3Results, enemy, members, skillDebuffTotal, totalEnemyShieldDebuff, totalEnemyDefenseDebuff, raceBonus
  );

  // Calculate team totals (main team only)
  let totalNormalDpsExpected = 0;
  let totalSkillDamageExpected = 0;

  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const result = phase4Results[i];
    if (result.damageResult) {
      totalNormalDpsExpected += result.damageResult.normalDps;
      totalSkillDamageExpected += result.damageResult.skillDamageExpected;
    }
  }

  // Calculate effective shield with optional cap bypass (World Boss mode)
  const rawShield = enemy.baseShield - totalEnemyShieldDebuff - skillDebuffTotal;
  const effectiveEnemyShield = enemy.ignoreShieldCap
    ? Math.min(rawShield, STAT_CAPS.shieldMax) // Only cap at +85%, no floor
    : Math.max(STAT_CAPS.shieldMin, Math.min(rawShield, STAT_CAPS.shieldMax)); // Full cap: -75% to +85%

  const rawDefense = enemy.baseDefense - totalEnemyDefenseDebuff;
  const effectiveEnemyDefense = Math.max(0, Math.min(rawDefense, STAT_CAPS.shieldMax));

  return {
    members: phase4Results,
    teamContext,
    effectiveEnemyShield,
    effectiveEnemyDefense,
    totalNormalDpsExpected,
    totalSkillDamageExpected,
    skillDebuffTotal,
    abilityDebuffTotal: totalEnemyShieldDebuff,
    defenseDebuffTotal: totalEnemyDefenseDebuff,
    raceBonus,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a card is an assist card
 */
export function isAssistCard(card: Card): boolean {
  return card.stats.type === ASSIST_TYPE || card.stats.type_name === 'Assist';
}

/**
 * Get all abilities for a member (card + assist) with level check
 */
export function getMemberAbilities(member: TeamMemberState, effectiveLevel: number): Array<{
  ability: Ability;
  isFromAssist: boolean;
  sourceCard: Card;
  isActive: boolean;
  isOnSkill: boolean;
}> {
  const abilities: Array<{
    ability: Ability;
    isFromAssist: boolean;
    sourceCard: Card;
    isActive: boolean;
    isOnSkill: boolean;
  }> = [];

  if (member.card) {
    for (const ability of member.card.abilities || []) {
      const unlockLevel = ability.unlock_level || 1;
      abilities.push({
        ability,
        isFromAssist: false,
        sourceCard: member.card,
        isActive: effectiveLevel >= unlockLevel,
        isOnSkill: ability.tags?.includes('On Skill') || false,
      });
    }
  }

  if (member.assistCard) {
    for (const ability of member.assistCard.abilities || []) {
      abilities.push({
        ability,
        isFromAssist: true,
        sourceCard: member.assistCard,
        isActive: true, // Assist abilities always unlocked (we don't track assist card level)
        isOnSkill: ability.tags?.includes('On Skill') || false,
      });
    }
  }

  return abilities;
}
