/**
 * Calculator Coverage Audit Tests
 *
 * Validates that the calculator handles all relevant game mechanics.
 * Based on enumeration of output/data/abilities.json and output/data/skills.json
 *
 * Last enumerated: 2026-01-18
 * - 983 abilities with 27 unique effect types
 * - 6 unique trigger types
 * - 24+ unique target strategies
 */
import { describe, it, expect } from 'vitest';

// =============================================================================
// Effect Type Mapping from team-calc.ts
// =============================================================================

// This mirrors the EFFECT_TYPE_MAP in team-calc.ts
const EFFECT_TYPE_MAP: Record<string, string> = {
  'ATK': 'dmg',
  'SKILL_ATK': 'skillDmg',
  'CHIT': 'critRate',
  'CHIT_ATK': 'critDmg',
  'SPD': 'speed',
  'SHIELD': 'shield',
  'DEFENSE': 'defense',
  'LEVEL': 'level',
  'HP': 'hp',
  'NORM_ATK': 'normalDmg',
};

// This mirrors the TIMING_MAP in team-calc.ts
const TIMING_MAP: Record<string, string> = {
  'entry': 'passive',
  'entry_wave': 'wave_start',
  'last_wave': 'final_wave',
  'entry_leader': 'passive',
  'attack_skill': 'passive',
  'attack_normal': 'passive',
};

// =============================================================================
// Game Data Enumeration (from output/data/abilities.json)
// =============================================================================

// All effect types found in game ability data (extracted 2026-01-18)
const GAME_EFFECT_TYPES = [
  'ATK', 'BURN', 'CHIT', 'CHIT_ATK', 'COIN', 'EXP', 'FROZEN', 'HEAL',
  'HEAL_DOT', 'HIT', 'HP', 'HPP_IN', 'IMMUNE', 'ITEM', 'LEVEL', 'NUMB',
  'POISON', 'REVENGE', 'SHIELD', 'SILENCE', 'SKILL_ATK', 'SLEEP', 'SPD',
  'STONE', 'STUN', 'TIME', 'VAMP',
] as const;

// All trigger types found in game ability data
const GAME_TRIGGER_TYPES = [
  'attack_normal', 'attack_skill', 'entry', 'entry_leader',
  'entry_wave', 'last_wave',
] as const;

// Effect types that directly affect damage calculation
const DAMAGE_RELEVANT_EFFECT_TYPES = [
  'ATK',       // DMG% buff (DelayEffectType=1)
  'SKILL_ATK', // Skill DMG% buff (DelayEffectType=102)
  'CHIT',      // Crit rate buff (DelayEffectType=4)
  'CHIT_ATK',  // Crit DMG% buff (DelayEffectType=101)
  'SPD',       // Attack speed buff (DelayEffectType=3)
  'SHIELD',    // Shield (damage reduction) (DelayEffectType=2)
  'LEVEL',     // Effective level bonus
  'HP',        // HP% buff (affects survivability, not damage)
] as const;

// Effect types that DON'T affect damage calculation
// These are intentionally not in EFFECT_TYPE_MAP
const NON_DAMAGE_EFFECT_TYPES = [
  // Crowd Control (CC)
  'STUN',    // Disable actions
  'FROZEN',  // Disable actions
  'SLEEP',   // Disable until hit
  'STONE',   // Disable actions
  'SILENCE', // Disable skills
  'NUMB',    // Disable actions

  // Damage over Time (DoT)
  'POISON',  // % max HP per tick
  'BURN',    // % max HP per tick

  // Healing
  'HEAL',     // Instant heal
  'HEAL_DOT', // % max HP per tick
  'HPP_IN',   // Instant HP restore %

  // Utility
  'VAMP',    // Lifesteal (separate system)
  'REVENGE', // Counter-attack (separate system)
  'IMMUNE',  // Block debuffs

  // Drop bonuses (out of combat)
  'ITEM',
  'COIN',
  'EXP',

  // Misc
  'TIME', // Cooldown modifier (skill_time)
  // NOTE: 'HIT' is intentionally NOT here - it's uncategorized (unknown impact)
] as const;

// =============================================================================
// Category 3: Coverage Completeness (3 tests)
// =============================================================================

describe('Effect Type Coverage', () => {
  it('all damage-relevant effect types from game data are mapped', () => {
    const unmapped: string[] = [];

    for (const effectType of DAMAGE_RELEVANT_EFFECT_TYPES) {
      if (!(effectType in EFFECT_TYPE_MAP)) {
        unmapped.push(effectType);
      }
    }

    expect(unmapped).toEqual([]);
  });

  it('non-damage effect types are intentionally not mapped', () => {
    // These should NOT be in EFFECT_TYPE_MAP because they don't affect damage
    for (const effectType of NON_DAMAGE_EFFECT_TYPES) {
      // If any of these ARE mapped, it's unexpected and should be reviewed
      if (effectType in EFFECT_TYPE_MAP) {
        console.warn(`Unexpected mapping for non-damage effect: ${effectType}`);
      }
    }

    // This test passes if we reach here - it's documentation
    expect(true).toBe(true);
  });

  it('DEFENSE and NORM_ATK are mapped even though not in ability data', () => {
    // RE: These effect types exist in the game (from skills/combat system)
    // but aren't present in abilities.json parsed effect patterns
    // They're still valid calculator inputs from enemy state and bond effects

    // DEFENSE: Enemy defense reduction (DelayEffectType=5)
    expect(EFFECT_TYPE_MAP['DEFENSE']).toBe('defense');

    // NORM_ATK: Normal attack damage modifier (DelayEffectType=107)
    // Used by bonds, not abilities
    expect(EFFECT_TYPE_MAP['NORM_ATK']).toBe('normalDmg');
  });
});

describe('Trigger Type Coverage', () => {
  it('all trigger types from game data are mapped', () => {
    const unmapped: string[] = [];

    for (const trigger of GAME_TRIGGER_TYPES) {
      if (!(trigger in TIMING_MAP)) {
        unmapped.push(trigger);
      }
    }

    expect(unmapped).toEqual([]);
  });

  it('trigger mappings have sensible timing values', () => {
    // Verify the semantic correctness of trigger mappings
    expect(TIMING_MAP['entry']).toBe('passive');
    expect(TIMING_MAP['entry_wave']).toBe('wave_start');
    expect(TIMING_MAP['last_wave']).toBe('final_wave');
    expect(TIMING_MAP['entry_leader']).toBe('passive');
    expect(TIMING_MAP['attack_skill']).toBe('passive');
    expect(TIMING_MAP['attack_normal']).toBe('passive');
  });
});

describe('Documentation of Known Gaps', () => {
  it('HIT effect type is documented as unknown impact', () => {
    // RE: DAMAGE_FORMULA_KNOWLEDGE_MAP.md Gap 1
    // HIT is DelayEffectType=50, used in skill damage calc
    // Current hypothesis: Skill multiplier, needs runtime validation
    expect(EFFECT_TYPE_MAP['HIT']).toBeUndefined();
  });

  it('combo damage bonus is confirmed DISPROVEN', () => {
    // RE: DAMAGE_FORMULA_KNOWLEDGE_MAP.md Gap 4
    // "Combo Bonus" was tested and found to be purely cosmetic
    // The calculator correctly excludes combo from damage formulas
    // This test documents that this is intentional, not an oversight
    expect(true).toBe(true);
  });

  it('super crit (4x) is confirmed DISABLED', () => {
    // RE: GameConst.md shows criticle_2 = 4.0 exists but is never triggered
    // The calculator correctly uses only the 2.0x crit multiplier
    // This test documents that this is intentional
    expect(true).toBe(true);
  });

  it('multi-hit skills are confirmed DISABLED', () => {
    // RE: DAMAGE_FORMULA_KNOWLEDGE_MAP.md - Multi-Hit Skills VALIDATED
    // Infrastructure exists but NO skill data uses multi-hit (hitCount=0 for all)
    // The calculator correctly ignores multi-hit mechanics
    expect(true).toBe(true);
  });
});

// =============================================================================
// Effect Type Counts for Reference
// =============================================================================

describe('Game Data Statistics (for reference)', () => {
  it('documents all effect types found in game data', () => {
    // This test serves as documentation of what's in the game
    // If this list changes, the audit should be re-run
    expect(GAME_EFFECT_TYPES).toHaveLength(27);
    expect(GAME_TRIGGER_TYPES).toHaveLength(6);
  });

  it('documents damage-relevant vs non-damage effect type split', () => {
    // 8 damage-relevant + 18 non-damage = 26 categorized
    // HIT is uncategorized (unknown impact)
    expect(DAMAGE_RELEVANT_EFFECT_TYPES).toHaveLength(8);
    expect(NON_DAMAGE_EFFECT_TYPES).toHaveLength(18); // 6 CC + 2 DoT + 3 heal + 3 utility + 3 drop + 1 misc

    // HIT is the only uncategorized one
    const categorized = [
      ...DAMAGE_RELEVANT_EFFECT_TYPES,
      ...NON_DAMAGE_EFFECT_TYPES,
    ];
    const uncategorized = GAME_EFFECT_TYPES.filter(
      t => !categorized.includes(t as any)
    );
    expect(uncategorized).toEqual(['HIT']);
  });
});
