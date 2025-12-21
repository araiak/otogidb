import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';
import { escapeHtml } from './security';

/**
 * Remark plugin to transform :filter["query"] into a filterable card grid
 *
 * Usage in markdown:
 *   :filter["?ability=DMG+Boost,Wave+Start"]
 *   :filter["?attr=Divina&type=Healer"]
 *   :filter["?rarity=5"]
 *
 * Supported query parameters (same as CardTable):
 *   - ability: Comma-separated ability tags (must all exist on ONE ability)
 *   - attr: Divina, Phantasma, Anima
 *   - type: Melee, Ranged, Healer, Assist
 *   - rarity: 1-5
 *   - source: standard, gacha, event, exchange, auction, daily
 */
export function remarkFilterReference() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      // Match :filter["query"] - support both straight quotes (") and curly quotes (" ")
      // Markdown processors may convert straight quotes to typographic quotes
      // U+201C = " (left double quote), U+201D = " (right double quote)
      const filterRegex = /:filter\[["\u201c]([^"\u201c\u201d]+)["\u201d]\]/g;
      const text = node.value;

      if (!filterRegex.test(text)) return;

      // Reset regex
      filterRegex.lastIndex = 0;

      const newNodes: Array<Text | { type: 'html'; value: string }> = [];
      let lastIndex = 0;
      let match;

      while ((match = filterRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, match.index),
          });
        }

        const query = match[1];

        // Create an HTML div that will be hydrated client-side
        // Escape HTML characters in the query to prevent XSS using single-pass escaping
        const escapedQuery = escapeHtml(query);

        newNodes.push({
          type: 'html',
          value: `<div class="filtered-cards-block" data-filter-query="${escapedQuery}"></div>`,
        });

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }

      // Replace the node with the new nodes
      if (newNodes.length > 0) {
        parent.children.splice(index, 1, ...newNodes as any);
      }
    });
  };
}

/**
 * Remark plugin to transform :list[id1,id2,id3] into a card list grid
 *
 * Usage in markdown:
 *   :list[111,123,456]
 *   :list[10001, 10002, 10003]
 *
 * Cards are displayed in the order specified, with hover popups.
 * Unlike :filter[], this shows specific cards by ID rather than filtering.
 */
export function remarkListReference() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      // Match :list[id1,id2,id3] - just comma-separated numbers
      const listRegex = /:list\[([0-9,\s]+)\]/g;
      const text = node.value;

      if (!listRegex.test(text)) return;

      // Reset regex
      listRegex.lastIndex = 0;

      const newNodes: Array<Text | { type: 'html'; value: string }> = [];
      let lastIndex = 0;
      let match;

      while ((match = listRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, match.index),
          });
        }

        // Clean up the card IDs - remove extra whitespace
        const cardIds = match[1]
          .split(',')
          .map(id => id.trim())
          .filter(Boolean)
          .join(',');

        newNodes.push({
          type: 'html',
          value: `<div class="card-list-block" data-card-ids="${cardIds}"></div>`,
        });

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        newNodes.push({
          type: 'text',
          value: text.slice(lastIndex),
        });
      }

      // Replace the node with the new nodes
      if (newNodes.length > 0) {
        parent.children.splice(index, 1, ...newNodes as any);
      }
    });
  };
}
