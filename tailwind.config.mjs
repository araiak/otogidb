/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  // Use 'selector' strategy with custom selector that matches:
  // 1. When .dark class is present (explicit choice or JS-applied)
  // 2. When system prefers dark AND user hasn't explicitly chosen light
  darkMode: ['variant', [
    '.dark &',
    '@media (prefers-color-scheme: dark) { :root:not(.light-override) & }'
  ]],
  theme: {
    // Add xs breakpoint for extra-small phones (360-480px)
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Light Mode - Serene Purity
        shiro: '#F7F7F0',           // Background - Pure White/Eggshell
        'gin-nezumi': '#D9D9D3',    // Surface - Silver Mouse Gray
        sumiiro: '#242429',         // Text - Ink Black
        'nibi-iro': '#737373',      // Secondary text - Dull Gray
        'asagi-iro': '#6699AA',     // Accent - Pale Leek Blue
        benihi: '#D24D4D',          // Error - Scarlet

        // Dark Mode - Deep Elegance
        rurikon: '#121A2C',         // Background - Lapis Lazuli Navy
        konkikyou: '#2B3856',       // Surface - Deep Bellflower Blue
        enpaku: '#F3F3E8',          // Text - Lead White
        aozumi: '#A3A3A8',          // Secondary text - Blue-Tinged Ink
        'ruri-iro': '#3366CC',      // Accent - Lapis Lazuli Blue
        yamabuki: '#FFC840',        // Highlight - Japanese Rose Yellow
        shu: '#E63A3C',             // Micro accent - Vermilion

        // Attribute colors
        divina: '#FFD700',          // Gold
        anima: '#FF6B6B',           // Coral red
        phantasma: '#9B59B6',       // Purple

        // Type colors
        melee: '#E74C3C',           // Red
        ranged: '#3498DB',          // Blue
        healer: '#2ECC71',          // Green
        assist: '#F39C12',          // Orange

        // Rarity colors (stars)
        'rarity-1': '#9E9E9E',      // Gray
        'rarity-2': '#8BC34A',      // Green
        'rarity-3': '#2196F3',      // Blue
        'rarity-4': '#9C27B0',      // Purple
        'rarity-5': '#FF9800',      // Orange/Gold
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans JP',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
};
