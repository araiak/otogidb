import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { remarkCardReference } from './src/lib/remark-card-reference';
import { remarkFilterReference, remarkListReference } from './src/lib/remark-filter-reference';
import { remarkTeamReference } from './src/lib/remark-team-reference';
import { remarkSpoiler } from './src/lib/remark-spoiler';

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
    locales: ['en'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: false
    }
  },
  markdown: {
    remarkPlugins: [remarkCardReference, remarkFilterReference, remarkListReference, remarkTeamReference, remarkSpoiler]
  },
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Astro 6 / newer Rollup rejects manualChunks for externalized modules.
          // Use the function form so we silently skip any module Rollup has
          // already marked external (server-side entries) and only chunk on
          // the client build where the deps are bundled.
          manualChunks(id) {
            if (id.includes('node_modules/@tanstack/react-table')) {
              return 'tanstack-table';
            }
            if (id.includes('node_modules/@floating-ui/react')) {
              return 'floating-ui';
            }
            return undefined;
          }
        }
      }
    }
  }
});
