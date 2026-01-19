/**
 * World Boss data parsing utilities
 * Parses raw game data into human-readable format
 */

import type {
  WbSkillEntry,
  WbLevelEntry,
  WbSettingsEntry,
  ParsedBossSkill,
  ParsedBossLevel,
  ParsedEffect,
  ParsedTarget,
  SkillRotationEntry,
  WorldBoss,
  ActiveBossInfo,
} from '../types/worldBoss';

// Boss names (from game event data)
// NPC IDs: Kinoe=40228, Hinoto=40249, Mizunoe=40309, Kanoto=40322
const BOSS_NAMES: Record<string, string> = {
  '1': 'Kinoe',
  '2': 'Hinoto',
  '3': 'Mizunoe',
  '4': 'Kanoto',
};

// Effect type display names
const EFFECT_NAMES: Record<string, string> = {
  STUN: 'Stun',
  POISON: 'Poison',
  BURN: 'Burn',
  FROZEN: 'Freeze',
  STONE: 'Petrify',
  NUMB: 'Paralysis',
  SILENCE: 'Silence',
  SPD: 'Speed',
  DEFENSE: 'Defense',
  ATK: 'Attack',
  SHIELD: 'Shield',
  HIT: 'Accuracy',
  CHIT: 'Crit Rate',
  CHIT_ATK: 'Crit Damage',
  ERASE_DEBUFF: 'Cleanse Debuffs',
};

/**
 * Format large HP numbers for display
 * e.g., 1050000000 -> "1.05B"
 */
export function formatHp(hp: number): string {
  if (hp >= 1_000_000_000) {
    return (hp / 1_000_000_000).toFixed(2) + 'B';
  }
  if (hp >= 1_000_000) {
    return (hp / 1_000_000).toFixed(1) + 'M';
  }
  if (hp >= 1_000) {
    return (hp / 1_000).toFixed(0) + 'K';
  }
  return hp.toString();
}

/**
 * Parse target selector string
 * e.g., "enemy;range_front<2.1>" -> { type: "enemies", selector: "front", count: 2, description: "Front 2 enemies" }
 */
export function parseTarget(ts: string): ParsedTarget {
  if (ts === 'self_ime' || ts === 'self') {
    return { type: 'self', description: 'Self' };
  }

  const parts = ts.split(';');
  const targetType = parts[0]; // "enemy" or "ally"

  let count: number | undefined;
  let selector: string | undefined;

  for (const part of parts.slice(1)) {
    // Parse count<N>
    const countMatch = part.match(/count<(\d+)>/);
    if (countMatch) {
      count = parseInt(countMatch[1]);
    }

    // Parse range_front<N.N>
    const frontMatch = part.match(/range_front<([\d.]+)>/);
    if (frontMatch) {
      count = Math.floor(parseFloat(frontMatch[1]));
      selector = 'front';
    }

    // Parse specific selectors
    if (part === 'max_atk') selector = 'highest ATK';
    if (part === 'min_hp') selector = 'lowest HP';
    if (part.startsWith('prof<')) selector = 'by type priority';
  }

  // Build description
  let desc = targetType === 'enemy' ? 'Enemies' : 'Allies';
  if (count) {
    desc = count === 1 ? '1 enemy' : `${count} enemies`;
  }
  if (selector && selector !== 'by type priority') {
    desc += ` (${selector})`;
  }

  return {
    type: targetType === 'enemy' ? 'enemies' : 'allies',
    count,
    selector,
    description: desc,
  };
}

/**
 * Parse a single effect from the de (delayed effect) field
 * e.g., "STUN<5>" -> { type: "stun", value: "5s", description: "Stun (5s)" }
 * e.g., "POISON<5.0%,0.50%,5>" -> { type: "poison", value: "5%", duration: "5s", description: "Poison 5% (5s)" }
 */
export function parseEffect(effectStr: string): ParsedEffect | null {
  if (effectStr === 'none') return null;

  const match = effectStr.match(/^(\w+)<(.*)>$/);
  if (!match) return null;

  const [, type, params] = match;
  const paramList = params.split(',');
  const effectName = EFFECT_NAMES[type] || type;

  // Handle different effect formats
  switch (type) {
    case 'STUN':
    case 'FROZEN':
    case 'STONE':
    case 'NUMB':
    case 'SILENCE':
      // Simple duration: STUN<5>
      return {
        type: type.toLowerCase(),
        value: `${paramList[0]}s`,
        description: `${effectName} (${paramList[0]}s)`,
      };

    case 'POISON':
    case 'BURN':
      // DoT: POISON<initial%,tick%,duration>
      return {
        type: type.toLowerCase(),
        value: paramList[0],
        duration: `${paramList[2]}s`,
        description: `${effectName} ${paramList[0]} (${paramList[2]}s)`,
      };

    case 'SPD':
    case 'DEFENSE':
    case 'ATK':
    case 'SHIELD':
    case 'CHIT':
    case 'CHIT_ATK':
      // Stat modifier: SPD<-50.00%,-2.63%,8>
      const value = paramList[0];
      const duration = paramList[2] || paramList[1];
      const sign = value.startsWith('-') ? '' : '+';
      return {
        type: type.toLowerCase(),
        value: `${sign}${value}`,
        duration: duration ? `${duration}s` : undefined,
        description: `${effectName} ${sign}${value}${duration ? ` (${duration}s)` : ''}`,
      };

    case 'HIT':
      // Accuracy modifier: HIT<10.00%,0.55%>
      return {
        type: 'hit',
        value: `+${paramList[0]}`,
        description: `${effectName} +${paramList[0]}`,
      };

    case 'ERASE_DEBUFF':
      return {
        type: 'cleanse',
        value: '',
        description: 'Cleanse all debuffs',
      };

    default:
      return {
        type: type.toLowerCase(),
        value: params,
        description: `${effectName}: ${params}`,
      };
  }
}

/**
 * Parse immediate effect (ie) field to extract damage
 * e.g., "ATK<900,0>" -> 900
 */
export function parseDamage(ie: string): number | null {
  if (ie === 'none') return null;

  const atkMatch = ie.match(/ATK<(\d+),/);
  if (atkMatch) {
    return parseInt(atkMatch[1]);
  }

  return null;
}

/**
 * Parse skill rotation string
 * e.g., "5,1;10,2;15,1" -> [{time: 5, skillId: 1}, {time: 10, skillId: 2}, ...]
 */
export function parseRotation(rotationStr: string): SkillRotationEntry[] {
  if (!rotationStr) return [];

  return rotationStr.split(';').map(entry => {
    const [time, skillId] = entry.split(',').map(Number);
    return { time, skillId };
  });
}

/**
 * Parse a boss skill entry
 */
export function parseBossSkill(skill: WbSkillEntry): ParsedBossSkill {
  const effects: ParsedEffect[] = [];

  // Parse delayed effects (de field)
  if (skill.de && skill.de !== 'none') {
    const effectParts = skill.de.split(';');
    for (const part of effectParts) {
      const parsed = parseEffect(part);
      if (parsed) effects.push(parsed);
    }
  }

  // Parse immediate effects that aren't damage
  if (skill.ie && skill.ie !== 'none' && !skill.ie.startsWith('ATK<')) {
    const parsed = parseEffect(skill.ie);
    if (parsed) effects.push(parsed);
  }

  return {
    id: skill.skillId,
    damage: parseDamage(skill.ie),
    target: parseTarget(skill.ts),
    effects,
    rawIe: skill.ie,
    rawTs: skill.ts,
    rawDe: skill.de,
  };
}

/**
 * Parse a boss level entry
 */
export function parseBossLevel(level: WbLevelEntry): ParsedBossLevel {
  return {
    level: level.bossLv,
    hp: level.hp,
    hpFormatted: formatHp(level.hp),
    defense: level.defense,
    normalRotation: parseRotation(level.s),
    killRotation: parseRotation(level.ks),
  };
}

/**
 * Get the currently active boss based on date
 */
export function getActiveBoss(settings: WbSettingsEntry[], date: Date = new Date()): ActiveBossInfo | null {
  for (const entry of settings) {
    const start = new Date(entry.start.replace(' ', 'T') + 'Z');
    const end = new Date(entry.end.replace(' ', 'T') + 'Z');

    if (date >= start && date <= end) {
      return {
        bossId: entry.bid,
        startDate: start,
        endDate: end,
        isActive: true,
      };
    }
  }

  // Find the next upcoming boss
  const upcoming = settings
    .map(entry => ({
      bossId: entry.bid,
      startDate: new Date(entry.start.replace(' ', 'T') + 'Z'),
      endDate: new Date(entry.end.replace(' ', 'T') + 'Z'),
      isActive: false,
    }))
    .filter(e => e.startDate > date)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  return upcoming[0] || null;
}

/**
 * Parse all world boss data into a complete WorldBoss object
 */
export function parseWorldBoss(
  bossId: string,
  skills: WbSkillEntry[],
  levels: WbLevelEntry[]
): WorldBoss {
  const bossSkills = skills
    .filter(s => s.bid === bossId)
    .map(parseBossSkill)
    .sort((a, b) => a.id - b.id);

  const bossLevels = levels
    .filter(l => l.bossId === bossId)
    .map(parseBossLevel)
    .sort((a, b) => a.level - b.level);

  // Get bgImage from the first level entry (they all have the same)
  const bgIme = (200 + parseInt(bossId)).toString();

  return {
    id: bossId,
    name: BOSS_NAMES[bossId] || `Boss ${bossId}`,
    bgImage: bgIme,
    skills: bossSkills,
    levels: bossLevels,
  };
}

/**
 * Parse all bosses from raw data
 */
export function parseAllBosses(
  skills: WbSkillEntry[],
  levels: WbLevelEntry[]
): WorldBoss[] {
  const bossIds = ['1', '2', '3', '4'];
  return bossIds.map(id => parseWorldBoss(id, skills, levels));
}
