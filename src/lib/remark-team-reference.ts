import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';

/**
 * Remark plugin to transform :team["..."] and :reserve["..."] into a team display widget
 *
 * Usage in markdown:
 *   :team["req=583,583&opt=671,712,586"]
 *   :team["req=583&opt=671,712"]:reserve["req=744&opt=634"]
 *
 * Parameters:
 *   - req: Comma-separated card IDs that are required (shown with badge)
 *   - opt: Comma-separated card IDs that are optional
 *
 * The reserve section is optional and follows the same format.
 */
export function remarkTeamReference() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      // Match :team["..."] optionally followed by :reserve["..."]
      // Support both straight quotes (") and curly quotes (" ")
      // U+201C = " (left double quote), U+201D = " (right double quote)
      const teamRegex = /:team\[["\u201c]([^"\u201c\u201d]+)["\u201d]\](?::reserve\[["\u201c]([^"\u201c\u201d]+)["\u201d]\])?/g;
      const text = node.value;

      if (!teamRegex.test(text)) return;

      // Reset regex
      teamRegex.lastIndex = 0;

      const newNodes: Array<Text | { type: 'html'; value: string }> = [];
      let lastIndex = 0;
      let match;

      while ((match = teamRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, match.index),
          });
        }

        const mainTeamQuery = match[1];
        const reserveQuery = match[2] || '';

        // Escape HTML characters in the queries to prevent XSS
        const escapeHtml = (str: string) => str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');

        const escapedMain = escapeHtml(mainTeamQuery);
        const escapedReserve = escapeHtml(reserveQuery);

        // Create an HTML div that will be hydrated client-side
        const reserveAttr = reserveQuery ? ` data-team-reserve="${escapedReserve}"` : '';
        newNodes.push({
          type: 'html',
          value: `<div class="team-block" data-team-main="${escapedMain}"${reserveAttr}></div>`,
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
