import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { remarkCardReference } from './src/lib/remark-card-reference';
import { remarkFilterReference, remarkListReference } from './src/lib/remark-filter-reference';
import { remarkTeamReference } from './src/lib/remark-team-reference';

// Load cards data for sitemap lastmod dates (from src/data - build-only file)
import cardsData from './src/data/cards.json' with { type: 'json' };

// Build a map of card ID to last modified date for sitemap
const cardLastModified = {};
for (const [id, card] of Object.entries(cardsData.cards || {})) {
  if (card.history?.last_modified) {
    cardLastModified[id] = new Date(card.history.last_modified);
  }
}

// https://astro.build/config
export default defineConfig({
  site: 'https://otogidb.com',
  integrations: [
    react(),
    tailwind(),
    sitemap({
      serialize(item) {
        // Extract card ID from URL patterns like /cards/123 or /ja/cards/123
        const cardMatch = item.url.match(/\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?cards\/(\d+)\/?$/);
        if (cardMatch) {
          const cardId = cardMatch[1];
          if (cardLastModified[cardId]) {
            item.lastmod = cardLastModified[cardId];
          }
        }
        return item;
      },
    })
  ],
  output: 'static',
  i18n: {
    locales: ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false  // English: /cards/1, others: /ja/cards/1, /ko/cards/1, etc.
    }
  },
  markdown: {
    remarkPlugins: [remarkCardReference, remarkFilterReference, remarkListReference, remarkTeamReference]
  },
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'tanstack-table': ['@tanstack/react-table'],
            'floating-ui': ['@floating-ui/react']
          }
        }
      }
    }
  }
});
