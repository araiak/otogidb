/**
 * Damage Calculator Library
 * Implements the validated damage formula from docs/battle/DAMAGE.md
 */

import type { Card, CardStats } from '../types/card';

// Damage caps from game constants
export const DAMAGE_CAPS = {
  normal: 99999,
  skill: 999999,
} as const;

// Stat caps (validated via Ghidra - see docs/battle/CAPS.md)
export const STAT_CAPS = {
  critRate: 1.0, // 100%
  shieldMax: 0.85, // 85% damage reduction
  shieldMin: -0.75, // -75% (damage amplification cap - enemies take 175% damage max)
  speedBuff: 1.0, // 100% speed buff (halved to 50% faster)
  speedDebuff: -1.0, // 100% speed debuff (2x slower)
} as const;

// Base crit multiplier
export const BASE_CRIT_MULT = 2.0;

// Attack interval formula constants (validated 2026-01-06 via Frida timing)
// Formula: interval = (speed_stat + 750) / 900
export const ATTACK_INTERVAL_OFFSET = 750;
export const ATTACK_INTERVAL_DIVISOR = 900;


/**
 * Limit Break Exceed damage multiplier (average values)
 * RE Validated (2025-12-24 via Ghidra): Random(0, 5% × LB_level)
 * Formula: baseDamage × (1.0 + exceed_percent / 100.0)
 * These are AVERAGE values for deterministic calculations.
 * See docs/re-findings/functions/combat/CalculateExceedValue.md
 */
export const LB_EXCEED_AVERAGE: Record<number, number> = {
  0: 1.000, // No LB bonus
  1: 1.025, // Random(0, 5%) avg
  2: 1.050, // Random(0, 10%) avg
  3: 1.075, // Random(0, 15%) avg
  4: 1.100, // Random(0, 20%) avg
  5: 1.125, // Random(0, 25%) avg - MLB (Max Limit Break)
};

// Minimum exceed multipliers (always 1.0, no random bonus)
export const LB_EXCEED_MIN: Record<number, number> = {
  0: 1.000,
  1: 1.000,
  2: 1.000,
  3: 1.000,
  4: 1.000,
  5: 1.000,
};

// Maximum exceed multipliers (full random bonus)
export const LB_EXCEED_MAX: Record<number, number> = {
  0: 1.000, // No LB bonus
  1: 1.050, // Max 5%
  2: 1.100, // Max 10%
  3: 1.150, // Max 15%
  4: 1.200, // Max 20%
  5: 1.250, // Max 25%
};

// Limit break levels and their bonus
export const LB_BONUS_PER_LEVEL = 0.05; // 5% per LB
export const LEVELS_PER_LB = 5;
export const MAX_LB = 4; // 0-4, where 4 = MLB (Max Limit Break)

export interface DamageCalcInput {
  // Card stats
  baseAtk: number;
  maxAtk: number;
  maxLevel: number;
  baseCrit: number; // Base crit rate (e.g., 750 = 7.5%)
  baseSpeed: number; // Base speed stat

  // Skill stats (RE Validated: skills use slv1 + (level-1) * slvup, NOT ATK)
  skillSlv1: number; // Base skill damage at level 1
  skillSlvup: number; // Skill damage increase per level
  skillMaxLevel: number; // Max skill level (usually 62-70)

  // Build settings
  limitBreak: number; // 0-5

  // Buff percentages (0-1 scale, e.g., 0.4 = 40%)
  dmgPercent: number;
  normalDmgPercent: number; // Normal attack specific modifier (DoNormalDamageModify)
  critRateBonus: number;
  critDmgBonus: number;
  skillDmgPercent: number;
  speedBonus: number;
  levelBonus: number; // Flat level bonus

  // Skill-triggered ability bonuses (trigger: 'attack_skill')
  // These bonuses are applied on top of normal bonuses when skill is used
  // Example: Flying Nimbus "Magical Moving Cloud" adds +70% crit, +60% crit dmg on skill
  skillCritRateBonus: number; // Additional crit rate from skill-triggered abilities
  skillCritDmgBonus: number; // Additional crit dmg from skill-triggered abilities

  // Enemy debuffs
  enemyShieldDebuff: number; // Negative = vulnerability (e.g., -0.25 = 25% more damage)

  // Testing flags
  ignoreShieldCap?: boolean; // If true, skip the -75%/+85% shield cap (for world boss testing)
}

export interface DamageCalcResult {
  // Computed stats
  effectiveLevel: number;
  effectiveAtk: number; // Internal ATK (display / 10)
  displayAtk: number;
  effectiveCritRate: number; // Capped at 100%
  effectiveCritMult: number; // 2.0 + crit dmg bonus
  expectedCritMult: number; // 1 + critRate * (critMult - 1)
  effectiveSpeed: number;
  attackInterval: number; // Seconds between attacks

  // Skill-specific crit stats (includes skill-triggered ability bonuses)
  skillCritRate: number; // Crit rate when using skill (capped at 100%)
  skillCritMult: number; // Crit multiplier when using skill
  skillExpectedCritMult: number; // Expected crit multiplier for skill

  // Skill base (RE Validated: slv1 + (level-1) * slvup)
  skillBaseDamage: number; // Pre-multiplier skill damage
  effectiveSkillLevel: number; // Skill level (scales with card level)

  // Damage values
  normalDamage: number;
  normalDamageCrit: number;
  normalDamageExpected: number; // Expected with crit rate
  normalDamageCapped: boolean;

  skillDamage: number;
  skillDamageCrit: number;
  skillDamageExpected: number;
  skillDamageCapped: boolean;

  // DPS
  normalDps: number;

  // For comparison
  rawMultiplier: number; // Total damage multiplier from buffs
}

/**
 * Calculate ATK at a given level using the validated formula.
 * Formula: stat = base + (max - base) * (level - 1) / (maxLevel - 1)
 */
export function calcAtkAtLevel(
  baseAtk: number,
  maxAtk: number,
  maxLevel: number,
  level: number
): number {
  if (maxLevel <= 1) return baseAtk;
  return baseAtk + (maxAtk - baseAtk) * (level - 1) / (maxLevel - 1);
}

/**
 * Get effective level for a given LB
 * Base level increases by 5 per LB (max level 70 + 20 = 90 for LB5 on 5-star)
 */
export function getEffectiveLevel(maxLevel: number, limitBreak: number, levelBonus: number): number {
  const lbLevels = limitBreak * LEVELS_PER_LB;
  return maxLevel + lbLevels + levelBonus;
}

/**
 * Main damage calculation function
 */
export function calculateDamage(input: DamageCalcInput): DamageCalcResult {
  // Calculate effective level
  const effectiveLevel = getEffectiveLevel(input.maxLevel, input.limitBreak, input.levelBonus);

  // Calculate ATK at effective level (extrapolates beyond maxLevel)
  const rawAtk = calcAtkAtLevel(input.baseAtk, input.maxAtk, input.maxLevel, effectiveLevel);

  // Internal ATK (display ATK / 10)
  // RE Validated: Display ATK is 10x Combat ATK
  const effectiveAtk = rawAtk / 10;
  const displayAtk = rawAtk;

  // Crit rate: base/100 + bonus, capped at 100%
  const baseCritRate = input.baseCrit / 10000; // e.g., 750 -> 0.075 (7.5%)
  const effectiveCritRate = Math.min(baseCritRate + input.critRateBonus, STAT_CAPS.critRate);

  // Crit damage multiplier: base 2.0 + bonus
  const effectiveCritMult = BASE_CRIT_MULT + input.critDmgBonus;

  // Expected crit multiplier: 1 + critRate * (critMult - 1)
  const expectedCritMult = 1 + effectiveCritRate * (effectiveCritMult - 1);

  // Speed calculation (validated 2026-01-06 via Frida timing tests)
  // Formula: interval = (speed_stat + 750) / 900
  // Speed buff is halved: attackSpeed = baseInterval - (baseInterval * modifier / 2)
  const baseInterval = (input.baseSpeed + ATTACK_INTERVAL_OFFSET) / ATTACK_INTERVAL_DIVISOR;
  let effectiveSpeed = baseInterval;
  if (input.speedBonus >= 0) {
    const cappedBonus = Math.min(input.speedBonus, STAT_CAPS.speedBuff);
    effectiveSpeed = baseInterval * (1 - cappedBonus / 2); // Halved bonus
  } else {
    const cappedDebuff = Math.max(input.speedBonus, STAT_CAPS.speedDebuff);
    effectiveSpeed = baseInterval * (1 + Math.abs(cappedDebuff));
  }
  const attackInterval = Math.max(effectiveSpeed, 0.5); // Minimum 0.5s

  // Calculate damage multipliers
  const dmgMult = 1 + input.dmgPercent;
  const skillDmgMult = 1 + input.skillDmgPercent;

  // Apply shield cap unless ignoreShieldCap is set
  // RE Validated: CheckShieldModifyLimit at 0x00E3665C clamps to [-75%, +85%]
  // World boss may use ignoreShieldMaxLimit flag to bypass this cap
  const clampedShieldDebuff = input.ignoreShieldCap
    ? input.enemyShieldDebuff
    : Math.max(input.enemyShieldDebuff, STAT_CAPS.shieldMin); // Clamp to -75% min
  const enemyVulnerability = 1 - clampedShieldDebuff; // -0.25 becomes 1.25x

  // LB Exceed multiplier (RE Validated 2025-12-24)
  // Formula: Random(0, 5% × LB_level), average used for deterministic calculation
  const exceedMult = LB_EXCEED_AVERAGE[input.limitBreak] ?? 1.0;

  // Normal damage calculation
  // RE Validated 2026-01-16: Combo bonus is cosmetic only (no damage effect)
  // RE Validated: DoNormalDamageModify applies separately from DoDamageModify
  // Damage = ATK * exceedMult * (1 + DMG%) * (1 + NormalDMG%) * (1 - enemyShield)
  const normalDmgMult = 1 + input.normalDmgPercent;
  const normalBase = effectiveAtk * exceedMult * dmgMult * normalDmgMult * enemyVulnerability;
  const normalDamage = Math.round(normalBase);
  const normalDamageCrit = Math.round(normalBase * effectiveCritMult);
  const normalDamageExpected = Math.round(normalBase * expectedCritMult);
  const normalDamageCapped = normalDamageCrit >= DAMAGE_CAPS.normal;

  // Skill-specific crit stats (includes skill-triggered ability bonuses)
  // Example: Flying Nimbus "Magical Moving Cloud" adds +70% crit, +60% crit dmg on skill
  const skillCritRate = Math.min(
    baseCritRate + input.critRateBonus + (input.skillCritRateBonus || 0),
    STAT_CAPS.critRate
  );
  const skillCritMult = BASE_CRIT_MULT + input.critDmgBonus + (input.skillCritDmgBonus || 0);
  const skillExpectedCritMult = 1 + skillCritRate * (skillCritMult - 1);

  // Skill damage calculation
  // RE Validated 2026-01-17: Skills do NOT use ATK!
  // Base = GetBattleValue(slv1, slvup) = slv1 + (skillLevel - 1) * slvup
  // See: docs/re-findings/functions/combat/GetBattleValue.md
  // Skill level scales with card level (NOT capped at ml - user verified in-game)
  const effectiveSkillLevel = effectiveLevel;
  const skillBaseDamage = input.skillSlv1 + (effectiveSkillLevel - 1) * input.skillSlvup;

  // Damage = SkillBase * exceedMult * (1 + DMG%) * (1 + SkillDMG%) * (1 - enemyShield)
  // Uses skill-specific crit stats (includes skill-triggered ability bonuses)
  const skillBase = skillBaseDamage * exceedMult * dmgMult * skillDmgMult * enemyVulnerability;
  const skillDamage = Math.round(skillBase);
  const skillDamageCrit = Math.round(skillBase * skillCritMult);
  const skillDamageExpected = Math.round(skillBase * skillExpectedCritMult);
  const skillDamageCapped = skillDamageCrit >= DAMAGE_CAPS.skill;

  // Apply caps
  const cappedNormalDamage = Math.min(normalDamage, DAMAGE_CAPS.normal);
  const cappedNormalCrit = Math.min(normalDamageCrit, DAMAGE_CAPS.normal);
  const cappedSkillDamage = Math.min(skillDamage, DAMAGE_CAPS.skill);
  const cappedSkillCrit = Math.min(skillDamageCrit, DAMAGE_CAPS.skill);

  // Calculate DPS (expected damage per second)
  const attacksPerSecond = 1 / attackInterval;
  const normalDps = Math.round(
    Math.min(normalDamageExpected, DAMAGE_CAPS.normal) * attacksPerSecond
  );

  // Total multiplier for display
  const rawMultiplier = dmgMult * enemyVulnerability * expectedCritMult;

  return {
    effectiveLevel,
    effectiveAtk,
    displayAtk,
    effectiveCritRate,
    effectiveCritMult,
    expectedCritMult,
    effectiveSpeed,
    attackInterval,

    // Skill-specific crit stats (includes skill-triggered ability bonuses)
    skillCritRate,
    skillCritMult,
    skillExpectedCritMult,

    // Skill base (RE Validated)
    skillBaseDamage,
    effectiveSkillLevel,

    normalDamage: cappedNormalDamage,
    normalDamageCrit: cappedNormalCrit,
    normalDamageExpected: Math.min(normalDamageExpected, DAMAGE_CAPS.normal),
    normalDamageCapped,

    skillDamage: cappedSkillDamage,
    skillDamageCrit: cappedSkillCrit,
    skillDamageExpected: Math.min(skillDamageExpected, DAMAGE_CAPS.skill),
    skillDamageCapped,

    normalDps,
    rawMultiplier,
  };
}

/**
 * Calculate the marginal value of adding a stat increment
 */
export interface StatIncrement {
  stat: 'dmg' | 'critRate' | 'critDmg' | 'skillDmg' | 'speed' | 'level';
  amount: number;
  label: string;
}

export const STAT_INCREMENTS: StatIncrement[] = [
  { stat: 'dmg', amount: 0.10, label: '+10% DMG' },
  { stat: 'critRate', amount: 0.10, label: '+10% Crit Rate' },
  { stat: 'critDmg', amount: 0.10, label: '+10% Crit DMG' },
  { stat: 'skillDmg', amount: 0.10, label: '+10% Skill DMG' },
  { stat: 'speed', amount: 0.10, label: '+10% Speed' },
  { stat: 'level', amount: 5, label: '+5 Level' },
];

export interface StatComparison {
  stat: StatIncrement;
  newDps: number;
  dpsGain: number;
  dpsGainPercent: number;
  newSkillDamage: number;
  skillGain: number;
  skillGainPercent: number;
}

/**
 * Compare the value of adding different stat increments
 */
export function compareStatIncrements(
  baseInput: DamageCalcInput,
  baseResult: DamageCalcResult
): StatComparison[] {
  return STAT_INCREMENTS.map(increment => {
    const modifiedInput = { ...baseInput };

    switch (increment.stat) {
      case 'dmg':
        modifiedInput.dmgPercent += increment.amount;
        break;
      case 'critRate':
        modifiedInput.critRateBonus += increment.amount;
        break;
      case 'critDmg':
        modifiedInput.critDmgBonus += increment.amount;
        break;
      case 'skillDmg':
        modifiedInput.skillDmgPercent += increment.amount;
        break;
      case 'speed':
        modifiedInput.speedBonus += increment.amount;
        break;
      case 'level':
        modifiedInput.levelBonus += increment.amount;
        break;
    }

    const newResult = calculateDamage(modifiedInput);

    const dpsGain = newResult.normalDps - baseResult.normalDps;
    const dpsGainPercent = baseResult.normalDps > 0
      ? (dpsGain / baseResult.normalDps) * 100
      : 0;

    const skillGain = newResult.skillDamageExpected - baseResult.skillDamageExpected;
    const skillGainPercent = baseResult.skillDamageExpected > 0
      ? (skillGain / baseResult.skillDamageExpected) * 100
      : 0;

    return {
      stat: increment,
      newDps: newResult.normalDps,
      dpsGain,
      dpsGainPercent,
      newSkillDamage: newResult.skillDamageExpected,
      skillGain,
      skillGainPercent,
    };
  });
}

/**
 * Generate heatmap data for two stats
 */
export interface HeatmapCell {
  x: number; // First stat value
  y: number; // Second stat value
  dps: number;
  skillDamage: number;
  capped: boolean;
}

export function generateHeatmap(
  baseInput: DamageCalcInput,
  xStat: 'dmg' | 'critRate' | 'critDmg' | 'skillDmg' | 'speed' | 'level',
  yStat: 'dmg' | 'critRate' | 'critDmg' | 'skillDmg' | 'speed' | 'level',
  xRange: number[], // Array of values to test
  yRange: number[]
): HeatmapCell[][] {
  return yRange.map(yVal => {
    return xRange.map(xVal => {
      const modifiedInput = { ...baseInput };

      // Apply X stat
      switch (xStat) {
        case 'dmg': modifiedInput.dmgPercent = xVal; break;
        case 'critRate': modifiedInput.critRateBonus = xVal; break;
        case 'critDmg': modifiedInput.critDmgBonus = xVal; break;
        case 'skillDmg': modifiedInput.skillDmgPercent = xVal; break;
        case 'speed': modifiedInput.speedBonus = xVal; break;
        case 'level': modifiedInput.levelBonus = xVal; break;
      }

      // Apply Y stat
      switch (yStat) {
        case 'dmg': modifiedInput.dmgPercent = yVal; break;
        case 'critRate': modifiedInput.critRateBonus = yVal; break;
        case 'critDmg': modifiedInput.critDmgBonus = yVal; break;
        case 'skillDmg': modifiedInput.skillDmgPercent = yVal; break;
        case 'speed': modifiedInput.speedBonus = yVal; break;
        case 'level': modifiedInput.levelBonus = yVal; break;
      }

      const result = calculateDamage(modifiedInput);

      return {
        x: xVal,
        y: yVal,
        dps: result.normalDps,
        skillDamage: result.skillDamageExpected,
        capped: result.normalDamageCapped || result.skillDamageCapped,
      };
    });
  });
}

/**
 * Extract skill-triggered ability bonuses from a card
 * Finds abilities with trigger: 'attack_skill' and extracts CHIT/CHIT_ATK effects
 */
export function extractSkillTriggeredBonuses(card: Card): { skillCritRateBonus: number; skillCritDmgBonus: number } {
  let skillCritRateBonus = 0;
  let skillCritDmgBonus = 0;

  // Check for abilities with trigger: 'attack_skill'
  if (card.abilities) {
    for (const ability of card.abilities) {
      if (ability.parsed?.trigger === 'attack_skill' && ability.parsed?.effects) {
        for (const effect of ability.parsed.effects) {
          if (effect.type === 'CHIT') {
            // CHIT is crit rate bonus (e.g., 70.0 = 70%)
            skillCritRateBonus += (effect.value || 0) / 100;
          } else if (effect.type === 'CHIT_ATK') {
            // CHIT_ATK is crit damage bonus (e.g., 60.0 = 60%)
            skillCritDmgBonus += (effect.value || 0) / 100;
          }
        }
      }
    }
  }

  return { skillCritRateBonus, skillCritDmgBonus };
}

/**
 * Create input from a Card object
 */
export function createInputFromCard(card: Card, limitBreak: number = 0): DamageCalcInput {
  // Get skill data from parsed skill (RE Validated: slv1 + (level-1) * slvup)
  const skillParsed = card.skill?.parsed;
  const skillSlv1 = skillParsed?.slv1 ?? 0;
  const skillSlvup = skillParsed?.slvup ?? 0;
  const skillMaxLevel = skillParsed?.ml ?? 70;

  // Extract skill-triggered ability bonuses (trigger: 'attack_skill')
  const { skillCritRateBonus, skillCritDmgBonus } = extractSkillTriggeredBonuses(card);

  return {
    baseAtk: card.stats.base_atk,
    maxAtk: card.stats.max_atk,
    maxLevel: card.stats.max_level,
    baseCrit: card.stats.crit,
    baseSpeed: card.stats.speed,

    // Skill stats (RE Validated 2026-01-17)
    skillSlv1,
    skillSlvup,
    skillMaxLevel,

    limitBreak,
    dmgPercent: 0,
    normalDmgPercent: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    skillDmgPercent: 0,
    speedBonus: 0,
    levelBonus: 0,

    // Skill-triggered ability bonuses (auto-extracted from card abilities)
    skillCritRateBonus,
    skillCritDmgBonus,

    enemyShieldDebuff: 0,
    ignoreShieldCap: false,
  };
}
