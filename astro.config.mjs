import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { remarkCardReference } from './src/lib/remark-card-reference';

// https://astro.build/config
export default defineConfig({
  site: 'https://otogidb.com',
  integrations: [
    react(),
    tailwind(),
    sitemap()
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
    remarkPlugins: [remarkCardReference]
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
