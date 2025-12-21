// Base URLs (configurable via environment variable for CI testing)
export const BASE_URL = process.env.BASE_URL || 'https://otogidb.com'
export const CLOUDINARY_BASE = 'https://res.cloudinary.com/dn3j8sqcc/image/upload'

// Supported locales
export const LOCALES = ['en', 'ja', 'ko', 'zh-cn', 'zh-tw', 'es'] as const
export type Locale = typeof LOCALES[number]

// Sample card IDs for testing (stable, well-known cards)
// URL uses simple ID (270), asset/image uses prefixed ID (100270)
export const SAMPLE_CARD_IDS = {
  primary: '270',       // Apollo's Harp - a reliable card for basic tests
  secondary: '14',      // Used for favicon (asset: 100014)
  tertiary: '1',        // First card
}

// Asset IDs (prefixed with 100 for Cloudinary paths)
export const SAMPLE_ASSET_IDS = {
  primary: '100270',
  secondary: '100014',
  tertiary: '100001',
}

// CSS Selectors
export const SELECTORS = {
  // Card table page
  cardTable: 'table.data-table',
  cardTableRow: '.data-table tbody tr',
  searchInput: 'input[placeholder="Search cards..."]',
  resultsCount: 'text=/Showing \\d+ of \\d+ cards/',
  filterAttr: 'button:has-text("Attr")',
  filterType: 'button:has-text("Type")',
  filterRarity: 'button:has-text("Rarity")',
  clearFilters: 'text=Clear filters',

  // Mobile card grid
  mobileCardItem: '.card-grid-item',
  mobilePreviewButton: 'button[aria-label="Preview card"]',

  // Hover popup (desktop)
  popup: '.popup',
  floatingPopup: '[role="tooltip"], .popup',

  // Mobile modal
  mobileModal: '.fixed.inset-0.z-50',
  mobileModalClose: 'button:has(svg path[d*="M6 18L18 6"])',

  // Card detail page
  cardImage: 'img[src*="cloudinary"]',
  cardStats: 'text=/Max ATK|Max HP/',
  skillSection: 'text=Skill',

  // Navigation
  languageSwitcher: '[data-locale-switcher]',
  themeToggle: 'button[aria-label*="theme"], button:has-text("Dark"), button:has-text("Light")',

  // Pagination
  pagination: 'text=/Page \\d+ of \\d+/',
  paginationNext: 'button:has-text("Next")',
  paginationPrev: 'button:has-text("Previous")',
}

// Cloudinary image paths for testing
export const CLOUDINARY_PATHS = {
  hdCard: (assetId: string) => `otogi/cards_hd/${assetId}_hd.png`,
  androidCircle: (assetId: string) => `otogi/android/${assetId}.png`,
  placeholder: 'v1765670205/placeholder-card_q0umz7.png',
  mascot: 'v1765670264/mascot_p2e3gi.png',
}

// Cloudinary transforms
export const CLOUDINARY_TRANSFORMS = {
  thumb: 'w_80,f_auto,q_auto',
  popup: 'w_200,f_auto,q_auto',
  hdCircle: 'w_120,h_120,c_thumb,g_face,r_max,f_auto,q_auto',
  favicon: 'c_thumb,g_face,w_32,h_32,z_1.0/f_png',
}

// Timeouts
export const TIMEOUTS = {
  pageLoad: 30000,
  networkIdle: 10000,
  animation: 500,
  debounce: 300,
}
