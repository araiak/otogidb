import type { ReactNode } from 'react';

interface Rule { re: RegExp; cls: string }

const RULES: Rule[] = [
  // Numeric values with game units — numbers followed by DMG, HP, or %
  { re: /\b\d[\d,]*(?:\.\d+)?\s*(?:DMG|HP|%)/g, cls: 'hl-value' },
  // Turn/hit durations
  { re: /\b\d+\s+(?:turns?|hits?)\b/gi, cls: 'hl-value' },
  // Damage type keywords — order matters: compound phrases before standalone DMG
  { re: /\bCrit(?:ical)?\s+DMG\b/gi, cls: 'hl-crit-dmg' },
  { re: /\bSkill\s+DMG\b/gi, cls: 'hl-skill-dmg' },
  { re: /\bCrit(?:ical)?\s+Rate\b/gi, cls: 'hl-crit-rate' },
  { re: /\bATK\s+(?:Speed|SPD)\b/gi, cls: 'hl-atk-speed' },
  { re: /\bDMG\s+taken\b/gi, cls: 'hl-dmg-taken' },
  { re: /\bmore\s+DMG\b/gi, cls: 'hl-dmg-taken' },
  { re: /\bDMG\b/g, cls: 'hl-dmg' },
  // Timing triggers — wave start conditions
  { re: /\bwave start\b/gi, cls: 'hl-trigger' },
  { re: /\bstart of (?:each|every|the (?:first|last|final|next)) wave\b/gi, cls: 'hl-trigger' },
  // Resource/stat effects — EXP and drop rate
  { re: /\bEXP\b/g, cls: 'hl-value' },
  { re: /\bdrop rate\b/gi, cls: 'hl-value' },
  // Attribute names — colored in their team colors via CSS custom properties
  { re: /\bDivina\b/g, cls: 'hl-divina' },
  { re: /\bAnima\b/g, cls: 'hl-anima' },
  { re: /\bPhantasma\b/g, cls: 'hl-phantasma' },
];

interface Span { start: number; end: number; cls: string }

function collectSpans(text: string): Span[] {
  const spans: Span[] = [];
  for (const { re, cls } of RULES) {
    const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    r.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(text)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, cls });
    }
  }
  // Sort by start; on tie keep longer match first; deduplicate overlaps
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const deduped: Span[] = [];
  for (const s of spans) {
    const prev = deduped[deduped.length - 1];
    if (!prev || s.start >= prev.end) deduped.push(s);
  }
  return deduped;
}

/** Wraps keywords in the text portion of an HTML string, leaving tags untouched. */
export function highlightHtml(html: string): string {
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => {
    if (tag !== undefined) return tag;
    const spans = collectSpans(text);
    if (!spans.length) return text;
    let result = '';
    let pos = 0;
    for (const { start, end, cls } of spans) {
      if (start > pos) result += text.slice(pos, start);
      result += `<span class="${cls}">${text.slice(start, end)}</span>`;
      pos = end;
    }
    if (pos < text.length) result += text.slice(pos);
    return result;
  });
}

/** Wraps keywords in plain text, returning a React node array. */
export function highlightText(text: string | undefined): ReactNode {
  if (!text) return null;
  const spans = collectSpans(text);
  if (!spans.length) return text;
  const nodes: ReactNode[] = [];
  let pos = 0;
  for (const { start, end, cls } of spans) {
    if (start > pos) nodes.push(text.slice(pos, start));
    nodes.push(<span key={start} className={cls}>{text.slice(start, end)}</span>);
    pos = end;
  }
  if (pos < text.length) nodes.push(text.slice(pos));
  return <>{nodes}</>;
}
