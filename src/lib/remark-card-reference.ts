import { visit } from 'unist-util-visit';
import type { Root, Text, Parent } from 'mdast';

// Load cards data at build time
import cardsDataRaw from '../../public/data/cards.json';

interface CardsData {
  cards: Record<string, { id: string; name: string | null }>;
}

const cardsData = cardsDataRaw as unknown as CardsData;

// Build a name-to-id lookup
const cardNameToId: Record<string, string> = {};
Object.values(cardsData.cards).forEach(card => {
  if (card.name) {
    cardNameToId[card.name.toLowerCase()] = card.id;
  }
});

/**
 * Remark plugin to transform :card[id] or :card[name] into card reference links
 */
export function remarkCardReference() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: Parent | undefined) => {
      if (!parent || index === undefined) return;

      // Match :card[anything]
      const cardRefRegex = /:card\[([^\]]+)\]/g;
      const text = node.value;

      if (!cardRefRegex.test(text)) return;

      // Reset regex
      cardRefRegex.lastIndex = 0;

      const newNodes: Array<Text | { type: 'link'; url: string; children: Text[] }> = [];
      let lastIndex = 0;
      let match;

      while ((match = cardRefRegex.exec(text)) !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          newNodes.push({
            type: 'text',
            value: text.slice(lastIndex, match.index),
          });
        }

        const ref = match[1];
        let cardId: string | undefined;
        let cardName: string | undefined;

        // Check if it's a numeric ID
        if (/^\d+$/.test(ref)) {
          cardId = ref;
          const card = cardsData.cards[ref];
          cardName = card?.name || `Card #${ref}`;
        } else {
          // Try to find by name
          cardId = cardNameToId[ref.toLowerCase()];
          cardName = ref;
        }

        if (cardId) {
          // Create a link node with data attributes for client-side hydration
          // Using 'as any' because mdast types don't include hProperties but rehype processes them
          newNodes.push({
            type: 'link',
            url: `/cards/${cardId}`,
            data: {
              hProperties: {
                className: 'card-ref',
                'data-card-id': cardId,
              },
            },
            children: [
              {
                type: 'text',
                value: cardName || `Card #${cardId}`,
              },
            ],
          } as any);
        } else {
          // Card not found, just output the text
          newNodes.push({
            type: 'text',
            value: `[${ref}]`,
          });
        }

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
