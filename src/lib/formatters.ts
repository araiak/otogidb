/**
 * Convert game's custom markup to safe HTML
 *
 * Game format: <color=#hex>text</color>
 * HTML format: <span class="game-color" style="color:#hex">text</span>
 *
 * Security: This function sanitizes the output to prevent XSS attacks.
 * Only allows <span style="color:#hex"> and <br> tags.
 *
 * Note: The "game-color" class allows CSS to adjust colors for light mode
 * (game colors are designed for dark backgrounds).
 */
export function formatDescription(text: string | null | undefined): string {
  if (!text) return '';

  let formatted = text;

  // Step 1: Escape any existing HTML entities to prevent double-encoding issues
  // But preserve our game markup tags for processing
  const colorTags: Array<{placeholder: string, original: string, hex: string, content: string}> = [];
  let placeholderIndex = 0;

  // Extract and preserve color tags
  formatted = formatted.replace(
    /<color=(#[0-9a-fA-F]{6})>([\s\S]*?)<\/color>/gi,
    (_match, hex, content) => {
      const placeholder = `__COLOR_${placeholderIndex++}__`;
      // Recursively sanitize the content inside color tags
      const sanitizedContent = escapeHtmlExceptBr(content);
      colorTags.push({ placeholder, original: _match, hex, content: sanitizedContent });
      return placeholder;
    }
  );

  // Extract and preserve br tags
  const brPlaceholder = '__BR_TAG__';
  formatted = formatted.replace(/<br\s*\/?>/gi, brPlaceholder);

  // Step 2: Escape ALL remaining HTML (anything not in our placeholders is untrusted)
  formatted = escapeHtmlChars(formatted);

  // Step 3: Restore our safe tags
  formatted = formatted.replace(new RegExp(brPlaceholder, 'g'), '<br />');

  for (const tag of colorTags) {
    // Only allow valid hex colors
    if (/^#[0-9a-fA-F]{6}$/.test(tag.hex)) {
      // Add game-color class for CSS-based light mode adjustment
      formatted = formatted.replace(
        tag.placeholder,
        `<span class="game-color" style="color:${tag.hex}">${tag.content}</span>`
      );
    } else {
      // Invalid hex, just use the escaped content
      formatted = formatted.replace(tag.placeholder, tag.content);
    }
  }

  return formatted;
}

/**
 * Escape HTML special characters
 */
function escapeHtmlChars(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Escape HTML except for br tags (used for content inside color tags)
 */
function escapeHtmlExceptBr(text: string): string {
  const brPlaceholder = '__INNER_BR__';
  let result = text.replace(/<br\s*\/?>/gi, brPlaceholder);
  result = escapeHtmlChars(result);
  result = result.replace(new RegExp(brPlaceholder, 'g'), '<br />');
  return result;
}

/**
 * Strip all HTML/markup tags from text
 */
export function stripTags(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Format rarity as star string
 */
export function formatRarity(rarity: number): string {
  return '★'.repeat(rarity);
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get attribute display color
 */
export function getAttributeColor(attribute: string): string {
  const colors: Record<string, string> = {
    'Divina': '#FFD700',
    'Anima': '#FF6B6B',
    'Phantasma': '#9B59B6'
  };
  return colors[attribute] || '#888888';
}

/**
 * Get type display color
 */
export function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'Melee': '#E74C3C',
    'Ranged': '#3498DB',
    'Healer': '#2ECC71',
    'Assist': '#F39C12'
  };
  return colors[type] || '#888888';
}

/**
 * Get rarity display color
 */
export function getRarityColor(rarity: number): string {
  const colors: Record<number, string> = {
    1: '#9E9E9E',
    2: '#8BC34A',
    3: '#2196F3',
    4: '#9C27B0',
    5: '#FF9800'
  };
  return colors[rarity] || '#888888';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Skill data from skills.json
 */
export interface SkillData {
  descId: string;
  ie: string; // immediate effect: "ATK<1300,38>" or "HEAL<290,10>"
  de: string; // debuff/effect: "STUN<5>;HIT<15.00%,0.43%>"
  ml: number; // max level
  slv1: number; // skill level 1 value
  slvup: number; // skill level up value
  [key: string]: unknown;
}

/**
 * Get max skill level based on card rarity
 * 5★=90, 4★=80, 3★=70, 2★=60, 1★=50
 */
function getMaxLevelForRarity(rarity: number): number {
  switch (rarity) {
    case 5: return 90;
    case 4: return 80;
    case 3: return 70;
    case 2: return 60;
    case 1: return 50;
    default: return 70; // Default fallback
  }
}

/**
 * Parse skill effect string to extract values at a given level
 * Format: "ATK<base,perLevel>" or "HEAL<base,perLevel>"
 */
function parseValue(ie: string, level: number = 1): string | null {
  if (!ie || ie === 'none') return null;

  // Match patterns like ATK<1300,38> or HEAL<290,10>
  const match = ie.match(/(?:ATK|HEAL)<(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)>/);
  if (match) {
    const baseValue = parseFloat(match[1]);
    const perLevel = parseFloat(match[2]);
    const value = Math.round(baseValue + perLevel * (level - 1));
    return value.toLocaleString();
  }
  return null;
}

/**
 * Parse skill effect string to extract probability at a given level
 * Format: "STUN<5>;HIT<15.00%,0.43%>"
 */
function parseProbability(de: string, level: number = 1): string | null {
  if (!de || de === 'none') return null;

  // Match patterns like HIT<15.00%,0.43%>
  const match = de.match(/HIT<([\d.]+)%,([\d.]+)%>/);
  if (match) {
    const baseProb = parseFloat(match[1]);
    const perLevel = parseFloat(match[2]);
    const prob = baseProb + perLevel * (level - 1);
    // Round to 2 decimal places if needed, otherwise show whole number
    const formattedProb = prob % 1 === 0 ? prob.toString() : prob.toFixed(2);
    return `${formattedProb}%`;
  }
  return null;
}

/**
 * Parse skill effect string to extract delay/debuff value at a given level
 * Format: "DEFENSE<-350,-12,8>" or "ATK<-23.00%,-0.94%,8>"
 */
function parseDelay(de: string, level: number = 1): string | null {
  if (!de || de === 'none') return null;

  // Match patterns like DEFENSE<-350,-12,8> or ATK<-23.00%,-0.94%,8> or POISON<5.0%,0.14%,5>
  // The pattern is: EFFECT<base,perLevel,duration>
  const match = de.match(/(?:DEFENSE|ATK|SPD|SHIELD|POISON|CHIT)<(-?[\d.]+)(%?),(-?[\d.]+)(%?),(\d+)>/);
  if (match) {
    const baseValue = Math.abs(parseFloat(match[1]));
    const perLevel = Math.abs(parseFloat(match[3]));
    const isPercent = match[2] === '%';
    const value = baseValue + perLevel * (level - 1);
    // Round appropriately based on type
    if (isPercent) {
      const formattedVal = value % 1 === 0 ? value.toString() : value.toFixed(2);
      return `${formattedVal}%`;
    }
    return Math.round(value).toLocaleString();
  }
  return null;
}

/**
 * Format skill description by substituting {value}, {probability}, and {delay1} placeholders
 * Uses max level values based on card rarity
 */
export function formatSkillDescription(
  description: string,
  skillData?: SkillData | null,
  rarity: number = 5 // Default to 5★ for max values
): string {
  if (!description) return '';

  let formatted = description;

  if (skillData) {
    const maxLevel = getMaxLevelForRarity(rarity);

    // Replace {value} with actual damage/heal value at max level
    const value = parseValue(skillData.ie, maxLevel);
    if (value) {
      formatted = formatted.replace(/\{value\}/g, value);
    }

    // Replace {probability} with actual probability at max level
    const probability = parseProbability(skillData.de, maxLevel);
    if (probability) {
      formatted = formatted.replace(/\{probability\}/g, probability);
    }

    // Replace {delay1} with debuff/effect value at max level
    const delay = parseDelay(skillData.de, maxLevel);
    if (delay) {
      formatted = formatted.replace(/\{delay1\}/g, delay);
    }
  }

  // Apply color formatting
  formatted = formatDescription(formatted);

  return formatted;
}
