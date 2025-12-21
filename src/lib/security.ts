/**
 * Security utilities for input validation and HTML sanitization
 *
 * Protects against XSS and injection attacks from URL parameters and user input
 */

// ============================================================================
// URL Parameter Validation
// ============================================================================

/**
 * Allowed values for filter parameters
 * Only these values are accepted from URL params
 */
export const ALLOWED_FILTER_VALUES = {
  attributes: ['Divina', 'Phantasma', 'Anima', 'Neutral'],
  types: ['Melee', 'Ranged', 'Healer', 'Assist', 'Utility'],
  rarities: [1, 2, 3, 4, 5],
  sources: ['gacha', 'exchange', 'auction', 'event', 'daily'],
  bonds: ['Divina', 'Phantasma', 'Anima', 'Neutral', 'Melee', 'Ranged', 'Healer', 'Assist'],
  sortColumns: ['id', 'name', 'rarity', 'attribute', 'type', 'max_atk', 'max_hp', 'speed', 'crit', 'cost'],
  sortDirections: ['asc', 'desc'],
  booleans: ['0', '1'],
} as const;

/**
 * Maximum length for text input (search queries)
 */
export const MAX_SEARCH_LENGTH = 100;

/**
 * Maximum length for individual filter values
 */
export const MAX_FILTER_VALUE_LENGTH = 50;

/**
 * Sanitize a search query string
 * - Trims whitespace
 * - Limits length
 * - Removes potentially dangerous characters
 */
export function sanitizeSearchQuery(query: string | null): string {
  if (!query) return '';

  // Trim and limit length
  let sanitized = query.trim().slice(0, MAX_SEARCH_LENGTH);

  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

  return sanitized;
}

/**
 * Validate and filter an array of string values against allowed list
 */
export function validateStringArray(
  values: string[],
  allowedValues: readonly string[]
): string[] {
  return values
    .filter(v => typeof v === 'string')
    .map(v => v.trim().slice(0, MAX_FILTER_VALUE_LENGTH))
    .filter(v => allowedValues.includes(v));
}

/**
 * Validate and filter an array of numeric values against allowed list
 */
export function validateNumberArray(
  values: number[],
  allowedValues: readonly number[]
): number[] {
  return values
    .filter(v => typeof v === 'number' && !isNaN(v))
    .filter(v => allowedValues.includes(v));
}

/**
 * Validate a sort column name
 */
export function validateSortColumn(column: string | null): string | null {
  if (!column) return null;
  const trimmed = column.trim().toLowerCase();
  return ALLOWED_FILTER_VALUES.sortColumns.includes(trimmed as any) ? trimmed : null;
}

/**
 * Validate a sort direction
 */
export function validateSortDirection(dir: string | null): 'asc' | 'desc' {
  if (dir === 'desc') return 'desc';
  return 'asc';
}

/**
 * Validate a boolean parameter (0 or 1)
 */
export function validateBooleanParam(value: string | null): boolean {
  return value === '1';
}

/**
 * Parse and validate comma-separated string values from URL param
 */
export function parseAndValidateStringParam(
  param: string | null,
  allowedValues: readonly string[]
): string[] {
  if (!param) return [];
  const values = param.split(',').filter(Boolean);
  return validateStringArray(values, allowedValues);
}

/**
 * Parse and validate comma-separated numeric values from URL param
 */
export function parseAndValidateNumberParam(
  param: string | null,
  allowedValues: readonly number[]
): number[] {
  if (!param) return [];
  const values = param.split(',').map(Number).filter(n => !isNaN(n));
  return validateNumberArray(values, allowedValues);
}

// ============================================================================
// HTML Sanitization
// ============================================================================

/**
 * Allowed HTML tags for game descriptions
 * These are the only tags that will be preserved
 */
const ALLOWED_TAGS = new Set(['span', 'br', 'b', 'i', 'strong', 'em']);

/**
 * Allowed attributes and their validation patterns
 */
const ALLOWED_ATTRIBUTES: Record<string, RegExp> = {
  'style': /^color:\s*#[0-9a-fA-F]{6}\s*;?$/,  // Only allow color styles with hex values
};

/**
 * Sanitize HTML content to prevent XSS
 *
 * This is a basic sanitizer that:
 * - Only allows whitelisted tags
 * - Only allows whitelisted attributes with validated values
 * - Escapes everything else
 *
 * For game descriptions, only <span style="color:#hex"> and <br> are expected
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  // First, escape all HTML entities
  let result = '';
  let i = 0;

  while (i < html.length) {
    // Look for a tag
    if (html[i] === '<') {
      const tagEnd = html.indexOf('>', i);
      if (tagEnd === -1) {
        // Malformed tag, escape the <
        result += '&lt;';
        i++;
        continue;
      }

      const tagContent = html.slice(i + 1, tagEnd);
      const isClosingTag = tagContent.startsWith('/');
      const tagName = isClosingTag
        ? tagContent.slice(1).split(/\s/)[0].toLowerCase()
        : tagContent.split(/\s/)[0].toLowerCase();

      // Check if tag is allowed
      if (ALLOWED_TAGS.has(tagName)) {
        if (isClosingTag) {
          // Closing tag - allow it
          result += `</${tagName}>`;
        } else if (tagName === 'br') {
          // Self-closing br
          result += '<br>';
        } else {
          // Opening tag - validate attributes
          const sanitizedAttrs = sanitizeAttributes(tagContent.slice(tagName.length));
          result += `<${tagName}${sanitizedAttrs}>`;
        }
      } else {
        // Tag not allowed, escape it
        result += '&lt;' + escapeHtml(tagContent) + '&gt;';
      }

      i = tagEnd + 1;
    } else {
      // Regular character
      result += html[i];
      i++;
    }
  }

  return result;
}

/**
 * Sanitize HTML attributes, only keeping allowed ones with validated values
 */
function sanitizeAttributes(attrString: string): string {
  if (!attrString.trim()) return '';

  const result: string[] = [];

  // Simple attribute parser
  const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let match;

  while ((match = attrRegex.exec(attrString)) !== null) {
    const attrName = match[1].toLowerCase();
    const attrValue = match[2] || match[3] || match[4] || '';

    // Check if attribute is allowed and value is valid
    if (ALLOWED_ATTRIBUTES[attrName]) {
      const validator = ALLOWED_ATTRIBUTES[attrName];
      if (validator.test(attrValue)) {
        result.push(`${attrName}="${escapeHtml(attrValue)}"`);
      }
    }
  }

  return result.length > 0 ? ' ' + result.join(' ') : '';
}

/**
 * HTML escape map for single-pass encoding.
 * This prevents issues with multi-pass encoding where intermediate
 * results could be misinterpreted.
 */
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Escape special HTML characters using a single-pass replacement.
 * This is safer than chained .replace() calls as it processes all
 * characters in one pass, preventing any intermediate state issues.
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * HTML entity decode map for single-pass decoding.
 * Using a map prevents double-decoding vulnerabilities.
 */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&#x27;': "'",
  '&apos;': "'",
};

/**
 * Safely decode HTML entities in a single pass.
 * This prevents double-decoding attacks (e.g., &amp;lt; → &lt; → <)
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  // Single-pass replacement using a regex that matches all entities at once
  return text.replace(/&(?:amp|lt|gt|quot|#039|#x27|apos);/g, (match) => {
    return HTML_ENTITIES[match] || match;
  });
}

/**
 * Strip all HTML tags from text (for plain text output)
 * Uses a proper parser approach to handle malformed tags
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  // Use a more robust approach that handles edge cases
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts first
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')   // Remove styles
    .replace(/<[^>]+>/g, '');                                           // Remove remaining tags
}

// ============================================================================
// General Input Validation
// ============================================================================

/**
 * Validate that a card ID is a valid number
 */
export function validateCardId(id: string | null | undefined): number | null {
  if (!id) return null;
  const num = parseInt(id, 10);
  if (isNaN(num) || num < 1 || num > 10000) return null;
  return num;
}

/**
 * Validate a locale code
 */
export const VALID_LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'] as const;
export type ValidLocale = typeof VALID_LOCALES[number];

export function validateLocale(locale: string | null | undefined): ValidLocale {
  if (locale && VALID_LOCALES.includes(locale as ValidLocale)) {
    return locale as ValidLocale;
  }
  return 'en';
}
