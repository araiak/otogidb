import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';
import { escapeHtml } from './security';
import glossaryDataRaw from '../data/glossary.json';

interface GlossaryEntry {
  definition: string;
  aliases?: string[];
  link?: string;
}

const glossaryData = glossaryDataRaw as unknown as Record<string, GlossaryEntry>;

// Parent node types we never rewrite inside:
//  - link: don't touch card-reference link text (e.g. card names)
//  - heading: keep headings clean
//  - code/inlineCode: never annotate code
const SKIP_PARENT_TYPES = new Set(['link', 'heading', 'code', 'inlineCode']);

// Map every term + alias (lowercased) to its canonical glossary key.
const termToCanonical: Record<string, string> = {};
for (const [canonical, entry] of Object.entries(glossaryData)) {
  termToCanonical[canonical.toLowerCase()] = canonical;
  for (const alias of entry.aliases ?? []) {
    termToCanonical[alias.toLowerCase()] = canonical;
  }
}

// Escape a string for safe inclusion in a RegExp.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build one case-insensitive, whole-word regex from all terms + aliases.
// Sort longest-first so multi-word aliases win over shorter substrings.
const allTerms = Object.keys(termToCanonical).sort((a, b) => b.length - a.length);
const glossaryRegex =
  allTerms.length > 0
    ? new RegExp(`\\b(?:${allTerms.map(escapeRegExp).join('|')})\\b`, 'gi')
    : null;

/**
 * Remark plugin: auto-detects glossary terms in blog text and wraps the FIRST
 * occurrence of each term (per page) in a <span class="glossary-term"> that the
 * client-side GlossaryPopups component hydrates with a hover/tap definition.
 *
 * Terms and definitions are maintained in src/data/glossary.json. No markup is
 * required in the blog posts themselves.
 *
 * Must run AFTER remark-card-reference so card names (now link nodes) aren't matched.
 */
export function remarkGlossary() {
  return (tree: Root) => {
    if (!glossaryRegex) return;

    // First-occurrence-per-page: track canonical keys already wrapped in this tree.
    const seen = new Set<string>();

    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;
      if (SKIP_PARENT_TYPES.has(parent.type)) return;

      const text = node.value;
      glossaryRegex.lastIndex = 0;
      if (!glossaryRegex.test(text)) return;

      glossaryRegex.lastIndex = 0;
      const newNodes: Array<Text | { type: 'html'; value: string }> = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      let replaced = false;

      while ((match = glossaryRegex.exec(text)) !== null) {
        const canonical = termToCanonical[match[0].toLowerCase()];
        // Skip if unknown (shouldn't happen) or already shown earlier on the page.
        if (!canonical || seen.has(canonical)) continue;
        seen.add(canonical);
        replaced = true;

        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        newNodes.push({
          type: 'html',
          value: `<span class="glossary-term" data-glossary-term="${escapeHtml(canonical)}">${escapeHtml(match[0])}</span>`,
        });

        lastIndex = match.index + match[0].length;
      }

      if (!replaced) return;

      if (lastIndex < text.length) {
        newNodes.push({ type: 'text', value: text.slice(lastIndex) });
      }

      parent.children.splice(index, 1, ...(newNodes as any));
    });
  };
}
