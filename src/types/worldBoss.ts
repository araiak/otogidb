/**
 * World Boss data types
 * Used for displaying boss skills, levels, and event timeline
 */

// Raw JSON types (as stored in data files)

/** Entry from wbSettings.json - event timeline */
export interface WbSettingsEntry {
  descId: string;
  bgIme: string; // Background image ID (201-204)
  start: string; // "2017-08-01 15:00:00"
  end: string;   // "2017-09-01 14:30:00"
  dramaId: string;
  bid: string;   // Boss ID ("1"-"4")
}

/** Entry from wbSkill.json - boss skills */
export interface WbSkillEntry {
  descId: string;
  skillId: number; // 1-5 within each boss
  bid: string;     // Boss ID
  ie: string;      // Immediate effect: "ATK<900,0>" or "none" or "ERASE_DEBUFF<0>"
  ts: string;      // Target selector: "enemy;range_front<2.1>" etc
  de: string;      // Delayed effect: "STUN<5>;HIT<10.00%,0.55%>" etc
  ul: number;      // Unknown
  sts: number;     // Unknown
  stc: number;     // Unknown
}

/** Entry from wbLv.json - boss level stats */
export interface WbLevelEntry {
  descId: string;
  bossLv: number;
  bossId: string;
  hp: number;      // e.g., 1050000000
  defense: number;
  s: string;       // Normal skill rotation: "5,1;10,2;15,1;..."
  ks: string;      // Kill skill rotation: "5,3;10,3;15,1;..."
  rl: string;      // Reward list
}

// Parsed/processed types (for display)

/** Parsed skill effect for display */
export interface ParsedEffect {
  type: string;     // "stun", "poison", "damage", etc.
  value: string;    // Primary value (e.g., "5s", "5%", "900")
  duration?: string; // Duration if applicable
  description: string; // Human-readable description
}

/** Parsed target selector for display */
export interface ParsedTarget {
  type: string;     // "enemies", "self", etc.
  count?: number;
  selector?: string; // "front", "random", "max_atk", etc.
  description: string;
}

/** Skill rotation entry */
export interface SkillRotationEntry {
  time: number;   // Seconds into battle
  skillId: number;
}

/** Processed boss skill for display */
export interface ParsedBossSkill {
  id: number;
  damage: number | null;     // Base damage from ie field
  target: ParsedTarget;
  effects: ParsedEffect[];
  rawIe: string;
  rawTs: string;
  rawDe: string;
}

/** Processed boss level data */
export interface ParsedBossLevel {
  level: number;
  hp: number;
  hpFormatted: string; // "1.05B"
  defense: number;
  normalRotation: SkillRotationEntry[];
  killRotation: SkillRotationEntry[];
}

/** Complete processed world boss data */
export interface WorldBoss {
  id: string;
  name: string;
  bgImage: string;
  skills: ParsedBossSkill[];
  levels: ParsedBossLevel[];
}

/** Active boss info based on current date */
export interface ActiveBossInfo {
  bossId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}
