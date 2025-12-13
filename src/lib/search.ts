import Fuse from 'fuse.js';
import type { Card } from '../types/card';

// Fuse.js search index
let searchIndex: Fuse<Card> | null = null;

/**
 * Create search index for cards
 * Searches across: name, description, skill, abilities, attribute, type
 */
export function createSearchIndex(cards: Card[]): Fuse<Card> {
  searchIndex = new Fuse(cards, {
    keys: [
      { name: 'id', weight: 2 },
      { name: 'name', weight: 3 },
      { name: 'description', weight: 0.5 },
      { name: 'skill.name', weight: 2 },
      { name: 'skill.description', weight: 1 },
      { name: 'abilities.name', weight: 2 },
      { name: 'abilities.description', weight: 1 },
      { name: 'stats.attribute_name', weight: 1.5 },
      { name: 'stats.type_name', weight: 1.5 }
    ],
    threshold: 0.3,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2
  });

  return searchIndex;
}

/**
 * Search cards using the index
 */
export function searchCards(query: string, cards?: Card[]): Card[] {
  if (!query.trim()) return cards || [];

  // Create index if not exists
  if (!searchIndex && cards) {
    createSearchIndex(cards);
  }

  if (!searchIndex) return [];

  const results = searchIndex.search(query);
  return results.map(result => result.item);
}

/**
 * Filter cards by multiple criteria
 */
export interface FilterOptions {
  attributes?: string[];
  types?: string[];
  rarities?: number[];
  minAtk?: number;
  maxAtk?: number;
  minHp?: number;
  maxHp?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

export function filterCards(cards: Card[], filters: FilterOptions): Card[] {
  return cards.filter(card => {
    // Filter by attributes
    if (filters.attributes && filters.attributes.length > 0) {
      if (!filters.attributes.includes(card.stats.attribute_name)) {
        return false;
      }
    }

    // Filter by types
    if (filters.types && filters.types.length > 0) {
      if (!filters.types.includes(card.stats.type_name)) {
        return false;
      }
    }

    // Filter by rarities
    if (filters.rarities && filters.rarities.length > 0) {
      if (!filters.rarities.includes(card.stats.rarity)) {
        return false;
      }
    }

    // Filter by ATK range
    if (filters.minAtk !== undefined && card.stats.max_atk < filters.minAtk) {
      return false;
    }
    if (filters.maxAtk !== undefined && card.stats.max_atk > filters.maxAtk) {
      return false;
    }

    // Filter by HP range
    if (filters.minHp !== undefined && card.stats.max_hp < filters.minHp) {
      return false;
    }
    if (filters.maxHp !== undefined && card.stats.max_hp > filters.maxHp) {
      return false;
    }

    // Filter by Speed range
    if (filters.minSpeed !== undefined && card.stats.speed < filters.minSpeed) {
      return false;
    }
    if (filters.maxSpeed !== undefined && card.stats.speed > filters.maxSpeed) {
      return false;
    }

    return true;
  });
}

/**
 * Sort cards by a field
 */
export type SortField = 'id' | 'name' | 'rarity' | 'max_atk' | 'max_hp' | 'speed' | 'crit' | 'cost';
export type SortDirection = 'asc' | 'desc';

export function sortCards(cards: Card[], field: SortField, direction: SortDirection = 'desc'): Card[] {
  const sorted = [...cards].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (field) {
      case 'id':
        aVal = parseInt(a.id);
        bVal = parseInt(b.id);
        break;
      case 'name':
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
        break;
      case 'rarity':
        aVal = a.stats.rarity;
        bVal = b.stats.rarity;
        break;
      case 'max_atk':
        aVal = a.stats.max_atk;
        bVal = b.stats.max_atk;
        break;
      case 'max_hp':
        aVal = a.stats.max_hp;
        bVal = b.stats.max_hp;
        break;
      case 'speed':
        aVal = a.stats.speed;
        bVal = b.stats.speed;
        break;
      case 'crit':
        aVal = a.stats.crit;
        bVal = b.stats.crit;
        break;
      case 'cost':
        aVal = a.stats.cost;
        bVal = b.stats.cost;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Get unique values for filter options
 */
export function getFilterOptions(cards: Card[]) {
  const attributes = new Set<string>();
  const types = new Set<string>();
  const rarities = new Set<number>();

  cards.forEach(card => {
    attributes.add(card.stats.attribute_name);
    types.add(card.stats.type_name);
    rarities.add(card.stats.rarity);
  });

  return {
    attributes: Array.from(attributes).sort(),
    types: Array.from(types).sort(),
    rarities: Array.from(rarities).sort((a, b) => b - a) // Descending
  };
}
