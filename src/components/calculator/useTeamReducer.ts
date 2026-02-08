/**
 * Team State Reducer and Hook
 * Manages all state for the team damage calculator
 * Persists team configuration to localStorage
 */

import { useReducer, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { Card, CardsData } from '../../types/card';
import { getFullCardsData } from '../../lib/cards';
import {
  type TeamState,
  type TeamMemberState,
  type TeamAction,
  type BondType,
  type BondSlotType,
  type ParsedSkillEffect,
  type SkillBuff,
  type StoredTeamState,
  type EnemyAttribute,
  type RandomTargetMode,
  MAIN_TEAM_SIZE,
  TOTAL_SLOTS,
  DEFAULT_BOND_SLOT,
} from '../../lib/team-calc-types';
import {
  calculateTeamDamage,
  isAssistCard,
} from '../../lib/team-calc';

// ============================================================================
// LocalStorage
// ============================================================================

const STORAGE_KEY = 'otogidb-team-calculator';

function saveToStorage(state: TeamState): void {
  try {
    const stored: StoredTeamState = {
      members: state.members.map(m => ({
        cardId: m.cardId,
        assistCardId: m.assistCardId,
        limitBreak: m.limitBreak,
        levelBonus: m.levelBonus,
        bond1: m.bond1,
        bond2: m.bond2,
        bond3: m.bond3,
        bondType: m.bondType,  // Legacy, kept for backwards compatibility
        skillActive: m.skillActive,
      })),
      enemy: state.enemy,
      activeTabIndex: state.activeTabIndex,
      abilityTargetOverrides: state.abilityTargetOverrides,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (e) {
    console.warn('Failed to save team state:', e);
  }
}

function loadFromStorage(): StoredTeamState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load team state:', e);
  }
  return null;
}

// ============================================================================
// Skill Parsing
// ============================================================================

/**
 * Parse skill effects from card's embedded skill data and abilities
 * Returns the buffs that the skill provides to targets
 * @param card - The card with the skill (skill.parsed contains all needed data)
 * @param effectiveLevel - The card's effective level (determines skill level)
 * @param assistCard - Optional assist card whose "On Skill" abilities apply when skill is used
 */
export function parseSkillEffect(
  card: Card,
  effectiveLevel: number,
  assistCard?: Card | null
): ParsedSkillEffect | null {
  if (!card.skill) return null;

  const skill = card.skill;
  const tags = skill.tags || [];
  const description = skill.description || '';

  // Skill level for buffs/debuffs uses the card's effective level directly
  const skillLevel = effectiveLevel;

  // Initialize buffs
  const buffs: SkillBuff = {
    dmgBonus: 0,
    dmgReduction: 0,
    dmgTakenDebuff: 0,
    dmgDealtDebuff: 0,
    critRateBonus: 0,
    critDmgBonus: 0,
    speedBonus: 0,
    speedDebuff: 0,
  };

  // Determine target info - prefer parsed data
  let targetType: 'ally' | 'enemy' | 'self' = 'ally';
  let targetCount = 1;
  let targetPriority: ParsedSkillEffect['targetPriority'] = null;

  // Use parsed data if available (from pipeline)
  if (skill.parsed?.target) {
    const parsedTarget = skill.parsed.target;

    // Map target type
    if (parsedTarget.type === 'self' || parsedTarget.type === 'self_ime') {
      targetType = 'self';
    } else if (parsedTarget.type === 'enemy' || parsedTarget.type === 'current_target') {
      targetType = 'enemy';
    } else if (parsedTarget.type === 'ranked') {
      // Ranked targeting can be for enemies (damage) or allies (heal)
      // Check immediate type or tags to determine actual target
      const immediate = skill.parsed?.immediate as { type?: string } | undefined;
      if (immediate?.type === 'ATK' || tags.includes('DMG') || description.includes('Deals')) {
        targetType = 'enemy';
      } else {
        targetType = 'ally';
      }
    } else if (parsedTarget.type === 'ally') {
      targetType = 'ally';
    }

    // Use exact target count from parsed data
    targetCount = parsedTarget.count || 1;

    // Determine priority from filter
    if (parsedTarget.filter?.includes('max_atk')) {
      targetPriority = 'highest_atk';
    } else if (parsedTarget.filter?.includes('min_hp')) {
      targetPriority = 'lowest_hp';
    } else if (parsedTarget.filter?.includes('max_hp')) {
      targetPriority = 'highest_atk'; // Map to ATK for now, HP targeting not implemented
    } else if (parsedTarget.filter?.includes('max_spd')) {
      targetPriority = 'highest_atk'; // Map to ATK for now, speed targeting not implemented
    } else if (targetCount >= 5) {
      targetPriority = 'all';
    }
  } else {
    // Fallback to tag-based detection only (no description parsing)
    // NOTE: All skills should have parsed data - this is just a safety fallback
    if (tags.includes('Heal')) {
      targetType = 'ally';
    } else if (tags.includes('DMG')) {
      targetType = 'enemy';
    }
    if (tags.includes('Self')) {
      targetType = 'self';
    }

    if (tags.includes('AoE')) {
      targetCount = 99;
      targetPriority = 'all';
    } else if (tags.includes('Multi')) {
      // Default to 2 targets - can't extract count without regex
      targetCount = 2;
    }
  }

  // Parse effects - prefer parsed data from pipeline
  // Track duration for display (use max duration from all effects)
  let effectDuration: number | undefined;

  if (skill.parsed?.effects && skill.parsed.effects.length > 0) {
    for (const effect of skill.parsed.effects) {
      const baseValue = effect.value / 100;
      const scaling = (effect.scale || 0) / 100;
      const totalValue = baseValue + scaling * (skillLevel - 1);

      // Track duration from effect data
      if (effect.duration && effect.duration > 0) {
        effectDuration = Math.max(effectDuration ?? 0, effect.duration);
      }

      switch (effect.type) {
        case 'ATK':
          // ATK buff for allies = dmgBonus
          if (targetType === 'ally' || targetType === 'self') {
            if (totalValue > 0) {
              buffs.dmgBonus = totalValue;
            } else {
              buffs.dmgDealtDebuff = Math.abs(totalValue);
            }
          } else {
            // Enemy debuff
            buffs.dmgDealtDebuff = Math.abs(totalValue);
          }
          break;
        case 'SHIELD':
          if (totalValue < 0) {
            buffs.dmgTakenDebuff = Math.abs(totalValue);
          } else {
            buffs.dmgReduction = totalValue;
          }
          break;
        case 'CHIT':
          buffs.critRateBonus = totalValue;
          break;
        case 'CHIT_ATK':
          buffs.critDmgBonus = totalValue;
          break;
        case 'SPD':
          if (totalValue > 0) {
            buffs.speedBonus = totalValue;
          } else {
            buffs.speedDebuff = Math.abs(totalValue);
          }
          break;
        case 'DEFENSE':
          if (totalValue < 0) {
            buffs.dmgDealtDebuff = Math.abs(totalValue) / 1000;
          }
          break;
      }
    }
  }
  // Note: No fallback needed - all skills have parsed data in cards.json

  // Parse "On Skill" abilities that modify the skill effect
  // Check both the main card's abilities and the assist card's abilities
  // Use parsed data (source of truth) instead of description parsing
  const allAbilities = [
    ...(card.abilities || []),
    ...(assistCard?.abilities || []),
  ];

  for (const ability of allAbilities) {
    const abilityTags = ability.tags || [];
    if (!abilityTags.includes('On Skill')) continue;

    // Check unlock level
    const unlockLevel = ability.unlock_level || 1;
    if (effectiveLevel < unlockLevel) continue;

    // Use parsed data if available (source of truth - description may have typos like 80% vs 60%)
    if (ability.parsed?.effects && ability.parsed.effects.length > 0) {
      for (const effect of ability.parsed.effects) {
        const value = (effect.value || 0) / 100;
        switch (effect.type) {
          case 'CHIT':
            buffs.critRateBonus += value;
            break;
          case 'CHIT_ATK':
            buffs.critDmgBonus += value;
            break;
          case 'SPD':
            if (value > 0) {
              buffs.speedBonus += value;
            } else {
              buffs.speedDebuff += Math.abs(value);
            }
            break;
          case 'SHIELD':
            if (value < 0) {
              buffs.dmgTakenDebuff += Math.abs(value);
            }
            break;
          case 'ATK':
            if (value > 0) {
              buffs.dmgBonus += value;
            }
            break;
        }
      }
    }
    // Note: No fallback to description parsing - all abilities have parsed data
  }

  // Only return if skill has meaningful buffs
  const hasBuffs = Object.values(buffs).some(v => v !== 0);
  if (!hasBuffs) return null;

  return {
    targetType,
    targetCount,
    targetPriority,
    buffs,
    duration: effectDuration,
  };
}

// ============================================================================
// Initial State
// ============================================================================

function createEmptyMember(index: number): TeamMemberState {
  return {
    cardId: null,
    card: null,
    assistCardId: null,
    assistCard: null,
    limitBreak: 4, // Default to MLB
    levelBonus: 0,
    bond1: DEFAULT_BOND_SLOT,  // Default to +7.5% ATK
    bond2: DEFAULT_BOND_SLOT,  // Default to +7.5% ATK
    bond3: DEFAULT_BOND_SLOT,  // Default to +7.5% ATK (locked to 'none' if assist selected)
    bondType: 'atk15',         // Legacy (kept for backwards compatibility)
    skillActive: false,
    isReserve: index >= MAIN_TEAM_SIZE,
    computedStats: null,
    damageResult: null,
    abilityContributions: [],
    skillEffect: null,
  };
}

function createInitialState(): TeamState {
  return {
    members: Array.from({ length: TOTAL_SLOTS }, (_, i) => createEmptyMember(i)),
    activeTabIndex: 0,
    enemy: {
      baseShield: 0,      // Default 0% shield
      baseDefense: 0,     // Default 0% defense (separate from shield)
      isFinalWave: false,
      waveCount: 1,
      attribute: 'None',  // Default: race bonus disabled
      ignoreShieldCap: false, // Default: apply -75%/+85% shield cap
      worldBossBonus: 1.0, // Default: no bonus (1.0x)
      healersDontAttack: true, // Default: healers don't deal damage (busy healing)
    },
    abilityTargetOverrides: {},
    randomTargetMode: 'average',  // Default: distribute effect proportionally
    teamContext: null,
    isLoading: true,
    error: null,
  };
}

// ============================================================================
// Reducer
// ============================================================================

function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'SET_CARD': {
      const { memberIndex, cardId } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      const member = { ...newMembers[memberIndex] };

      member.cardId = cardId;
      member.card = null;
      member.skillActive = false; // Reset skill when card changes
      member.skillEffect = null;

      newMembers[memberIndex] = member;
      return { ...state, members: newMembers };
    }

    case 'SET_ASSIST': {
      const { memberIndex, cardId } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      const member = { ...newMembers[memberIndex] };

      member.assistCardId = cardId;
      member.assistCard = null;

      // Lock bond3 to 'none' when an assist is selected
      if (cardId) {
        member.bond3 = 'none';
      }

      newMembers[memberIndex] = member;
      return { ...state, members: newMembers };
    }

    case 'SET_LIMIT_BREAK': {
      const { memberIndex, value } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;
      if (value < 0 || value > 4) return state;

      const newMembers = [...state.members];
      newMembers[memberIndex] = { ...newMembers[memberIndex], limitBreak: value };
      return { ...state, members: newMembers };
    }

    case 'SET_LEVEL_BONUS': {
      const { memberIndex, value } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;
      if (value < 0 || value > 30) return state;

      const newMembers = [...state.members];
      newMembers[memberIndex] = { ...newMembers[memberIndex], levelBonus: value };
      return { ...state, members: newMembers };
    }

    case 'SET_BOND_SLOT': {
      const { memberIndex, slot, value } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      if (slot === 1) {
        newMembers[memberIndex] = { ...newMembers[memberIndex], bond1: value };
      } else if (slot === 2) {
        newMembers[memberIndex] = { ...newMembers[memberIndex], bond2: value };
      } else {
        newMembers[memberIndex] = { ...newMembers[memberIndex], bond3: value };
      }
      return { ...state, members: newMembers };
    }

    case 'SET_BOND_TYPE': {
      // Legacy action - kept for backwards compatibility
      const { memberIndex, bondType } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      newMembers[memberIndex] = { ...newMembers[memberIndex], bondType };
      return { ...state, members: newMembers };
    }

    case 'TOGGLE_SKILL': {
      const { memberIndex } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      const member = { ...newMembers[memberIndex] };

      // Reserve slots cannot activate skills
      if (member.isReserve) return state;

      member.skillActive = !member.skillActive;
      newMembers[memberIndex] = member;
      return { ...state, members: newMembers };
    }

    case 'SET_ACTIVE_TAB': {
      const { index } = action;
      if (index < 0 || index >= TOTAL_SLOTS) return state;
      return { ...state, activeTabIndex: index };
    }

    case 'SET_ENEMY_BASE_SHIELD': {
      const { value } = action;
      const clampedValue = Math.max(-0.75, Math.min(0.85, value));
      return { ...state, enemy: { ...state.enemy, baseShield: clampedValue } };
    }

    case 'SET_ENEMY_BASE_DEFENSE': {
      const { value } = action;
      const clampedValue = Math.max(0, Math.min(0.85, value)); // Defense: 0-85%
      return { ...state, enemy: { ...state.enemy, baseDefense: clampedValue } };
    }

    case 'SET_ENEMY_ATTRIBUTE': {
      return { ...state, enemy: { ...state.enemy, attribute: action.value } };
    }

    case 'SET_FINAL_WAVE': {
      return { ...state, enemy: { ...state.enemy, isFinalWave: action.value } };
    }

    case 'SET_WAVE_COUNT': {
      const value = Math.max(1, Math.min(10, action.value)); // 1-10 waves
      return { ...state, enemy: { ...state.enemy, waveCount: value } };
    }

    case 'SET_IGNORE_SHIELD_CAP': {
      return { ...state, enemy: { ...state.enemy, ignoreShieldCap: action.value } };
    }

    case 'SET_WORLD_BOSS_BONUS': {
      const clampedValue = Math.max(1.0, Math.min(5.0, action.value)); // 1.0x to 5.0x
      return { ...state, enemy: { ...state.enemy, worldBossBonus: clampedValue } };
    }

    case 'SET_HEALERS_DONT_ATTACK': {
      return { ...state, enemy: { ...state.enemy, healersDontAttack: action.value } };
    }

    case 'SET_ABILITY_TARGETS': {
      const { abilityId, targets } = action;
      // Validate targets are main team members (0-4)
      const validTargets = targets.filter(t => t >= 0 && t < MAIN_TEAM_SIZE);
      const newOverrides = { ...state.abilityTargetOverrides };
      if (validTargets.length === 0) {
        // Remove override if empty (use automatic selection)
        delete newOverrides[abilityId];
      } else {
        newOverrides[abilityId] = validTargets;
      }
      return { ...state, abilityTargetOverrides: newOverrides };
    }

    case 'SET_RANDOM_TARGET_MODE': {
      return { ...state, randomTargetMode: action.mode };
    }

    case 'CLEAR_MEMBER': {
      const { memberIndex } = action;
      if (memberIndex < 0 || memberIndex >= TOTAL_SLOTS) return state;

      const newMembers = [...state.members];
      newMembers[memberIndex] = createEmptyMember(memberIndex);
      return { ...state, members: newMembers };
    }

    case 'CLEAR_ALL': {
      return {
        ...createInitialState(),
        isLoading: false,
        error: null,
      };
    }

    case 'SET_LOADING': {
      return { ...state, isLoading: action.isLoading };
    }

    case 'SET_ERROR': {
      return { ...state, error: action.error };
    }

    case 'UPDATE_COMPUTED': {
      return {
        ...state,
        members: action.members,
        teamContext: action.teamContext,
      };
    }

    case 'LOAD_FROM_STORAGE': {
      const stored = action.state;
      if (!stored.members) return state;

      const newMembers = state.members.map((member, i) => {
        const storedMember = stored.members?.[i];
        if (!storedMember) return member;

        return {
          ...member,
          cardId: storedMember.cardId ?? null,
          assistCardId: storedMember.assistCardId ?? null,
          limitBreak: storedMember.limitBreak ?? 4,
          levelBonus: storedMember.levelBonus ?? 0,
          bond1: storedMember.bond1 ?? DEFAULT_BOND_SLOT,
          bond2: storedMember.bond2 ?? DEFAULT_BOND_SLOT,
          bond3: storedMember.bond3 ?? (storedMember.assistCardId ? 'none' : DEFAULT_BOND_SLOT),
          bondType: storedMember.bondType ?? 'atk15',  // Legacy
          skillActive: storedMember.skillActive ?? false,
        };
      });

      // Handle backwards compatibility for old storage format
      const enemy = stored.enemy ? {
        baseShield: stored.enemy.baseShield ?? (stored.enemy as any).shieldValue ?? 0,
        baseDefense: stored.enemy.baseDefense ?? 0,  // Default 0 for old saves
        isFinalWave: stored.enemy.isFinalWave ?? false,
        waveCount: stored.enemy.waveCount ?? 1,
        attribute: stored.enemy.attribute ?? 'None',  // Default disabled for old saves
        ignoreShieldCap: stored.enemy.ignoreShieldCap ?? false,  // Default capped for old saves
        worldBossBonus: stored.enemy.worldBossBonus ?? 1.0,  // Default no bonus
        healersDontAttack: stored.enemy.healersDontAttack ?? false, // Default off
      } : state.enemy;

      return {
        ...state,
        members: newMembers,
        enemy,
        activeTabIndex: stored.activeTabIndex ?? 0,
        abilityTargetOverrides: stored.abilityTargetOverrides ?? {},
      };
    }

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Export format for sharing team configurations
 * Includes card names for human readability
 */
export interface ExportedTeamState {
  version: 1;
  members: Array<{
    cardId: string | null;
    cardName?: string;
    assistCardId: string | null;
    assistCardName?: string;
    limitBreak: number;
    levelBonus: number;
    bond1: BondSlotType;
    bond2: BondSlotType;
    bond3: BondSlotType;
    bondType?: BondType;  // Legacy, for backwards compatibility
    skillActive: boolean;
  }>;
  enemy: {
    baseShield: number;
    baseDefense: number;
    isFinalWave: boolean;
    waveCount: number;
    attribute: EnemyAttribute;
    ignoreShieldCap?: boolean; // Optional for backwards compatibility
  };
  abilityTargetOverrides?: Record<string, number[]>;
}

export interface UseTeamStateResult {
  state: TeamState;

  // Data
  cards: Record<string, Card>;
  cardsList: Card[];
  assistCards: Card[];
  nonAssistCards: Card[];

  // Actions
  setCard: (memberIndex: number, cardId: string | null) => void;
  setAssist: (memberIndex: number, cardId: string | null) => void;
  setLimitBreak: (memberIndex: number, value: number) => void;
  setLevelBonus: (memberIndex: number, value: number) => void;
  setBondSlot: (memberIndex: number, slot: 1 | 2 | 3, value: BondSlotType) => void;
  setBondType: (memberIndex: number, bondType: BondType) => void;  // Legacy
  toggleSkill: (memberIndex: number) => void;
  setActiveTab: (index: number) => void;
  setEnemyBaseShield: (value: number) => void;
  setEnemyBaseDefense: (value: number) => void;
  setEnemyAttribute: (value: EnemyAttribute) => void;
  setFinalWave: (value: boolean) => void;
  setWaveCount: (value: number) => void;
  setIgnoreShieldCap: (value: boolean) => void;
  setWorldBossBonus: (value: number) => void;
  setHealersDontAttack: (value: boolean) => void;
  setAbilityTargets: (abilityId: string, targets: number[]) => void;
  setRandomTargetMode: (mode: RandomTargetMode) => void;
  clearMember: (memberIndex: number) => void;
  clearAll: () => void;
  exportTeam: () => string;
  importTeam: (json: string) => boolean;
  // Calculation results
  calculationResults: {
    effectiveEnemyShield: number;
    effectiveEnemyDefense: number;
    skillDebuffTotal: number;
    abilityDebuffTotal: number;
    raceBonus: number;
  } | null;
}

export function useTeamState(): UseTeamStateResult {
  const [state, dispatch] = useReducer(teamReducer, createInitialState());
  const hasLoadedFromStorage = useRef(false);

  // Load cards data (skills are embedded in cards.json)
  const [cardsData, setCardsData] = useState<CardsData | null>(null);

  // Store calculation results (debuff totals, race bonus, etc.)
  const [calculationResults, setCalculationResults] = useState<{
    effectiveEnemyShield: number;
    effectiveEnemyDefense: number;
    skillDebuffTotal: number;
    abilityDebuffTotal: number;
    raceBonus: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const cards = await getFullCardsData();

        if (mounted) {
          setCardsData(cards);

          // Load from storage after data is ready
          const stored = loadFromStorage();
          if (stored) {
            dispatch({ type: 'LOAD_FROM_STORAGE', state: stored });
            hasLoadedFromStorage.current = true;
          }

          dispatch({ type: 'SET_LOADING', isLoading: false });
        }
      } catch (error) {
        if (mounted) {
          dispatch({ type: 'SET_ERROR', error: String(error) });
          dispatch({ type: 'SET_LOADING', isLoading: false });
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  // Memoize card lists
  const cards = useMemo(() => cardsData?.cards || {}, [cardsData]);
  const cardsList = useMemo(() => Object.values(cards), [cards]);
  const assistCards = useMemo(
    () => cardsList.filter(card => isAssistCard(card)),
    [cardsList]
  );
  const nonAssistCards = useMemo(
    () => cardsList.filter(card => !isAssistCard(card)),
    [cardsList]
  );

  // Resolve card references, parse skills, and recalculate when state changes
  useEffect(() => {
    if (state.isLoading || !cardsData) return;

    // Resolve card references
    // Important: Clear abilityContributions to prevent stale data
    // They will be recalculated fresh by calculateTeamDamage
    const resolvedMembers = state.members.map((member) => {
      const newMember = { ...member };

      // Clear ability contributions - they'll be recalculated
      newMember.abilityContributions = [];

      // Resolve main card
      if (member.cardId && member.cardId !== member.card?.id) {
        newMember.card = cards[member.cardId] || null;
      } else if (!member.cardId) {
        newMember.card = null;
        newMember.skillEffect = null;
      }

      // Resolve assist card
      if (member.assistCardId && member.assistCardId !== member.assistCard?.id) {
        newMember.assistCard = cards[member.assistCardId] || null;
      } else if (!member.assistCardId) {
        newMember.assistCard = null;
      }

      return newMember;
    });

    // Calculate team damage (this gives us effective levels)
    // Pass randomTargetMode to control how N-target abilities are resolved
    const result = calculateTeamDamage(resolvedMembers, state.enemy, state.abilityTargetOverrides, state.randomTargetMode);

    // Update members with computed results AND parse skill effects with correct level
    const updatedMembers = resolvedMembers.map((member, index) => {
      const phase4 = result.members[index];
      const effectiveLevel = phase4.computedStats.effectiveLevel;

      // Parse skill effect with the actual effective level for proper scaling
      // Include assist card so its "On Skill" abilities can apply
      let skillEffect = member.skillEffect;
      if (member.card) {
        skillEffect = parseSkillEffect(member.card, effectiveLevel, member.assistCard);
      }

      return {
        ...member,
        computedStats: phase4.computedStats,
        damageResult: phase4.damageResult,
        abilityContributions: phase4.abilityContributions,
        skillEffect,
      };
    });

    dispatch({
      type: 'UPDATE_COMPUTED',
      members: updatedMembers,
      teamContext: result.teamContext,
    });

    // Store calculation results for display
    setCalculationResults({
      effectiveEnemyShield: result.effectiveEnemyShield,
      effectiveEnemyDefense: result.effectiveEnemyDefense,
      skillDebuffTotal: result.skillDebuffTotal,
      abilityDebuffTotal: result.abilityDebuffTotal,
      raceBonus: result.raceBonus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Serialize all member fields that affect calculation (auto-captures new fields like bond1/2/3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.members.map(m => `${m.cardId}-${m.assistCardId}-${m.limitBreak}-${m.levelBonus}-${m.bond1}-${m.bond2}-${m.bond3}-${m.bondType}-${m.skillActive}`).join('|'),
    // Serialize entire enemy object so new fields (like healersDontAttack) are automatically captured
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(state.enemy),
    state.randomTargetMode,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(state.abilityTargetOverrides),
    cardsData,
    state.isLoading,
  ]);

  // Save to localStorage when state changes (debounced)
  useEffect(() => {
    if (state.isLoading) return;

    const timeout = setTimeout(() => {
      saveToStorage(state);
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    state.members.map(m => `${m.cardId}-${m.assistCardId}-${m.limitBreak}-${m.levelBonus}-${m.bondType}-${m.skillActive}`).join('|'),
    state.enemy.baseShield,
    state.enemy.baseDefense,
    state.enemy.attribute,
    state.enemy.isFinalWave,
    state.enemy.waveCount,
    state.activeTabIndex,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(state.abilityTargetOverrides),
    state.isLoading,
  ]);

  // Action creators
  const setCard = useCallback((memberIndex: number, cardId: string | null) => {
    dispatch({ type: 'SET_CARD', memberIndex, cardId });
  }, []);

  const setAssist = useCallback((memberIndex: number, cardId: string | null) => {
    dispatch({ type: 'SET_ASSIST', memberIndex, cardId });
  }, []);

  const setLimitBreak = useCallback((memberIndex: number, value: number) => {
    dispatch({ type: 'SET_LIMIT_BREAK', memberIndex, value });
  }, []);

  const setLevelBonus = useCallback((memberIndex: number, value: number) => {
    dispatch({ type: 'SET_LEVEL_BONUS', memberIndex, value });
  }, []);

  const setBondSlot = useCallback((memberIndex: number, slot: 1 | 2 | 3, value: BondSlotType) => {
    dispatch({ type: 'SET_BOND_SLOT', memberIndex, slot, value });
  }, []);

  const setBondType = useCallback((memberIndex: number, bondType: BondType) => {
    dispatch({ type: 'SET_BOND_TYPE', memberIndex, bondType });
  }, []);

  const toggleSkill = useCallback((memberIndex: number) => {
    dispatch({ type: 'TOGGLE_SKILL', memberIndex });
  }, []);

  const setActiveTab = useCallback((index: number) => {
    dispatch({ type: 'SET_ACTIVE_TAB', index });
  }, []);

  const setEnemyBaseShield = useCallback((value: number) => {
    dispatch({ type: 'SET_ENEMY_BASE_SHIELD', value });
  }, []);

  const setEnemyBaseDefense = useCallback((value: number) => {
    dispatch({ type: 'SET_ENEMY_BASE_DEFENSE', value });
  }, []);

  const setEnemyAttribute = useCallback((value: EnemyAttribute) => {
    dispatch({ type: 'SET_ENEMY_ATTRIBUTE', value });
  }, []);

  const setFinalWave = useCallback((value: boolean) => {
    dispatch({ type: 'SET_FINAL_WAVE', value });
  }, []);

  const setWaveCount = useCallback((value: number) => {
    dispatch({ type: 'SET_WAVE_COUNT', value });
  }, []);

  const setIgnoreShieldCap = useCallback((value: boolean) => {
    dispatch({ type: 'SET_IGNORE_SHIELD_CAP', value });
  }, []);

  const setWorldBossBonus = useCallback((value: number) => {
    dispatch({ type: 'SET_WORLD_BOSS_BONUS', value });
  }, []);

  const setHealersDontAttack = useCallback((value: boolean) => {
    dispatch({ type: 'SET_HEALERS_DONT_ATTACK', value });
  }, []);

  const setAbilityTargets = useCallback((abilityId: string, targets: number[]) => {
    dispatch({ type: 'SET_ABILITY_TARGETS', abilityId, targets });
  }, []);

  const setRandomTargetMode = useCallback((mode: RandomTargetMode) => {
    dispatch({ type: 'SET_RANDOM_TARGET_MODE', mode });
  }, []);

  const clearMember = useCallback((memberIndex: number) => {
    dispatch({ type: 'CLEAR_MEMBER', memberIndex });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    // Clear storage too
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
  }, []);

  // Export team configuration as shareable JSON
  const exportTeam = useCallback((): string => {
    const exported: ExportedTeamState = {
      version: 1,
      members: state.members.map(m => ({
        cardId: m.cardId,
        cardName: m.card?.name ?? undefined,
        assistCardId: m.assistCardId,
        assistCardName: m.assistCard?.name ?? undefined,
        limitBreak: m.limitBreak,
        levelBonus: m.levelBonus,
        bond1: m.bond1,
        bond2: m.bond2,
        bond3: m.bond3,
        skillActive: m.skillActive,
      })),
      enemy: {
        baseShield: state.enemy.baseShield,
        baseDefense: state.enemy.baseDefense,
        isFinalWave: state.enemy.isFinalWave,
        waveCount: state.enemy.waveCount,
        attribute: state.enemy.attribute,
        ignoreShieldCap: state.enemy.ignoreShieldCap,
      },
      abilityTargetOverrides: Object.keys(state.abilityTargetOverrides).length > 0
        ? state.abilityTargetOverrides
        : undefined,
    };
    return JSON.stringify(exported, null, 2);
  }, [state.members, state.enemy, state.abilityTargetOverrides]);

  // Import team configuration from JSON
  const importTeam = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);

      // Validate structure
      if (!data.members || !Array.isArray(data.members)) {
        console.warn('Invalid team data: missing members array');
        return false;
      }

      // Convert to StoredTeamState format for the reducer
      const stored: StoredTeamState = {
        members: data.members.map((m: any) => ({
          cardId: m.cardId ?? null,
          assistCardId: m.assistCardId ?? null,
          limitBreak: m.limitBreak ?? 4,
          levelBonus: m.levelBonus ?? 0,
          bond1: m.bond1 ?? 'none',  // Default to 'none' for new imports
          bond2: m.bond2 ?? 'none',
          bond3: m.bond3 ?? (m.assistCardId ? 'none' : 'none'),
          bondType: m.bondType ?? 'atk15',  // Legacy
          skillActive: m.skillActive ?? false,
        })),
        enemy: {
          baseShield: data.enemy?.baseShield ?? 0,
          baseDefense: data.enemy?.baseDefense ?? 0,
          isFinalWave: data.enemy?.isFinalWave ?? false,
          waveCount: data.enemy?.waveCount ?? 1,
          attribute: data.enemy?.attribute ?? 'None',
          ignoreShieldCap: data.enemy?.ignoreShieldCap ?? false,
        },
        activeTabIndex: 0,
        abilityTargetOverrides: data.abilityTargetOverrides ?? {},
      };

      dispatch({ type: 'LOAD_FROM_STORAGE', state: stored });
      return true;
    } catch (e) {
      console.warn('Failed to import team:', e);
      return false;
    }
  }, []);

  return {
    state,
    cards,
    cardsList,
    assistCards,
    nonAssistCards,
    setCard,
    setAssist,
    setLimitBreak,
    setLevelBonus,
    setBondSlot,
    setBondType,
    toggleSkill,
    setActiveTab,
    setEnemyBaseShield,
    setEnemyBaseDefense,
    setEnemyAttribute,
    setFinalWave,
    setWaveCount,
    setIgnoreShieldCap,
    setWorldBossBonus,
    setHealersDontAttack,
    setAbilityTargets,
    setRandomTargetMode,
    clearMember,
    clearAll,
    exportTeam,
    importTeam,
    calculationResults,
  };
}
