/**
 * Limit Break (LB) utilities for stat and skill value computation.
 *
 * The game uses a two-level system:
 * - LB0: card at max level with no limit breaks applied (base state)
 * - MLB (LB4): card at max level with all 4 limit breaks applied
 *
 * Stat formula (MLB):
 *   mlb_stat = round(base + (lb0_max_stat - base) × (mlb_level - 1) / (lb0_level - 1))
 *
 * Note: The game applies an additional LB bonus (×1.05 per LB) during battle only.
 * The displayed MLB stat in the profile screen is the level-extrapolated value only.
 */

/** MLB max card level by rarity (mirrors Python's MLB_MAX_LEVELS in constants.py). */
export const MLB_MAX_LEVELS: Record<number, number> = {
  5: 90,
  4: 80,
  3: 70,
  2: 60,
  1: 50,
};

/**
 * Minimal shape accepted by computeMlbStats — covers both the full CardStats
 * (where base_atk/base_hp/max_level are required) and the lighter index/skeleton
 * stats shape (where those three fields are optional).
 */
interface MlbComputeInput {
  base_atk?: number | null;
  base_hp?: number | null;
  max_level?: number | null;
  max_atk: number;
  max_hp: number;
  rarity: number;
}

/** Narrows MlbComputeInput to the shape where all three base fields are present. */
function isExtendedCardStats(
  stats: MlbComputeInput
): stats is MlbComputeInput & { base_atk: number; base_hp: number; max_level: number } {
  return (
    typeof stats.base_atk === 'number' &&
    typeof stats.base_hp === 'number' &&
    typeof stats.max_level === 'number'
  );
}

/**
 * Compute MLB ATK and HP for a card's stats.
 *
 * Returns null if any required field is missing (e.g., skeleton entries for
 * non-first-page cards that don't have base_atk/base_hp/max_level).
 */
export function computeMlbStats(stats: MlbComputeInput): { mlb_atk: number; mlb_hp: number } | null {
  if (!isExtendedCardStats(stats) || !stats.rarity) return null;

  const lb0Max = stats.max_level;
  const mlbMax = MLB_MAX_LEVELS[stats.rarity] ?? lb0Max;

  if (lb0Max <= 1) return null;

  const scale = (mlbMax - 1) / (lb0Max - 1);
  return {
    mlb_atk: Math.round(stats.base_atk + (stats.max_atk - stats.base_atk) * scale),
    mlb_hp: Math.round(stats.base_hp + (stats.max_hp - stats.base_hp) * scale),
  };
}

/**
 * Substitute {value}, {probability}, {delay1} placeholders in a skill description template.
 *
 * Only substitutes placeholders where the value is non-null. Returns the
 * template with any unresolved placeholders left in place.
 */
export function substituteSkillTemplate(
  template: string,
  values: { value?: string | null; probability?: string | null; delay1?: string | null }
): string {
  let desc = template;
  if (values.value) desc = desc.replace(/\{value\}/g, values.value);
  if (values.probability) desc = desc.replace(/\{probability\}/g, values.probability);
  if (values.delay1) desc = desc.replace(/\{delay1\}/g, values.delay1);
  return desc;
}
