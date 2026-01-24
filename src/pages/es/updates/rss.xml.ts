import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface PatchNotesManifest {
  total_versions: number;
  versions: Array<{
    version: string;
    date: string | null;
    new_cards: number;
    modified_cards: number;
  }>;
}

interface NewCard {
  id: string;
  name: string;
  rarity: number;
  attribute: string;
  type: string;
}

interface ModifiedCard {
  id: string;
  name: string;
  changes: Array<{
    display: string;
  }>;
}

interface PatchNotes {
  version: string;
  version_date: string;
  summary: {
    new_cards: number;
    modified_cards: number;
  };
  new_cards: NewCard[];
  modified_cards: ModifiedCard[];
}

export async function GET(context: APIContext) {
  // Load manifest
  const changesDir = join(process.cwd(), 'public', 'data', 'changes');
  const manifestPath = join(changesDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return new Response('Manifest not found', { status: 404 });
  }

  const manifest: PatchNotesManifest = JSON.parse(
    readFileSync(manifestPath, 'utf-8')
  );

  // Load patch notes and build RSS items
  const items: Array<{
    title: string;
    description: string;
    pubDate: Date;
    link: string;
  }> = [];

  for (const versionInfo of manifest.versions) {
    // Skip versions with no changes
    if (versionInfo.new_cards === 0 && versionInfo.modified_cards === 0) {
      continue;
    }

    const patchPath = join(changesDir, `patch_notes_${versionInfo.version}.json`);
    if (!existsSync(patchPath)) {
      continue;
    }

    const notes: PatchNotes = JSON.parse(readFileSync(patchPath, 'utf-8'));

    // Build description
    const descParts: string[] = [];

    if (notes.new_cards.length > 0) {
      const cardNames = notes.new_cards.slice(0, 5).map(c => c.name).join(', ');
      const more = notes.new_cards.length > 5 ? ` and ${notes.new_cards.length - 5} more` : '';
      descParts.push(`New cards: ${cardNames}${more}`);
    }

    if (notes.modified_cards.length > 0) {
      const cardNames = notes.modified_cards.slice(0, 5).map(c => c.name).join(', ');
      const more = notes.modified_cards.length > 5 ? ` and ${notes.modified_cards.length - 5} more` : '';
      descParts.push(`Modified cards: ${cardNames}${more}`);
    }

    items.push({
      title: `Version ${notes.version} - ${notes.summary.new_cards} new, ${notes.summary.modified_cards} changed`,
      description: descParts.join('. ') || 'Card data updates',
      pubDate: new Date(notes.version_date || versionInfo.date || new Date().toISOString()),
      link: `/es/updates/#${notes.version}`,
    });
  }

  // Sort by date descending
  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'OtogiDB Actualizaciones de Cartas',
    description: 'Parches de cartas, nuevos lanzamientos y cambios de balance para Otogi: Spirit Agents',
    site: context.site!,
    items,
    customData: `<language>es</language>`,
  });
}
