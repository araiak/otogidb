// Patch-notes loading + month grouping.
// Lives outside the .astro file because Astro hoists getStaticPaths away from
// component frontmatter, so it can only see module imports.

export interface PatchNotesManifest {
  total_versions: number;
  versions: Array<{
    version: string;
    date: string | null;
    new_cards: number;
    modified_cards: number;
  }>;
}

export interface CardChange {
  category: string;
  category_label: string;
  field: string;
  field_label: string;
  old: unknown;
  new: unknown;
  display: string;
}

export interface NewCard {
  id: string;
  name: string;
  rarity: number;
  attribute: string;
  type: string;
  image_url: string | null;
}

export interface ModifiedCard {
  id: string;
  name: string;
  rarity: number;
  image_url: string | null;
  changes: CardChange[];
}

export interface PatchNotes {
  version: string;
  version_date: string;
  previous_version: string | null;
  generated_at: string;
  summary: {
    new_cards: number;
    modified_cards: number;
  };
  new_cards: NewCard[];
  modified_cards: ModifiedCard[];
}

export interface MonthGroup {
  key: string;
  label: string;
  updates: PatchNotes[];
  isCurrentMonth: boolean;
}

export async function getMonthGroups(): Promise<MonthGroup[]> {
  let manifest: PatchNotesManifest;
  try {
    const manifestRaw = await import('../../public/data/changes/manifest.json');
    manifest = (manifestRaw.default || manifestRaw) as PatchNotesManifest;
  } catch (_e) {
    manifest = { total_versions: 0, versions: [] };
  }

  const patchNotes: PatchNotes[] = [];
  for (const versionInfo of manifest.versions) {
    try {
      const notes = await import(`../../public/data/changes/patch_notes_${versionInfo.version}.json`);
      patchNotes.push((notes.default || notes) as PatchNotes);
    } catch (_e) {
      console.warn(`Failed to load patch notes for version ${versionInfo.version}`);
    }
  }

  // Newest first, dropping versions with nothing to show
  patchNotes.sort((a, b) =>
    (b.version_date || b.generated_at || '').localeCompare(a.version_date || a.generated_at || '')
  );
  const visible = patchNotes.filter(
    (notes) => notes.summary.new_cards > 0 || notes.summary.modified_cards > 0
  );

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const groups = new Map<string, PatchNotes[]>();
  for (const update of visible) {
    const date = new Date(update.version_date || update.generated_at || '');
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(update);
  }

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, updates]) => ({
      key,
      label: updates[0]
        ? new Date(updates[0].version_date || updates[0].generated_at || '').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
          })
        : key,
      updates,
      isCurrentMonth: key === currentMonthKey,
    }));
}
