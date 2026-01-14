import { useMemo } from 'react';
import type { Card } from '../types/card';
import type { TagCategory } from '../components/cards/filters';

export interface FilterOptions {
  attributes: string[];
  types: string[];
  rarities: number[];
  bondTypes: string[];
  skillTags: string[];
  abilityTags: string[];
  sources: string[];
}

export interface UseCardFilterOptionsResult {
  filterOptions: FilterOptions;
  skillTagCategories: TagCategory[];
  abilityTagCategories: TagCategory[];
}

/**
 * Hook to compute filter options from cards data.
 * Extracts unique values for each filterable field and organizes tags into categories.
 */
export function useCardFilterOptions(cards: Card[]): UseCardFilterOptionsResult {
  // Get unique filter options
  const filterOptions = useMemo(() => {
    const attributes = new Set<string>();
    const types = new Set<string>();
    const rarities = new Set<number>();
    const bondTypes = new Set<string>();
    const skillTags = new Set<string>();
    const abilityTags = new Set<string>();

    cards.forEach(card => {
      if (card.stats.attribute_name) attributes.add(card.stats.attribute_name);
      if (card.stats.type_name) types.add(card.stats.type_name);
      if (card.stats.rarity) rarities.add(card.stats.rarity);
      if (card.bonds && card.bonds.length > 0) {
        card.bonds.forEach(bond => {
          if (bond.type) bondTypes.add(bond.type);
        });
      }
      if (card.skill?.tags) {
        card.skill.tags.forEach(tag => skillTags.add(tag));
      }
      if (card.abilities) {
        card.abilities.forEach(ability => {
          if (ability.tags) {
            ability.tags.forEach(tag => abilityTags.add(tag));
          }
        });
      }
    });

    // Sort attributes: known attributes first (Divina, Anima, Phantasma), then others/unknown at bottom
    const knownAttributes = ['Divina', 'Anima', 'Phantasma'];
    const sortedAttributes = Array.from(attributes).sort((a, b) => {
      const aKnown = knownAttributes.indexOf(a);
      const bKnown = knownAttributes.indexOf(b);
      // Both known: sort by predefined order
      if (aKnown !== -1 && bKnown !== -1) return aKnown - bKnown;
      // Only a is known: a comes first
      if (aKnown !== -1) return -1;
      // Only b is known: b comes first
      if (bKnown !== -1) return 1;
      // Neither known: alphabetical (Unknown, Neutral, etc. at end)
      return a.localeCompare(b);
    });

    // Sort bond types: Attack, Skill, HP first, then others
    const knownBondTypes = ['Attack', 'Skill', 'HP'];
    const sortedBondTypes = Array.from(bondTypes).sort((a, b) => {
      const aKnown = knownBondTypes.indexOf(a);
      const bKnown = knownBondTypes.indexOf(b);
      if (aKnown !== -1 && bKnown !== -1) return aKnown - bKnown;
      if (aKnown !== -1) return -1;
      if (bKnown !== -1) return 1;
      return a.localeCompare(b);
    });

    // Sort skill tags: effect types first, then status effects, then secondary effects
    const tagOrder = ['DMG', 'Heal', 'Buff', 'Debuff', 'Single', 'Multi', 'AoE', 'Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify', 'Slow', 'DEF Down', 'DMG Up', 'DMG Down', 'Cleanse'];
    const sortedSkillTags = Array.from(skillTags).sort((a, b) => {
      const aIndex = tagOrder.indexOf(a);
      const bIndex = tagOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Sort ability tags: buff effects first, then defensive, then status, then scope
    const abilityTagOrder = ['DMG Boost', 'Crit Rate', 'Crit DMG', 'ATK Speed', 'Skill DMG', 'Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Slow', 'DMG Amp', 'Enemy DMG Down', 'Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify', 'Immunity', 'Team', 'Divina', 'Anima', 'Phantasma', 'Melee', 'Ranged', 'Healer', 'Leader', 'Wave Start', 'Final Wave', 'Drop Rate', 'Time Limit', 'EXP Boost', 'Soulstone Boost'];
    const sortedAbilityTags = Array.from(abilityTags).sort((a, b) => {
      const aIndex = abilityTagOrder.indexOf(a);
      const bIndex = abilityTagOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Collect acquisition sources
    const sources = new Set<string>();
    cards.forEach(card => {
      if (card.acquisition?.sources) {
        card.acquisition.sources.forEach(s => sources.add(s));
      }
    });
    // Define source order
    const sourceOrder = ['gacha', 'auction', 'exchange', 'event', 'daily'];
    const sortedSources = Array.from(sources).sort((a, b) => {
      const aIndex = sourceOrder.indexOf(a);
      const bIndex = sourceOrder.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      attributes: sortedAttributes,
      types: Array.from(types).sort(),
      rarities: Array.from(rarities).sort((a, b) => b - a), // Descending
      bondTypes: sortedBondTypes,
      skillTags: sortedSkillTags,
      abilityTags: sortedAbilityTags,
      sources: sortedSources,
    };
  }, [cards]);

  // Build skill tag categories for grouped dropdown
  const skillTagCategories = useMemo<TagCategory[]>(() => {
    const available = new Set(filterOptions.skillTags);
    return [
      {
        name: 'Effect',
        tags: ['DMG', 'Heal', 'DMG Boost', 'Debuff'].filter(t => available.has(t)),
        colorClass: 'text-yellow-500'
      },
      {
        name: 'Target',
        tags: ['Self', 'Single', 'Multi', 'AoE'].filter(t => available.has(t)),
        colorClass: 'text-blue-600 dark:text-blue-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-600 dark:text-red-400'
      },
      {
        name: 'Buffs',
        tags: ['DEF Up', 'Speed Up', 'Crit Rate', 'DMG Reduction', 'Cleanse'].filter(t => available.has(t)),
        colorClass: 'text-green-600 dark:text-green-400'
      },
      {
        name: 'Debuffs',
        tags: ['Slow', 'DEF Down', 'DMG Up', 'DMG Down', 'Dispel'].filter(t => available.has(t)),
        colorClass: 'text-purple-600 dark:text-purple-400'
      },
    ];
  }, [filterOptions.skillTags]);

  // Build ability tag categories for grouped dropdown
  const abilityTagCategories = useMemo<TagCategory[]>(() => {
    const available = new Set(filterOptions.abilityTags);
    return [
      {
        name: 'Offensive',
        tags: ['DMG Boost', 'Crit Rate', 'Crit DMG', 'ATK Speed', 'Skill DMG'].filter(t => available.has(t)),
        colorClass: 'text-yellow-500'
      },
      {
        name: 'Defensive',
        tags: ['Max HP', 'DMG Reduction', 'Lifesteal', 'Heal', 'Immunity', 'Counter'].filter(t => available.has(t)),
        colorClass: 'text-green-600 dark:text-green-400'
      },
      {
        name: 'Debuffs',
        tags: ['Slow', 'DMG Amp', 'Enemy DMG Down'].filter(t => available.has(t)),
        colorClass: 'text-purple-600 dark:text-purple-400'
      },
      {
        name: 'Status',
        tags: ['Stun', 'Poison', 'Burn', 'Freeze', 'Sleep', 'Silence', 'Paralysis', 'Petrify'].filter(t => available.has(t)),
        colorClass: 'text-red-600 dark:text-red-400'
      },
      {
        name: 'Target',
        tags: ['Self', 'Single', 'Multi', 'AoE', 'Team'].filter(t => available.has(t)),
        colorClass: 'text-blue-600 dark:text-blue-400'
      },
      {
        name: 'Scope',
        tags: ['Divina', 'Anima', 'Phantasma', 'Neutral', 'Melee', 'Ranged', 'Leader'].filter(t => available.has(t)),
        colorClass: 'text-teal-600 dark:text-teal-400'
      },
      {
        name: 'Timing',
        tags: ['Wave Start', 'Final Wave', 'On Skill', 'On Attack', 'Conditional'].filter(t => available.has(t)),
        colorClass: 'text-orange-400'
      },
      {
        name: 'Special',
        tags: ['Drop Rate', 'Time Limit', 'EXP Boost', 'Soulstone Boost', 'Level Boost'].filter(t => available.has(t)),
        colorClass: 'text-cyan-400'
      },
    ];
  }, [filterOptions.abilityTags]);

  return {
    filterOptions,
    skillTagCategories,
    abilityTagCategories,
  };
}
