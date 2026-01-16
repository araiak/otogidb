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
  type StatBreakdown,
  BOND_VALUES,
  MAIN_TEAM_SIZE,
  TOTAL_SLOTS,
  ATTRIBUTE_NAMES,
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
  calcAtkAtLevel,
} from './damage-calc';

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
    // 2. SHIELD effect with negative value (enemies take more damage)
    const isDebuff = targetsEnemy || (stat === 'shield' && rawValue < 0);

    // Skip defensive abilities that don't affect our outgoing damage:
    // - "Enemy DMG Down" (ATK debuff on enemy) reduces incoming damage, not outgoing
    // We DO want to include:
    // - "DMG Amp" (SHIELD debuff on enemy) increases our damage
    // - "Slow" on enemy could affect their damage output but not ours directly
    if (targetsEnemy && stat === 'dmg' && rawValue < 0) {
      // Enemy deals less damage - defensive, skip for damage calc
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
 * Legacy regex-based parsing for abilities without parsed data
 */
function parseAbilityFromDescription(
  ability: Ability,
  sourceCardId: string,
  isFromAssist: boolean,
  tags: string[]
): ParsedAbility {
  const description = ability.description || '';

  // Determine targeting
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

  // Check for ranked targeting (Multi tag or "2 allies with highest ATK" pattern)
  if (tags.includes('Multi')) {
    targetType = 'ranked';
    // Parse count from description
    const countMatch = description.match(/(\d+)\s+allies?\s+with\s+(highest|lowest)\s+(ATK|ATK speed|HP)/i);
    if (countMatch) {
      rankCount = parseInt(countMatch[1], 10);
      const statMatch = countMatch[3].toLowerCase();
      if (statMatch === 'atk') rankSortBy = 'atk';
      else if (statMatch === 'atk speed') rankSortBy = 'speed';
      else if (statMatch === 'hp') rankSortBy = 'hp';
    } else {
      // Default to top 2 ATK if Multi tag but no pattern match
      rankCount = 2;
      rankSortBy = 'atk';
    }
  }

  // Determine timing
  let timing: AbilityTiming = 'passive';
  if (tags.includes('Wave Start')) {
    timing = 'wave_start';
  } else if (tags.includes('Final Wave')) {
    timing = 'final_wave';
  }

  // Parse effects from description and tags
  const effects: AbilityEffect[] = [];

  // DMG Boost
  if (tags.includes('DMG Boost')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:more\s+)?DMG/i);
    if (match) {
      effects.push({ stat: 'dmg', value: parseFloat(match[1]) / 100 });
    }
  }

  // Crit Rate
  if (tags.includes('Crit Rate')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+)?Crit\s*(?:Rate|rate)/i);
    if (match) {
      effects.push({ stat: 'critRate', value: parseFloat(match[1]) / 100 });
    }
  }

  // Crit DMG
  if (tags.includes('Crit DMG')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+)?Crit\s*(?:DMG|damage)/i);
    if (match) {
      effects.push({ stat: 'critDmg', value: parseFloat(match[1]) / 100 });
    }
  }

  // Skill DMG
  if (tags.includes('Skill DMG')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+)?skill\s*DMG/i);
    if (match) {
      effects.push({ stat: 'skillDmg', value: parseFloat(match[1]) / 100 });
    }
  }

  // ATK Speed
  if (tags.includes('ATK Speed')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:of\s+)?(?:ATK\s+)?speed/i);
    if (match) {
      effects.push({ stat: 'speed', value: parseFloat(match[1]) / 100 });
    }
  }

  // Level Boost
  if (tags.includes('Level Boost')) {
    const match = description.match(/level\s+by\s+(\d+)/i);
    if (match) {
      effects.push({ stat: 'level', value: parseInt(match[1], 10) });
    }
  }

  // DMG Reduction (as shield for enemy)
  if (tags.includes('DMG Reduction')) {
    const match = description.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:less\s+)?DMG\s*(?:taken|reduction)/i);
    if (match) {
      // This is defensive, but we'll track it anyway
      effects.push({ stat: 'shield', value: parseFloat(match[1]) / 100 });
    }
  }

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
 */
export function resolveAbilityTargets(
  ability: ParsedAbility,
  sourceIndex: number,
  teamContext: TeamContext,
  members: TeamMemberState[],
  abilityTargetOverrides?: Record<string, number[]>
): number[] {
  // Check synergy condition
  if (ability.synergyPartners.length > 0) {
    const hasPartner = ability.synergyPartners.some(partnerId =>
      teamContext.presentCardIds.has(partnerId) || teamContext.presentAssistIds.has(partnerId)
    );
    if (!hasPartner) return [];
  }

  // Check leader condition
  if (ability.requiresLeader) {
    const sourceCard = members[sourceIndex]?.card;
    if (!sourceCard || sourceCard.id !== teamContext.leaderCardId) {
      return [];
    }
  }

  switch (ability.targetType) {
    case 'self':
      // For assists, "self" means the card they're attached to
      if (ability.isFromAssist) {
        return [sourceIndex];
      }
      return [sourceIndex];

    case 'team':
      // All team members (main team only for damage purposes)
      return Array.from({ length: MAIN_TEAM_SIZE }, (_, i) => i)
        .filter(i => members[i]?.card != null);

    case 'attribute':
      // Filter by attribute
      return Array.from({ length: MAIN_TEAM_SIZE }, (_, i) => i)
        .filter(i => {
          const member = members[i];
          return member?.card && matchesAttribute(member.card, ability.attributeFilter);
        });

    case 'ranked':
      // Check for user override first
      if (abilityTargetOverrides?.[ability.id]) {
        const override = abilityTargetOverrides[ability.id];
        // Validate override targets exist and are in main team
        return override.filter(idx =>
          idx >= 0 && idx < MAIN_TEAM_SIZE && members[idx]?.card != null
        );
      }

      // Top N by stat (automatic selection)
      if (!ability.rankCount || !ability.rankSortBy) {
        return [];
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
      return sortedIndices.slice(0, ability.rankCount);

    default:
      return [sourceIndex];
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

    // Bond contributions
    const bondValues = BOND_VALUES[member.bondType];
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
 */
export function calculatePhase3ApplyAbilities(
  members: TeamMemberState[],
  phase1Results: Phase1Result[],
  teamContext: TeamContext,
  enemy: EnemyState,
  abilityTargetOverrides?: Record<string, number[]>
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

    // Assist abilities - auto-activate based on main card's level
    if (member.assistCard) {
      for (const ability of member.assistCard.abilities || []) {
        const unlockLevel = ability.unlock_level || 1;
        if (effectiveLevel >= unlockLevel) {
          // Skip "On Skill" abilities
          if (ability.tags?.includes('On Skill')) continue;
          // For assists, the source index is still the member index (abilities apply relative to main card)
          abilities.push(parseAbility(ability, member.assistCard.id, true));
        }
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

      // Resolve targets
      const targetIndices = resolveAbilityTargets(ability, sourceIndex, teamContext, members, abilityTargetOverrides);
      if (targetIndices.length === 0) continue;

      // Apply effects to each target
      for (const targetIndex of targetIndices) {
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
          const scaledValue = effect.value * waveMultiplier;
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
      // LB Exceed multiplier (RE Validated 2025-12-24)
      // Average bonus: 0% at LB0, up to 12.5% at LB5
      const lbLevel = Math.min(member.limitBreak + 1, 5); // LB0-4 -> 1-5 for exceed lookup
      const exceedMult = LB_EXCEED_AVERAGE[lbLevel] || 1.0;

      // Apply enemy defense (separate from shield, multiplicative)
      // RE Validated: Defense uses LINEAR formula same as shield
      const effectiveDefense = Math.max(0, Math.min(enemy.baseDefense, STAT_CAPS.shieldMax));
      const defenseMult = 1 - effectiveDefense;

      // Apply enemy shield with ability debuffs + skill debuffs (team-wide)
      const effectiveShield = Math.max(
        STAT_CAPS.shieldMin,
        Math.min(enemy.baseShield - totalEnemyShieldDebuff - skillDebuffTotal, STAT_CAPS.shieldMax)
      );
      const shieldMult = 1 - effectiveShield;

      // Race bonus multiplier (RE Validated 2025-12-24)
      const raceMult = 1 + raceBonus;

      // Normal damage calculation
      // Formula: ATK × exceedMult × dmgMult × comboMult × raceMult × defenseMult × shieldMult
      // Note: comboMult is already baked into effectiveAtk via AVERAGE_COMBO_BONUS in damage-calc.ts
      const dmgMult = 1 + totalDmgBonus;
      const normalBase = effectiveAtk * exceedMult * dmgMult * raceMult * defenseMult * shieldMult;
      const normalDamage = Math.min(Math.round(normalBase), DAMAGE_CAPS.normal);
      const normalDamageCrit = Math.min(Math.round(normalBase * effectiveCritDmg), DAMAGE_CAPS.normal);
      const normalDamageExpected = Math.min(Math.round(normalBase * expectedCritMult), DAMAGE_CAPS.normal);
      const normalDamageCapped = normalDamageCrit >= DAMAGE_CAPS.normal;

      // DPS
      const attacksPerSecond = 1 / attackInterval;
      const normalDps = Math.round(normalDamageExpected * attacksPerSecond);

      // Skill damage - uses parsed data embedded in card
      // The skill value (slv1 + slvup*(level-1)) matches the description value
      // e.g., "Deals 4,682 DMG" = slv1 + slvup*(level-1) = 4682
      let skillBaseDamage = 0;
      if (member.card.skill?.parsed) {
        const parsed = member.card.skill.parsed;
        const skillLevel = finalLevel;
        // Skill base damage = slv1 + (level-1) * slvup (matches description)
        skillBaseDamage = (parsed.slv1 || 0) + (skillLevel - 1) * (parsed.slvup || 0);
      }

      const skillDmgMult = 1 + totalSkillDmgBonus;
      const skillBase = skillBaseDamage * exceedMult * dmgMult * skillDmgMult * raceMult * defenseMult * shieldMult;
      const skillDamage = Math.min(Math.round(skillBase), DAMAGE_CAPS.skill);
      const skillDamageCrit = Math.min(Math.round(skillBase * effectiveCritDmg), DAMAGE_CAPS.skill);
      const skillDamageExpected = Math.min(Math.round(skillBase * expectedCritMult), DAMAGE_CAPS.skill);
      const skillDamageCapped = skillDamageCrit >= DAMAGE_CAPS.skill;

      damageResult = {
        normalDamage,
        normalDamageCrit,
        normalDamageExpected,
        normalDamageCapped,
        normalDps,
        skillBaseDamage,
        skillDamage,
        skillDamageCrit,
        skillDamageExpected,
        skillDamageCapped,
      };
    }

    return {
      memberIndex: index,
      computedStats,
      damageResult,
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
 */
export function calculateTeamDamage(
  members: TeamMemberState[],
  enemy: EnemyState,
  abilityTargetOverrides?: Record<string, number[]>
): TeamCalculationResult {
  // Phase 1: Base stats
  const phase1Results = calculatePhase1BaseStats(members);

  // Phase 2: Team context
  const teamContext = calculatePhase2TeamContext(phase1Results, members);

  // Phase 3: Apply abilities (with wave-based conditions)
  const phase3Results = calculatePhase3ApplyAbilities(members, phase1Results, teamContext, enemy, abilityTargetOverrides);

  // Apply skill buffs from active skills to phase3 results
  // This handles ally buffs (dmgBonus, critRate, etc.) from activated skills
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    const member = members[i];
    if (!member.skillActive || !member.skillEffect) continue;

    const skillEffect = member.skillEffect;
    const buffs = skillEffect.buffs;

    // Determine which members receive the buff based on target type
    if (skillEffect.targetType === 'ally') {
      // AoE ally buff - apply to all main team members
      if (skillEffect.targetCount === 99 || skillEffect.targetCount >= 5) {
        for (let j = 0; j < MAIN_TEAM_SIZE; j++) {
          if (!members[j]?.card) continue;
          phase3Results[j].dmgBonus += buffs.dmgBonus || 0;
          phase3Results[j].critRateBonus += buffs.critRateBonus || 0;
          phase3Results[j].critDmgBonus += buffs.critDmgBonus || 0;
          phase3Results[j].speedBonus += buffs.speedBonus || 0;
        }
      } else if (skillEffect.targetCount > 1) {
        // Multi-target - apply to top N by ATK
        const targets = teamContext.byAtk.slice(0, skillEffect.targetCount);
        for (const targetIdx of targets) {
          phase3Results[targetIdx].dmgBonus += buffs.dmgBonus || 0;
          phase3Results[targetIdx].critRateBonus += buffs.critRateBonus || 0;
          phase3Results[targetIdx].critDmgBonus += buffs.critDmgBonus || 0;
          phase3Results[targetIdx].speedBonus += buffs.speedBonus || 0;
        }
      } else {
        // Single target - apply to highest ATK ally
        const targetIdx = teamContext.byAtk[0];
        if (targetIdx !== undefined) {
          phase3Results[targetIdx].dmgBonus += buffs.dmgBonus || 0;
          phase3Results[targetIdx].critRateBonus += buffs.critRateBonus || 0;
          phase3Results[targetIdx].critDmgBonus += buffs.critDmgBonus || 0;
          phase3Results[targetIdx].speedBonus += buffs.speedBonus || 0;
        }
      }
    } else if (skillEffect.targetType === 'self') {
      // Self-only buff
      phase3Results[i].dmgBonus += buffs.dmgBonus || 0;
      phase3Results[i].critRateBonus += buffs.critRateBonus || 0;
      phase3Results[i].critDmgBonus += buffs.critDmgBonus || 0;
      phase3Results[i].speedBonus += buffs.speedBonus || 0;
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
  for (let i = 0; i < MAIN_TEAM_SIZE; i++) {
    totalEnemyShieldDebuff += phase3Results[i].enemyShieldDebuff;
  }

  // Calculate race bonus (RE Validated 2025-12-24)
  // Returns 0 if enemy.attribute is 'None' (disabled by default)
  const raceBonus = calculateRaceBonus(members, enemy.attribute);

  // Phase 4: Final damage (with skill debuffs, ability debuffs, and race bonus applied)
  const phase4Results = calculatePhase4FinalDamage(
    phase1Results, phase3Results, enemy, members, skillDebuffTotal, totalEnemyShieldDebuff, raceBonus
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

  const effectiveEnemyShield = Math.max(
    STAT_CAPS.shieldMin,
    Math.min(enemy.baseShield - totalEnemyShieldDebuff - skillDebuffTotal, STAT_CAPS.shieldMax)
  );

  const effectiveEnemyDefense = Math.max(0, Math.min(enemy.baseDefense, STAT_CAPS.shieldMax));

  return {
    members: phase4Results,
    teamContext,
    effectiveEnemyShield,
    effectiveEnemyDefense,
    totalNormalDpsExpected,
    totalSkillDamageExpected,
    skillDebuffTotal,
    abilityDebuffTotal: totalEnemyShieldDebuff,
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
      const unlockLevel = ability.unlock_level || 1;
      abilities.push({
        ability,
        isFromAssist: true,
        sourceCard: member.assistCard,
        isActive: effectiveLevel >= unlockLevel,
        isOnSkill: ability.tags?.includes('On Skill') || false,
      });
    }
  }

  return abilities;
}
