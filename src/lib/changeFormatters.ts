/**
 * Format card change entries for human-readable display on the updates page.
 * Transforms raw object data from patch notes into readable strings.
 */

import type { Skill, Ability, Bond, TowerDrop } from '../types/card';

interface CardChange {
  category: string;
  field: string;
  field_label?: string;
  old: unknown;
  new: unknown;
  display: string;
}

// Enum mappings for stat values
const ATTRIBUTES: Record<number, string> = {
  1: 'Divina',
  2: 'Phantasma',
  3: 'Anima',
  4: 'Neutral',
};

const TYPES: Record<number, string> = {
  0: 'Utility',
  1: 'Melee',
  2: 'Ranged',
  3: 'Healer',
  4: 'Assist',
};

/**
 * Format a change entry for display.
 * Detects complex object types and formats them nicely.
 * Falls back to original display string for simple/unknown types.
 */
export function formatChangeDisplay(change: CardChange): string {
  // Skill changes (field="skill") - whole skill add/remove/update
  if (change.category === 'skill' && change.field === 'skill') {
    return formatSkillChange(change.old, change.new);
  }

  // Skill subfield changes (field="skill.name", "skill.tags", etc.)
  if (change.category === 'skill' && change.field.startsWith('skill.')) {
    return formatSkillSubfield(change);
  }

  // Ability changes (field="abilities.N") - whole ability add/remove/update
  if (change.category === 'ability' && /^abilities\.\d+$/.test(change.field)) {
    return formatAbilityChange(change.old, change.new);
  }

  // Ability subfield changes (field="abilities.N.unlock_level", etc.)
  if (change.category === 'ability' && /^abilities\.\d+\./.test(change.field)) {
    return formatAbilitySubfield(change);
  }

  // Bond changes (field="bond")
  if (change.category === 'bond' && change.field === 'bond') {
    return formatBondChange(change.old, change.new);
  }

  // Tower drop changes
  if (change.field.includes('tower_drops')) {
    return formatTowerDropChange(change.old, change.new);
  }

  // Acquisition changes
  if (change.category === 'acquisition') {
    return formatAcquisitionChange(change);
  }

  // Stat enum changes (attribute, type)
  if (change.field === 'stats.attribute' || change.field === 'stats.type') {
    return formatStatEnum(change);
  }

  // Boolean changes
  if (typeof change.new === 'boolean' || typeof change.old === 'boolean') {
    return formatBooleanChange(change);
  }

  // Generic array changes (synergies, tags, etc.)
  if (Array.isArray(change.new) || Array.isArray(change.old)) {
    return formatArrayChange(change);
  }

  // Default: use original display (already good for stats, descriptions, etc.)
  return change.display;
}

function formatSkillChange(oldVal: unknown, newVal: unknown): string {
  if (oldVal === null && isSkillObject(newVal)) {
    const tags = newVal.tags?.length ? ` (${newVal.tags.join(', ')})` : '';
    return `Added: ${newVal.name || 'skill'}${tags}`;
  }
  if (isSkillObject(oldVal) && newVal === null) {
    return `Removed: ${oldVal.name || 'skill'}`;
  }
  if (isSkillObject(newVal)) {
    return `Updated: ${newVal.name || 'skill'}`;
  }
  return 'Skill changed';
}

function formatAbilityChange(oldVal: unknown, newVal: unknown): string {
  if (oldVal === null && isAbilityObject(newVal)) {
    const unlock = newVal.unlock_level ? ` (Lv.${newVal.unlock_level} unlock)` : '';
    return `Added: ${newVal.name || 'ability'}${unlock}`;
  }
  if (isAbilityObject(oldVal) && newVal === null) {
    return `Removed: ${oldVal.name || 'ability'}`;
  }
  if (isAbilityObject(newVal)) {
    return `Updated: ${newVal.name || 'ability'}`;
  }
  return 'Ability changed';
}

function formatBondChange(oldVal: unknown, newVal: unknown): string {
  if (oldVal === null && isBondObject(newVal)) {
    const bonus = newVal.bonus_percent ? ` (+${newVal.bonus_percent}% ${newVal.type || 'bonus'})` : '';
    return `Added: ${newVal.name || 'bond'}${bonus}`;
  }
  if (isBondObject(oldVal) && newVal === null) {
    return `Removed: ${oldVal.name || 'bond'}`;
  }
  if (isBondObject(newVal)) {
    return `Updated: ${newVal.name || 'bond'}`;
  }
  return 'Bond changed';
}

function formatTowerDropChange(oldVal: unknown, newVal: unknown): string {
  if (oldVal === null && isTowerDropObject(newVal)) {
    const floors = newVal.floors?.length ? `floors ${newVal.floors.join(', ')}` : 'tower drop';
    return `Added: ${floors}`;
  }
  if (isTowerDropObject(oldVal) && newVal === null) {
    return `Removed: tower drop`;
  }
  return 'Tower drop changed';
}

/**
 * Format skill subfield changes (e.g., skill.name, skill.tags, skill.parsed.slv1)
 */
function formatSkillSubfield(change: CardChange): string {
  const subfield = change.field.replace('skill.', '');

  // Skill tags changed
  if (subfield === 'tags') {
    return formatTagsChange('Skill', change.old, change.new);
  }

  // Parsed skill values (damage, targets, etc.)
  if (subfield.startsWith('parsed.')) {
    const parsedField = subfield.replace('parsed.', '');
    return formatParsedSkillChange(parsedField, change);
  }

  // Name or description changes use default display
  return change.display;
}

/**
 * Format parsed skill changes (slv1, ml, target.count, etc.)
 */
function formatParsedSkillChange(parsedField: string, change: CardChange): string {
  // Base skill damage
  if (parsedField === 'slv1') {
    const diff = typeof change.new === 'number' && typeof change.old === 'number'
      ? ` (${change.new > change.old ? '+' : ''}${change.new - change.old})`
      : '';
    return `Skill Base: ${change.old} → ${change.new}${diff}`;
  }

  // Skill damage per level
  if (parsedField === 'slvup') {
    return `Skill Lvl Scaling: ${change.old} → ${change.new}`;
  }

  // Max skill level
  if (parsedField === 'ml') {
    return `Skill Max Level: ${change.old} → ${change.new}`;
  }

  // Target count
  if (parsedField === 'target.count') {
    return `Skill Targets: ${change.old} → ${change.new}`;
  }

  // Target type
  if (parsedField === 'target.type') {
    return `Skill Target Type: ${change.old} → ${change.new}`;
  }

  // Effect duration
  if (parsedField.includes('duration')) {
    return `Skill Duration: ${change.old}s → ${change.new}s`;
  }

  // Default for other parsed fields
  return change.display;
}

/**
 * Format ability subfield changes (e.g., abilities.0.unlock_level)
 */
function formatAbilitySubfield(change: CardChange): string {
  const match = change.field.match(/^abilities\.(\d+)\.(.+)$/);
  if (!match) return change.display;

  const [, indexStr, subfield] = match;
  const abilityNum = parseInt(indexStr, 10) + 1;

  // Unlock level
  if (subfield === 'unlock_level') {
    return `Ability #${abilityNum} Unlock: Lv.${change.old} → Lv.${change.new}`;
  }

  // Tags
  if (subfield === 'tags') {
    return formatTagsChange(`Ability #${abilityNum}`, change.old, change.new);
  }

  // Synergy partners
  if (subfield === 'synergy_partners') {
    return formatArrayChangeWithPrefix(change, `Ability #${abilityNum} Synergy`);
  }

  // Stackable boolean
  if (subfield === 'stackable') {
    return change.new
      ? `Ability #${abilityNum}: Now stackable`
      : `Ability #${abilityNum}: No longer stackable`;
  }

  // Name or description use default
  return change.display;
}

/**
 * Format acquisition-related changes
 */
function formatAcquisitionChange(change: CardChange): string {
  // Standard gacha pool
  if (change.field === 'acquisition.gacha.in_standard_pool') {
    return change.new ? 'Added to Standard Gacha Pool' : 'Removed from Standard Gacha Pool';
  }

  // Auction availability
  if (change.field === 'acquisition.auction.available') {
    return change.new ? 'Now available in Auction' : 'Removed from Auction';
  }

  // Sources array
  if (change.field === 'acquisition.sources') {
    return formatArrayChangeWithPrefix(change, 'Acquisition Sources');
  }

  // Featured banners (count summary)
  if (change.field === 'acquisition.featured_banners') {
    // Python already provides good display like "0 banners → 1 banners"
    return change.display;
  }

  // Reward tiers (count summary)
  if (change.field === 'acquisition.reward_tiers') {
    // Python already provides good display like "0 tiers → 7 tiers (added: 175)"
    return change.display;
  }

  // Exchange entries
  if (change.field.includes('exchange')) {
    return formatExchangeChange(change);
  }

  // Default for other acquisition fields
  return change.display;
}

/**
 * Format exchange shop changes
 */
function formatExchangeChange(change: CardChange): string {
  if (change.field.includes('.price')) {
    return `Exchange Price: ${change.old} → ${change.new}`;
  }
  if (change.field.includes('.currency')) {
    return `Exchange Currency: ${change.old} → ${change.new}`;
  }
  if (change.field.includes('.limit')) {
    return `Exchange Limit: ${change.old} → ${change.new}`;
  }
  return change.display;
}

/**
 * Format stat enum changes (attribute, type)
 */
function formatStatEnum(change: CardChange): string {
  if (change.field === 'stats.attribute') {
    const oldName = ATTRIBUTES[change.old as number] ?? `Unknown(${change.old})`;
    const newName = ATTRIBUTES[change.new as number] ?? `Unknown(${change.new})`;
    return `Attribute: ${oldName} → ${newName}`;
  }

  if (change.field === 'stats.type') {
    const oldName = TYPES[change.old as number] ?? `Unknown(${change.old})`;
    const newName = TYPES[change.new as number] ?? `Unknown(${change.new})`;
    return `Type: ${oldName} → ${newName}`;
  }

  return change.display;
}

/**
 * Format boolean field changes
 */
function formatBooleanChange(change: CardChange): string {
  const fieldMap: Record<string, [string, string]> = {
    playable: ['Now Playable', 'No longer Playable'],
    'meta.album': ['Added to Album', 'Removed from Album'],
    'acquisition.auction.available': ['Auction Available', 'Auction Unavailable'],
    'acquisition.gacha.in_standard_pool': ['In Standard Pool', 'Not in Standard Pool'],
    'acquisition.daily.available': ['Daily Quest Available', 'Daily Quest Unavailable'],
  };

  const mapping = fieldMap[change.field];
  if (mapping) {
    const [trueText, falseText] = mapping;
    return change.new ? trueText : falseText;
  }

  // Generic boolean formatting
  const label = change.field_label ?? change.field.split('.').pop() ?? change.field;
  return change.new ? `${label}: Yes` : `${label}: No`;
}

/**
 * Format generic array changes (synergies, tags, etc.)
 */
function formatArrayChange(change: CardChange, prefix?: string): string {
  const oldArr = Array.isArray(change.old) ? change.old : [];
  const newArr = Array.isArray(change.new) ? change.new : [];

  // Compare primitive arrays
  const added = newArr.filter((x) => !oldArr.includes(x));
  const removed = oldArr.filter((x) => !newArr.includes(x));

  const label = prefix ?? change.field_label ?? change.field;

  if (added.length > 0 && removed.length === 0) {
    return `${label}: Added ${formatArrayItems(added)}`;
  }
  if (removed.length > 0 && added.length === 0) {
    return `${label}: Removed ${formatArrayItems(removed)}`;
  }
  if (added.length > 0 && removed.length > 0) {
    return `${label}: +${added.length}, -${removed.length}`;
  }

  // Length changed but items are same (reordering or duplicates)
  if (oldArr.length !== newArr.length) {
    return `${label}: ${oldArr.length} → ${newArr.length}`;
  }

  // No change detected
  return change.display;
}

/**
 * Format array change with custom prefix
 */
function formatArrayChangeWithPrefix(change: CardChange, prefix: string): string {
  return formatArrayChange(change, prefix);
}

/**
 * Format tags change (skill tags, ability tags)
 */
function formatTagsChange(prefix: string, oldVal: unknown, newVal: unknown): string {
  const fakeChange: CardChange = {
    category: '',
    field: '',
    field_label: `${prefix} Tags`,
    old: oldVal,
    new: newVal,
    display: '',
  };
  return formatArrayChange(fakeChange);
}

/**
 * Format array items for display (max 3 items shown)
 */
function formatArrayItems(items: unknown[]): string {
  if (items.length === 0) {
    return 'none';
  }
  if (items.length <= 3) {
    return items
      .map((i) => (typeof i === 'object' && i !== null ? '(object)' : String(i)))
      .join(', ');
  }
  return `${items.length} items`;
}

// Type guards
function isSkillObject(val: unknown): val is Partial<Skill> {
  return val !== null && typeof val === 'object' && 'name' in (val as Record<string, unknown>);
}

function isAbilityObject(val: unknown): val is Partial<Ability> {
  return val !== null && typeof val === 'object' && 'name' in (val as Record<string, unknown>);
}

function isBondObject(val: unknown): val is Partial<Bond> {
  return val !== null && typeof val === 'object' && 'type' in (val as Record<string, unknown>);
}

function isTowerDropObject(val: unknown): val is Partial<TowerDrop> {
  return val !== null && typeof val === 'object' && 'floors' in (val as Record<string, unknown>);
}
