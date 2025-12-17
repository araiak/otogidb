/**
 * URL Sampler for Deployment Validation
 *
 * Generates a stratified sample of URLs to test, covering:
 * - Card pages across locales
 * - List/index pages
 * - Blog posts
 * - Static pages
 * - Image URLs from Cloudinary
 */

import { readFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import type { CardData, Card, UrlSample, Locale } from './types.js';
import { LOCALES } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load cards data
function loadCardsData(): CardData {
  const cardsPath = join(__dirname, '../../public/data/cards.json');
  const content = readFileSync(cardsPath, 'utf-8');
  return JSON.parse(content) as CardData;
}

// Randomly sample n items from array
function sample<T>(array: T[], n: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, array.length));
}

// Get all playable cards
function getPlayableCards(data: CardData): Card[] {
  return Object.values(data.cards).filter((card) => card.playable);
}

// Generate card page URLs
function generateCardUrls(cards: Card[], perLocale: number): UrlSample[] {
  const samples: UrlSample[] = [];

  for (const locale of LOCALES) {
    const sampledCards = sample(cards, perLocale);
    for (const card of sampledCards) {
      samples.push({
        url: `/${locale}/cards/${card.id}`,
        category: 'card',
        locale,
      });
    }
  }

  return samples;
}

// Generate list page URLs
function generateListUrls(): UrlSample[] {
  const samples: UrlSample[] = [];
  const listPages = ['/', '/search'];

  for (const locale of LOCALES) {
    for (const page of listPages) {
      // All locales now use /{locale}/ prefix, including English
      const path = page === '/' ? `/${locale}/` : `/${locale}${page}`;
      samples.push({
        url: path,
        category: 'list',
        locale,
      });
    }
  }

  return samples;
}

// Generate blog URLs
function generateBlogUrls(): UrlSample[] {
  const samples: UrlSample[] = [];

  // Blog index pages
  for (const locale of LOCALES) {
    samples.push({
      url: `/${locale}/blog`,
      category: 'blog',
      locale,
    });
  }

  // Updates pages
  for (const locale of LOCALES) {
    samples.push({
      url: `/${locale}/updates`,
      category: 'blog',
      locale,
    });
  }

  return samples;
}

// Generate static page URLs
function generateStaticUrls(): UrlSample[] {
  const samples: UrlSample[] = [];
  const staticPages = ['/about', '/privacy'];

  for (const locale of LOCALES) {
    for (const page of staticPages) {
      samples.push({
        url: `/${locale}${page}`,
        category: 'static',
        locale,
      });
    }
  }

  return samples;
}

// Generate image URLs from Cloudinary
function generateImageUrls(cards: Card[], count: number): UrlSample[] {
  const samples: UrlSample[] = [];

  // Sample cards that have HD images
  const cardsWithImages = cards.filter((card) => card.image_urls?.hd);
  const sampledCards = sample(cardsWithImages, count);

  for (const card of sampledCards) {
    if (card.image_urls?.hd) {
      samples.push({
        url: card.image_urls.hd,
        category: 'image',
      });
    }
  }

  return samples;
}

export interface SamplerOptions {
  cardsPerLocale?: number;
  imageCount?: number;
}

export function generateUrlSamples(options: SamplerOptions = {}): {
  pages: UrlSample[];
  images: UrlSample[];
} {
  const { cardsPerLocale = 10, imageCount = 50 } = options;

  const data = loadCardsData();
  const playableCards = getPlayableCards(data);

  console.log(`Loaded ${playableCards.length} playable cards`);

  // Generate page URLs
  const cardUrls = generateCardUrls(playableCards, cardsPerLocale);
  const listUrls = generateListUrls();
  const blogUrls = generateBlogUrls();
  const staticUrls = generateStaticUrls();

  const pages = [...cardUrls, ...listUrls, ...blogUrls, ...staticUrls];

  // Generate image URLs
  const images = generateImageUrls(playableCards, imageCount);

  console.log(`Generated ${pages.length} page URLs, ${images.length} image URLs`);
  console.log(
    `  - Card pages: ${cardUrls.length} (${cardsPerLocale} per locale × ${LOCALES.length} locales)`
  );
  console.log(`  - List pages: ${listUrls.length}`);
  console.log(`  - Blog pages: ${blogUrls.length}`);
  console.log(`  - Static pages: ${staticUrls.length}`);

  return { pages, images };
}

// Run as standalone for testing (handles Windows path differences)
const __filename = fileURLToPath(import.meta.url);
const isMainModule = resolve(process.argv[1] || '') === __filename;

if (isMainModule) {
  const { pages, images } = generateUrlSamples();
  console.log('\nSample page URLs:');
  pages.slice(0, 10).forEach((s) => console.log(`  ${s.url} (${s.category})`));
  console.log('\nSample image URLs:');
  images.slice(0, 5).forEach((s) => console.log(`  ${s.url}`));
}
