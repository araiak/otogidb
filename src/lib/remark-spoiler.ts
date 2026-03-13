import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';
import { escapeHtml } from './security';

/**
 * Remark plugin to transform :spoiler["content"] into a collapsible <details> element
 *
 * Usage in markdown:
 *   :spoiler["Description says 80% crit DMG boost, actual data value is 60%."]
 *
 * Support both straight quotes (") and curly quotes (" ")
 * U+201C = " (left double quote), U+201D = " (right double quote)
 * Astro's smartypants converts straight quotes to curly before this plugin runs.
 */
export function remarkSpoiler() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      const spoilerRegex = /:spoiler\[["\u201c]([^"\u201c\u201d]+)["\u201d]\]/g;
      const text = node.value;

      if (!spoilerRegex.test(text)) return;

      // Reset regex
      spoilerRegex.lastIndex = 0;

      const newNodes: Array<Text | { type: 'html'; value: string }> = [];
      let lastIndex = 0;
      let match;

      while ((match = spoilerRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, match.index),
          });
        }

        const content = escapeHtml(match[1]);

        newNodes.push({
          type: 'html',
          value: `<details class="prose-spoiler"><summary>Data note</summary><span>${content}</span></details>`,
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
