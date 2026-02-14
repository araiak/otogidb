/**
 * Team Calculator Edge Case Tests
 *
 * Tests for team-level calculations including:
 * - Phase calculations with empty slots
 * - Race bonus calculation
 * - Ability targeting resolution
 * - Team context building
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePhase1BaseStats,
  calculatePhase2TeamContext,
  calculatePhase3ApplyAbilities,
  calculateRaceBonus,
} from '../team-calc';
import {
  RACE_BONUS_CONSTANTS,
  HELPER_SLOT_INDEX,
  MAIN_TEAM_SIZE,
  TOTAL_SLOTS,
  getAdvantageAttribute,
  getDisadvantageAttribute,
  type TeamMemberState,
  type TeamContext,
  type EnemyState,
  type Phase1Result,
} from '../team-calc-types';
import type { Card, Ability } from '../../types/card';

// =============================================================================
// Test Helpers
// =============================================================================

function createEmptyMemberState(isReserve = false): TeamMemberState {
  return {
    cardId: null,
    card: null,
    assistCardId: null,
    assistCard: null,
    limitBreak: 0,
    levelBonus: 0,
    bond1: 'none',
    bond2: 'none',
    bond3: 'none',
    bondType: 'none',
    skillActive: false,
    isReserve,
    computedStats: null,
    damageResult: null,
    abilityContributions: [],
    skillEffect: null,
  };
}

function createMockCard(overrides: Partial<Card> & { attribute?: number } = {}): Card {
  const attrId = overrides.attribute ?? 1;
  const attrNames: Record<number, string> = {
    1: 'Divina',
    2: 'Phantasma',
    3: 'Anima',
    4: 'Neutral',
  };
  const attrName = attrNames[attrId] || 'Divina';

  return {
    id: '1001',
    name: 'Test Card',
    attribute: attrId,
    type: 1, // Melee
    rarity: 5,
    stats: {
      base_atk: 1000,
      max_atk: 10000,
      base_hp: 500,
      max_hp: 5000,
      max_level: 70,
      crit: 1500,
      speed: 500,
      cost: 20,
      attribute_name: attrName, // Required for race bonus calculation
      ...(overrides.stats || {}),
    },
    abilities: [],
    skill: null,
    bonds: [],
    ...overrides,
  } as Card;
}

function createMemberWithCard(card: Card, overrides: Partial<TeamMemberState> = {}): TeamMemberState {
  return {
    ...createEmptyMemberState(),
    cardId: card.id,
    card,
    ...overrides,
  };
}

// =============================================================================
// Phase 1: Base Stats Calculation
// =============================================================================

describe('Phase 1: Base Stats Calculation', () => {
  it('empty team slot returns zero stats', () => {
    const emptyMember = createEmptyMemberState();
    const results = calculatePhase1BaseStats([emptyMember]);

    expect(results[0].effectiveLevel).toBe(0);
    expect(results[0].baseAtk).toBe(0);
    expect(results[0].baseCritRate).toBe(0);
    expect(results[0].baseSpeed).toBe(0);
    expect(results[0].baseHp).toBe(0);
  });

  it('card with no bonds has zero bond bonus', () => {
    const card = createMockCard();
    const member = createMemberWithCard(card, {
      bond1: 'none',
      bond2: 'none',
      bond3: 'none',
    });

    const results = calculatePhase1BaseStats([member]);

    expect(results[0].atkBondBonus).toBe(0);
    expect(results[0].skillBondBonus).toBe(0);
  });

  it('bond slots stack additively', () => {
    const card = createMockCard();
    const member = createMemberWithCard(card, {
      bond1: 'atk5', // +5% ATK
      bond2: 'atk7', // +7.5% ATK
      bond3: 'skill5', // +5% Skill
    });

    const results = calculatePhase1BaseStats([member]);

    expect(results[0].atkBondBonus).toBeCloseTo(0.125, 3); // 5% + 7.5%
    expect(results[0].skillBondBonus).toBeCloseTo(0.05, 3); // 5%
  });

  it('LB increases effective level by 5 per LB', () => {
    const card = createMockCard();
    const lb0 = createMemberWithCard(card, { limitBreak: 0 });
    const lb4 = createMemberWithCard(card, { limitBreak: 4 });

    const results0 = calculatePhase1BaseStats([lb0]);
    const results4 = calculatePhase1BaseStats([lb4]);

    expect(results0[0].effectiveLevel).toBe(70); // max_level
    expect(results4[0].effectiveLevel).toBe(90); // 70 + 4*5
  });

  it('level bonus adds to effective level', () => {
    const card = createMockCard();
    const member = createMemberWithCard(card, {
      limitBreak: 0,
      levelBonus: 10,
    });

    const results = calculatePhase1BaseStats([member]);

    expect(results[0].effectiveLevel).toBe(80); // 70 + 10
  });
});

// =============================================================================
// Phase 2: Team Context Building
// =============================================================================

describe('Phase 2: Team Context Building', () => {
  it('empty team produces empty sorted arrays', () => {
    const emptyTeam = Array(7).fill(null).map((_, i) => createEmptyMemberState(i >= 5));
    const phase1 = calculatePhase1BaseStats(emptyTeam);
    const context = calculatePhase2TeamContext(phase1, emptyTeam);

    expect(context.byAtk).toHaveLength(0);
    expect(context.bySpeed).toHaveLength(0);
    expect(context.byHp).toHaveLength(0);
  });

  it('single card team has that card in all sorted arrays', () => {
    const card = createMockCard();
    const team = Array(7).fill(null).map((_, i) =>
      i === 0 ? createMemberWithCard(card) : createEmptyMemberState(i >= 5)
    );
    const phase1 = calculatePhase1BaseStats(team);
    const context = calculatePhase2TeamContext(phase1, team);

    expect(context.byAtk).toEqual([0]);
    expect(context.bySpeed).toEqual([0]);
    expect(context.byHp).toEqual([0]);
    expect(context.leaderCardId).toBe(card.id);
  });

  it('attribute counts are calculated correctly', () => {
    const divina1 = createMockCard({ id: '1', attribute: 1 });
    const divina2 = createMockCard({ id: '2', attribute: 1 });
    const phantasma = createMockCard({ id: '3', attribute: 2 });
    const anima = createMockCard({ id: '4', attribute: 3 });

    const team = [
      createMemberWithCard(divina1),
      createMemberWithCard(divina2),
      createMemberWithCard(phantasma),
      createMemberWithCard(anima),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const phase1 = calculatePhase1BaseStats(team);
    const context = calculatePhase2TeamContext(phase1, team);

    expect(context.attributeCounts.divina).toBe(2);
    expect(context.attributeCounts.phantasma).toBe(1);
    expect(context.attributeCounts.anima).toBe(1);
  });

  it('cards are sorted by ATK with bonds applied', () => {
    const baseStats = createMockCard().stats;
    const highAtk = createMockCard({ id: '1', stats: { ...baseStats, max_atk: 15000 } });
    const lowAtk = createMockCard({ id: '2', stats: { ...baseStats, max_atk: 8000 } });

    const team = [
      createMemberWithCard(lowAtk), // Slot 0
      createMemberWithCard(highAtk), // Slot 1
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const phase1 = calculatePhase1BaseStats(team);
    const context = calculatePhase2TeamContext(phase1, team);

    // Higher ATK card (slot 1) should come first
    expect(context.byAtk[0]).toBe(1);
    expect(context.byAtk[1]).toBe(0);
  });
});

// =============================================================================
// Race Bonus Calculation
// =============================================================================

describe('Race Bonus Calculation', () => {
  it('no enemy attribute returns 0 bonus', () => {
    const team = [
      createMemberWithCard(createMockCard({ attribute: 1 })), // Divina
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'None');

    expect(bonus).toBe(0);
  });

  it('leader with advantage gets 10% leader bonus + 5% member bonus (counted twice)', () => {
    // Anima beats Divina
    // Note: The implementation counts the leader in the member loop too (i=0)
    const animaCard = createMockCard({ attribute: 3 }); // Anima
    const team = [
      createMemberWithCard(animaCard), // Leader is Anima (counted as both leader and member)
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'Divina'); // Enemy is Divina

    // 10% leader + 5% for leader counted as member = 15%
    const expected = RACE_BONUS_CONSTANTS.leaderBonus + RACE_BONUS_CONSTANTS.memberBonus;
    expect(bonus).toBeCloseTo(expected, 3);
  });

  it('each advantaged member adds 5% bonus', () => {
    const animaCard1 = createMockCard({ id: '1', attribute: 3 }); // Anima beats Divina
    const animaCard2 = createMockCard({ id: '2', attribute: 3 });
    const animaCard3 = createMockCard({ id: '3', attribute: 3 });
    const team = [
      createMemberWithCard(animaCard1), // Leader (+10% + 5%)
      createMemberWithCard(animaCard2), // Member (+5%)
      createMemberWithCard(animaCard3), // Member (+5%)
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'Divina');

    // 10% leader + 5%*3 members (leader counted as member) = 25%
    const expected = RACE_BONUS_CONSTANTS.leaderBonus + 3 * RACE_BONUS_CONSTANTS.memberBonus;
    expect(bonus).toBeCloseTo(expected, 3);
  });

  it('assist cards with matching leader attribute add 5% bonus each', () => {
    // Note: The function checks if assist matches LEADER's attribute, not advantage attribute
    const animaCard = createMockCard({ id: '1', attribute: 3 }); // Anima beats Divina
    const animaAssist = createMockCard({ id: '2', attribute: 3 }); // Same as leader

    const team = [
      {
        ...createMemberWithCard(animaCard), // Leader is Anima
        assistCard: animaAssist, // Assist matches leader's type
        assistCardId: animaAssist.id,
      },
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'Divina');

    // 10% leader + 5% member (leader counted) + 5% assist = 20%
    const expected = RACE_BONUS_CONSTANTS.leaderBonus +
                     RACE_BONUS_CONSTANTS.memberBonus +
                     RACE_BONUS_CONSTANTS.assistBonus;
    expect(bonus).toBeCloseTo(expected, 3);
  });

  it('non-matching members do not add to bonus', () => {
    // Phantasma doesn't match Anima leader, so no member bonus
    const phantasmaCard = createMockCard({ id: '1', attribute: 2 }); // Phantasma
    const animaCard = createMockCard({ id: '2', attribute: 3 }); // Anima (advantage)

    const team = [
      createMemberWithCard(animaCard), // Leader has advantage (Anima)
      createMemberWithCard(phantasmaCard), // Different type - no bonus
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'Divina');

    // 10% leader + 5% (leader as member) = 15%
    // Phantasma doesn't match Anima, so no additional bonus
    const expected = RACE_BONUS_CONSTANTS.leaderBonus + RACE_BONUS_CONSTANTS.memberBonus;
    expect(bonus).toBeCloseTo(expected, 3);
  });
});

// =============================================================================
// Race Triangle Helpers
// =============================================================================

describe('Race Triangle Helpers', () => {
  it('getAdvantageAttribute returns correct advantage', () => {
    // Anima beats Divina
    expect(getAdvantageAttribute('Divina')).toBe('Anima');
    // Divina beats Phantasma
    expect(getAdvantageAttribute('Phantasma')).toBe('Divina');
    // Phantasma beats Anima
    expect(getAdvantageAttribute('Anima')).toBe('Phantasma');
    // None returns null
    expect(getAdvantageAttribute('None')).toBeNull();
  });

  it('getDisadvantageAttribute returns correct disadvantage', () => {
    // Divina beats Phantasma (so Phantasma is disadvantaged vs Divina)
    expect(getDisadvantageAttribute('Divina')).toBe('Phantasma');
    // Phantasma beats Anima
    expect(getDisadvantageAttribute('Phantasma')).toBe('Anima');
    // Anima beats Divina
    expect(getDisadvantageAttribute('Anima')).toBe('Divina');
    // None returns null
    expect(getDisadvantageAttribute('None')).toBeNull();
  });
});

// =============================================================================
// Edge Cases with Mixed Teams
// =============================================================================

describe('Mixed Team Edge Cases', () => {
  it('reserve slots do not contribute to race bonus', () => {
    const animaCard = createMockCard({ attribute: 3 }); // Anima beats Divina

    const team = [
      createEmptyMemberState(), // Empty leader
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createEmptyMemberState(),
      createMemberWithCard(animaCard, { isReserve: true }), // Reserve has advantage
      createMemberWithCard(animaCard, { isReserve: true }), // Reserve has advantage
    ];

    const bonus = calculateRaceBonus(team, 'Divina');

    // Reserve cards don't count
    expect(bonus).toBe(0);
  });

  it('full advantaged team gets maximum bonus', () => {
    // Create unique cards for each slot to avoid reference issues
    const cards = Array.from({ length: 5 }, (_, i) =>
      createMockCard({ id: `main${i}`, attribute: 3 }) // Anima beats Divina
    );
    const assists = Array.from({ length: 5 }, (_, i) =>
      createMockCard({ id: `assist${i}`, attribute: 3 })
    );

    const mainSlots: TeamMemberState[] = cards.map((card, i) => ({
      ...createMemberWithCard(card),
      assistCard: assists[i],
      assistCardId: assists[i].id,
    }));
    // Add reserve slots
    const team: TeamMemberState[] = [
      ...mainSlots,
      createEmptyMemberState(true),
      createEmptyMemberState(true),
    ];

    const bonus = calculateRaceBonus(team, 'Divina');

    // 10% leader + 5*5% members (leader counted as member) + 5*5% assists = 10% + 25% + 25% = 60%
    const expected =
      RACE_BONUS_CONSTANTS.leaderBonus +
      5 * RACE_BONUS_CONSTANTS.memberBonus +  // 5 members including leader
      5 * RACE_BONUS_CONSTANTS.assistBonus;
    expect(bonus).toBeCloseTo(expected, 3);
  });
});

// =============================================================================
// Phase 3: Helper Slot & Enemy Debuff Stacking
// =============================================================================

function createDefaultEnemy(): EnemyState {
  return {
    baseShield: 0,
    baseDefense: 0,
    isFinalWave: false,
    waveCount: 1,
    attribute: 'None',
    ignoreShieldCap: false,
    worldBossBonus: 1.0,
    healersDontAttack: false,
  };
}

function createDefaultTeamContext(): TeamContext {
  return {
    byAtk: [0, 1, 2, 3, 4],
    bySpeed: [0, 1, 2, 3, 4],
    byHp: [0, 1, 2, 3, 4],
    allByAtk: [0, 1, 2, 3, 4, 5, 6],
    attributeCounts: { divina: 0, phantasma: 0, anima: 0 },
    presentCardIds: new Set(),
    presentAssistIds: new Set(),
    leaderCardId: null,
  };
}

function createDefaultPhase1Result(index: number): Phase1Result {
  return {
    memberIndex: index,
    effectiveLevel: 70,
    baseAtk: 10000,
    baseCritRate: 0.15,
    baseSpeed: 500,
    baseHp: 5000,
    atkBondBonus: 0,
    skillBondBonus: 0,
  };
}

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 'ability-1',
    name: 'Test Ability',
    description: 'All allies DMG +20%',
    stackable: true,
    parsed: {
      target: { type: 'team', count: 0 },
      effects: [{ stat: 'ATK', type: 'ATK', value: 20, isPercent: true }],
    },
    ...overrides,
  };
}

/** Build a full 7-slot team with only the specified slots filled */
function buildTeam(
  slots: Record<number, { card: Card; abilities?: Ability[] }>
): TeamMemberState[] {
  const members: TeamMemberState[] = [];
  for (let i = 0; i < TOTAL_SLOTS; i++) {
    const slot = slots[i];
    if (slot) {
      const card = { ...slot.card, abilities: slot.abilities ?? slot.card.abilities };
      members.push(createMemberWithCard(card, { isReserve: i >= MAIN_TEAM_SIZE }));
    } else {
      members.push(createEmptyMemberState(i >= MAIN_TEAM_SIZE));
    }
  }
  return members;
}

describe('Phase 3: Helper Slot Once-Per-Team Bypass', () => {
  it('helper slot with same non-stackable ability as team card: both apply', () => {
    const sharedAbility = makeAbility({
      id: 'shared-ability',
      stackable: false,
      parsed: {
        target: { type: 'self', count: 0 },
        effects: [{ stat: 'ATK', type: 'ATK', value: 15, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '100' });
    const card2 = createMockCard({ id: '200' });

    // Slot 0 = regular team member, Slot 4 = helper
    const members = buildTeam({
      0: { card: card1, abilities: [sharedAbility] },
      [HELPER_SLOT_INDEX]: { card: card2, abilities: [sharedAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    // Slot 0's ability applies to self (dmg +15% = 0.15 internal)
    expect(results[0].dmgBonus).toBeCloseTo(0.15, 5);
    // Helper's same non-stackable ability also applies (not deduped)
    expect(results[HELPER_SLOT_INDEX].dmgBonus).toBeCloseTo(0.15, 5);
  });

  it('two non-helper cards with same non-stackable ability: only first applies', () => {
    const sharedAbility = makeAbility({
      id: 'shared-ability',
      stackable: false,
      parsed: {
        target: { type: 'self', count: 0 },
        effects: [{ stat: 'ATK', type: 'ATK', value: 15, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '100' });
    const card2 = createMockCard({ id: '200' });

    // Slots 0 and 1 = regular team members (not helper)
    const members = buildTeam({
      0: { card: card1, abilities: [sharedAbility] },
      1: { card: card2, abilities: [sharedAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    // First card's ability applies (dmg +15% = 0.15 internal)
    expect(results[0].dmgBonus).toBeCloseTo(0.15, 5);
    // Second card's same ability is deduplicated (once-per-team)
    expect(results[1].dmgBonus).toBe(0);
  });
});

describe('Phase 3: Enemy Debuff Stacking Between Sources', () => {
  it('two copies of same card with enemy shield debuff: both stack', () => {
    const shieldDebuffAbility = makeAbility({
      id: 'shield-debuff-1',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'SHIELD', type: 'SHIELD', value: -30, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '500' });
    const card2 = createMockCard({ id: '500' });

    const members = buildTeam({
      0: { card: card1, abilities: [shieldDebuffAbility] },
      1: { card: card2, abilities: [shieldDebuffAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    // Both debuffs should stack: 0.30 + 0.30 = 0.60 (values stored as positive after Math.abs)
    expect(results[0].enemyShieldDebuff).toBeCloseTo(0.60, 5);
  });

  it('same card enemy defense debuff from two slots stacks', () => {
    const defenseDebuffAbility = makeAbility({
      id: 'def-debuff-1',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'DEFENSE', type: 'DEFENSE', value: -20, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '600' });
    const card2 = createMockCard({ id: '600' });

    const members = buildTeam({
      0: { card: card1, abilities: [defenseDebuffAbility] },
      2: { card: card2, abilities: [defenseDebuffAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    // Both debuffs should stack: 0.20 + 0.20 = 0.40 (values stored as positive after Math.abs)
    expect(results[0].enemyDefenseDebuff).toBeCloseTo(0.40, 5);
  });

  it('single card enemy shield debuff is not double-counted across targets', () => {
    const shieldDebuffAbility = makeAbility({
      id: 'shield-debuff-solo',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'SHIELD', type: 'SHIELD', value: -25, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '700' });

    const members = buildTeam({
      0: { card: card1, abilities: [shieldDebuffAbility] },
      1: { card: createMockCard({ id: '701' }) },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    // Only applied once despite potentially multiple targets
    expect(results[0].enemyShieldDebuff).toBeCloseTo(0.25, 5);
  });
});

// =============================================================================
// Phase 3: Enemy Debuff Contribution Tracking
// =============================================================================

describe('Phase 3: Enemy Debuff Contribution Tracking', () => {
  it('shield debuff contribution is tracked with correct source info', () => {
    const shieldDebuffAbility = makeAbility({
      id: 'shield-track-1',
      name: 'DMG Amp Ability',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'SHIELD', type: 'SHIELD', value: -25, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '800', name: 'Test Card A' });

    const members = buildTeam({
      0: { card: card1, abilities: [shieldDebuffAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    expect(results[0].enemyDebuffContributions).toHaveLength(1);
    const contrib = results[0].enemyDebuffContributions[0];
    expect(contrib.abilityName).toBe('DMG Amp Ability');
    expect(contrib.sourceMemberIndex).toBe(0);
    expect(contrib.sourceCardId).toBe('800');
    expect(contrib.effects).toEqual([{ stat: 'shield', value: 0.25 }]);
  });

  it('defense debuff contribution is tracked with correct source info', () => {
    const defenseDebuffAbility = makeAbility({
      id: 'def-track-1',
      name: 'Def Down Ability',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'DEFENSE', type: 'DEFENSE', value: -20, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '900', name: 'Test Card B' });

    const members = buildTeam({
      2: { card: card1, abilities: [defenseDebuffAbility] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    expect(results[0].enemyDebuffContributions).toHaveLength(1);
    const contrib = results[0].enemyDebuffContributions[0];
    expect(contrib.abilityName).toBe('Def Down Ability');
    expect(contrib.sourceMemberIndex).toBe(2);
    expect(contrib.sourceCardId).toBe('900');
    expect(contrib.effects).toEqual([{ stat: 'defense', value: 0.20 }]);
  });

  it('multiple debuff sources produce multiple contribution entries', () => {
    const shieldDebuff1 = makeAbility({
      id: 'shield-multi-1',
      name: 'Shield Break A',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'SHIELD', type: 'SHIELD', value: -30, isPercent: true }],
      },
    });

    const shieldDebuff2 = makeAbility({
      id: 'shield-multi-2',
      name: 'Shield Break B',
      stackable: true,
      parsed: {
        target: { type: 'enemy', count: 0 },
        effects: [{ stat: 'SHIELD', type: 'SHIELD', value: -15, isPercent: true }],
      },
    });

    const card1 = createMockCard({ id: '1000' });
    const card2 = createMockCard({ id: '1001' });

    const members = buildTeam({
      0: { card: card1, abilities: [shieldDebuff1] },
      3: { card: card2, abilities: [shieldDebuff2] },
    });

    const phase1 = members.map((_, i) => createDefaultPhase1Result(i));
    const results = calculatePhase3ApplyAbilities(
      members, phase1, createDefaultTeamContext(), createDefaultEnemy()
    );

    const shieldContribs = results[0].enemyDebuffContributions.filter(
      c => c.effects.some(e => e.stat === 'shield')
    );
    expect(shieldContribs).toHaveLength(2);
    expect(shieldContribs[0].sourceMemberIndex).toBe(0);
    expect(shieldContribs[0].effects[0].value).toBeCloseTo(0.30, 5);
    expect(shieldContribs[1].sourceMemberIndex).toBe(3);
    expect(shieldContribs[1].effects[0].value).toBeCloseTo(0.15, 5);
  });
});
