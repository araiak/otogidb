import type { Card } from '../types/card';

/**
 * Weights for different similarity factors
 * Higher weight = more important for matching
 */
const WEIGHTS = {
  attribute: 30,      // Same element is crucial for team synergy
  type: 25,           // Same role (Melee/Ranged/Healer) for replacements
  skillTag: 8,        // Each matching skill tag
  abilityTag: 6,      // Each matching ability tag
  rarity: 10,         // Same rarity (similar power level)
  rarityClose: 5,     // Within 1 star difference
};

/**
 * Calculate similarity score between two cards
 * Higher score = more similar (better replacement candidate)
 */
export function calculateSimilarity(card1: Card, card2: Card): number {
  let score = 0;

  // Attribute match (same element)
  if (card1.stats.attribute === card2.stats.attribute) {
    score += WEIGHTS.attribute;
  }

  // Type match (same role)
  if (card1.stats.type === card2.stats.type) {
    score += WEIGHTS.type;
  }

  // Rarity match
  const rarityDiff = Math.abs(card1.stats.rarity - card2.stats.rarity);
  if (rarityDiff === 0) {
    score += WEIGHTS.rarity;
  } else if (rarityDiff === 1) {
    score += WEIGHTS.rarityClose;
  }

  // Skill tag matching
  const skillTags1 = card1.skill?.tags || [];
  const skillTags2 = card2.skill?.tags || [];
  const matchingSkillTags = skillTags1.filter(tag => skillTags2.includes(tag));
  score += matchingSkillTags.length * WEIGHTS.skillTag;

  // Ability tag matching (collect all tags from all abilities)
  const abilityTags1 = collectAbilityTags(card1);
  const abilityTags2 = collectAbilityTags(card2);
  const matchingAbilityTags = abilityTags1.filter(tag => abilityTags2.includes(tag));
  score += matchingAbilityTags.length * WEIGHTS.abilityTag;

  return score;
}

/**
 * Collect all unique ability tags from a card
 */
function collectAbilityTags(card: Card): string[] {
  const tags: string[] = [];
  for (const ability of card.abilities || []) {
    if (ability.tags) {
      tags.push(...ability.tags);
    }
  }
  // Return unique tags
  return [...new Set(tags)];
}

/**
 * Get detailed similarity breakdown for display
 */
export function getSimilarityDetails(card1: Card, card2: Card): SimilarityDetails {
  const skillTags1 = card1.skill?.tags || [];
  const skillTags2 = card2.skill?.tags || [];
  const matchingSkillTags = skillTags1.filter(tag => skillTags2.includes(tag));

  const abilityTags1 = collectAbilityTags(card1);
  const abilityTags2 = collectAbilityTags(card2);
  const matchingAbilityTags = abilityTags1.filter(tag => abilityTags2.includes(tag));

  return {
    sameAttribute: card1.stats.attribute === card2.stats.attribute,
    sameType: card1.stats.type === card2.stats.type,
    sameRarity: card1.stats.rarity === card2.stats.rarity,
    matchingSkillTags,
    matchingAbilityTags,
    score: calculateSimilarity(card1, card2),
  };
}

export interface SimilarityDetails {
  sameAttribute: boolean;
  sameType: boolean;
  sameRarity: boolean;
  matchingSkillTags: string[];
  matchingAbilityTags: string[];
  score: number;
}

export interface SimilarCard {
  card: Card;
  score: number;
  details: SimilarityDetails;
}

/**
 * Find cards most similar to the given card
 * Returns cards sorted by similarity score (highest first)
 */
export function findSimilarCards(
  targetCard: Card,
  allCards: Card[],
  options: {
    limit?: number;
    minScore?: number;
    excludeIds?: string[];
  } = {}
): SimilarCard[] {
  const { limit = 6, minScore = 10, excludeIds = [] } = options;

  // Always exclude the target card itself
  const excludeSet = new Set([targetCard.id, ...excludeIds]);

  const similarCards: SimilarCard[] = [];

  for (const card of allCards) {
    // Skip excluded cards
    if (excludeSet.has(card.id)) continue;

    const score = calculateSimilarity(targetCard, card);

    // Only include cards with minimum similarity
    if (score >= minScore) {
      similarCards.push({
        card,
        score,
        details: getSimilarityDetails(targetCard, card),
      });
    }
  }

  // Sort by score (highest first), then by rarity (highest first), then by ID
  similarCards.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.card.stats.rarity !== a.card.stats.rarity) {
      return b.card.stats.rarity - a.card.stats.rarity;
    }
    return parseInt(a.card.id) - parseInt(b.card.id);
  });

  return similarCards.slice(0, limit);
}

/**
 * Get a human-readable description of why cards are similar
 */
export function getSimilarityReason(details: SimilarityDetails): string {
  const reasons: string[] = [];

  if (details.sameAttribute && details.sameType) {
    reasons.push('Same attribute & type');
  } else if (details.sameAttribute) {
    reasons.push('Same attribute');
  } else if (details.sameType) {
    reasons.push('Same type');
  }

  if (details.matchingSkillTags.length > 0) {
    reasons.push(`${details.matchingSkillTags.length} skill tag${details.matchingSkillTags.length > 1 ? 's' : ''}`);
  }

  if (details.matchingAbilityTags.length > 0) {
    reasons.push(`${details.matchingAbilityTags.length} ability tag${details.matchingAbilityTags.length > 1 ? 's' : ''}`);
  }

  return reasons.join(' · ') || 'Similar card';
}
