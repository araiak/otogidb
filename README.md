# OtogiDB

A card database website for **Otogi Spirit Agents**, built with Astro and React.

**Live Site:** [https://otogidb.com](https://otogidb.com)

## Deployment

The site automatically deploys to **Cloudflare Pages** when changes are merged to `main`. No manual deployment needed - just push to main and the site updates within minutes.

## Features

- **Card Database** - Browse 800+ cards with filtering, sorting, and search
- **Card Details** - Stats, skills, abilities, bonds, and similar card recommendations
- **NPC Filter** - Hide/show 64 NPC/enemy cards (hidden by default)
- **Shareable Filters** - URL parameters preserve filter state for sharing
- **Blog** - Patch notes and game guides with card reference tooltips
- **Dark Theme** - Easy on the eyes
- **Mobile Responsive** - Works on all screen sizes
- **SEO Optimized** - Open Graph, Twitter Cards, JSON-LD, sitemap

## Tech Stack

- **[Astro](https://astro.build)** - Static site generator
- **[React](https://react.dev)** - Interactive components (islands architecture)
- **[TanStack Table](https://tanstack.com/table)** - Powerful table with filtering/sorting
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling
- **[Fuse.js](https://fusejs.io)** - Fuzzy search
- **[Floating UI](https://floating-ui.com)** - Card preview tooltips

## Project Structure

```
otogidb/
├── public/
│   ├── data/               # JSON data files (synced from pipeline)
│   │   ├── cards.json      # Full card data
│   │   ├── cards_index.json # Optimized for table loading
│   │   ├── skills.json     # Skill scaling data
│   │   ├── abilities.json  # Ability data
│   │   └── changes/        # Patch notes per version
│   ├── icons/              # Game icons (attributes, types, stars)
│   ├── robots.txt
│   └── _headers            # Cloudflare cache headers
├── src/
│   ├── components/
│   │   ├── cards/          # Card table, popup, icons
│   │   ├── blog/           # Blog-specific components
│   │   └── SEO.astro       # Open Graph/Twitter meta tags
│   ├── content/
│   │   └── blog/           # Markdown blog posts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/                # Utilities
│   │   ├── cards.ts        # Data fetching
│   │   ├── formatters.ts   # Number/date/skill formatting
│   │   ├── images.ts       # Cloudinary URL helpers
│   │   ├── search.ts       # Fuse.js search index
│   │   └── similarity.ts   # Similar card algorithm
│   ├── pages/
│   │   ├── index.astro     # Card table (homepage)
│   │   ├── cards/[id].astro # Individual card pages
│   │   ├── blog/           # Blog listing and posts
│   │   └── updates/        # Patch notes
│   └── types/
│       └── card.ts         # TypeScript interfaces
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
cd otogidb
npm install
```

### Run Development Server

```bash
npm run dev
```

Opens at [http://localhost:4321](http://localhost:4321)

### Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Data Pipeline

Card data comes from the parent `OtogiReverse` project's pipeline:

1. **Pipeline** (`scripts/pipeline.py`) extracts and processes game files
2. **Sync** (`scripts/sync_website.py`) copies JSON to `otogidb/public/data/`
3. **Build** generates 880+ static pages (one per card)

To update card data:
```bash
# From OtogiReverse root
python scripts/pipeline.py
python scripts/sync_website.py

# Then rebuild website
cd otogidb
npm run build
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/cards/CardTable.tsx` | Main card table with filters |
| `src/pages/cards/[id].astro` | Individual card page template |
| `src/lib/formatters.ts` | Skill description formatting with scaling |
| `src/lib/similarity.ts` | "Similar Cards" recommendation algorithm |
| `public/data/cards_index.json` | Optimized card data for fast table loading |

## Environment Variables

```bash
# .env.development / .env.production
PUBLIC_ENV=development  # or 'production'
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test locally with `npm run dev`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE)
