import type { Card, CardsData, ChangeNotes } from '../types/card';
import { fetchWithCache } from './cache';
import type { SkillData } from './formatters';

// In-memory cache for card data (faster than IndexedDB for repeat access)
let cardsCache: CardsData | null = null;
let skillsCache: Record<string, SkillData> | null = null;

// Max age for cached data (24 hours - data updates infrequently)
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Load minimal cards index (for table display - faster loading)
 * Uses IndexedDB caching with hash validation to avoid re-downloading
 */
export async function getCardsData(options: { forceRefresh?: boolean } = {}): Promise<CardsData> {
  // Check in-memory cache first (fastest)
  if (cardsCache && !options.forceRefresh) {
    return cardsCache;
  }

  // Load minimal index for table (787KB vs 2.5MB full)
  cardsCache = await fetchWithCache<CardsData>('/data/cards_index.json', {
    forceRefresh: options.forceRefresh,
    maxAge: CACHE_MAX_AGE
  });

  return cardsCache;
}

// Cache for full card data (loaded on demand)
let fullCardsCache: CardsData | null = null;

/**
 * Load full cards data (includes descriptions, history, abilities, meta)
 * Use this for card detail pages
 */
export async function getFullCardsData(options: { forceRefresh?: boolean } = {}): Promise<CardsData> {
  if (fullCardsCache && !options.forceRefresh) {
    return fullCardsCache;
  }

  fullCardsCache = await fetchWithCache<CardsData>('/data/cards.json', {
    forceRefresh: options.forceRefresh,
    maxAge: CACHE_MAX_AGE
  });

  return fullCardsCache;
}

/**
 * Load skills data from skills.json
 */
export async function getSkillsData(options: { forceRefresh?: boolean } = {}): Promise<Record<string, SkillData>> {
  if (skillsCache && !options.forceRefresh) {
    return skillsCache;
  }

  try {
    const data = await fetchWithCache<{ skills: Record<string, SkillData> }>('/data/skills.json', {
      forceRefresh: options.forceRefresh,
      maxAge: CACHE_MAX_AGE
    });
    skillsCache = data.skills || {};
  } catch {
    skillsCache = {};
  }

  return skillsCache;
}

/**
 * Get skill data by ID
 */
export async function getSkillById(id: string): Promise<SkillData | null> {
  const skills = await getSkillsData();
  return skills[id] || null;
}

/**
 * Get all cards as array
 */
export async function getAllCards(): Promise<Card[]> {
  const data = await getCardsData();
  return Object.values(data.cards);
}

/**
 * Get a single card by ID (loads full card data for detail pages)
 */
export async function getCardById(id: string): Promise<Card | null> {
  const data = await getFullCardsData();
  return data.cards[id] || null;
}

/**
 * Get cards by attribute
 */
export async function getCardsByAttribute(attribute: string): Promise<Card[]> {
  const cards = await getAllCards();
  return cards.filter(card => card.stats.attribute_name === attribute);
}

/**
 * Get cards by type
 */
export async function getCardsByType(type: string): Promise<Card[]> {
  const cards = await getAllCards();
  return cards.filter(card => card.stats.type_name === type);
}

/**
 * Get cards by rarity
 */
export async function getCardsByRarity(rarity: number): Promise<Card[]> {
  const cards = await getAllCards();
  return cards.filter(card => card.stats.rarity === rarity);
}

/**
 * Get related cards (same attribute or type) - uses full data for detail pages
 */
export async function getRelatedCards(card: Card, limit = 6): Promise<Card[]> {
  const data = await getFullCardsData();
  const cards = Object.values(data.cards);

  return cards
    .filter(c => c.id !== card.id)
    .filter(c =>
      c.stats.attribute === card.stats.attribute ||
      c.stats.type === card.stats.type
    )
    .slice(0, limit);
}

/**
 * Get card version/data info
 */
export async function getDataVersion(): Promise<{ version: string; generatedAt: string; totalCards: number }> {
  const data = await getCardsData();
  return {
    version: data.version,
    generatedAt: data.generated_at,
    totalCards: data.total_cards
  };
}

/**
 * Load change notes for a specific version
 */
export async function getChangeNotes(version: string): Promise<ChangeNotes | null> {
  try {
    return await fetchWithCache<ChangeNotes>(`/data/changes/change_notes_${version}.json`, {
      maxAge: CACHE_MAX_AGE
    });
  } catch {
    return null;
  }
}

/**
 * Get list of available change note versions
 * Note: This requires a manifest file or listing endpoint
 */
export async function getAvailableVersions(): Promise<string[]> {
  try {
    const response = await fetch('/data/changes/manifest.json');
    if (!response.ok) return [];
    const manifest = await response.json();
    return manifest.versions || [];
  } catch {
    return [];
  }
}

/**
 * Force refresh all card data from server
 * Clears in-memory and IndexedDB cache
 */
export async function refreshCardData(): Promise<CardsData> {
  cardsCache = null;
  return getCardsData({ forceRefresh: true });
}

// Re-export cache utilities for debugging
export { clearCache, getCacheInfo } from './cache';

// For SSG: sync version that can be used at build time
// Import JSON directly in Astro components:
// import cardsData from '../../public/data/cards.json';
