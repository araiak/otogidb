/**
 * Fuse.js configuration for the card table's search box.
 *
 * Lives here rather than in CardTable so the weighting can be tested against the real
 * card index — a search config nobody can measure is a config nobody can tune.
 *
 * Note what is NOT searchable here:
 *  - Event names are not in cards_index.json at all. They come from events.json via
 *    eventCardIdsMatchingQuery() in ./eventFilter.
 *  - acquisition.sources and bonds.type are deliberately excluded: tiny controlled
 *    vocabularies already covered by dedicated filters, and "event" alone would match
 *    roughly half the table.
 */

export const FUSE_OPTIONS = {
  keys: [
    { name: 'id', weight: 2 },
    { name: 'name', weight: 3 },
    { name: 'skill.name', weight: 2 },
    { name: 'skill.description', weight: 1 },
    { name: 'abilities.name', weight: 2 },
    { name: 'abilities.description', weight: 1 },
    { name: 'stats.attribute_name', weight: 1.5 },
    { name: 'stats.type_name', weight: 1.5 },
    // Tags are a controlled vocabulary (26 skill / 43 ability), so they make good search
    // terms — "Wave Start", "AoE", "DMG Boost". Weighted below names so a card called
    // "Krampus" still outranks everything merely tagged AoE.
    { name: 'skill.tags', weight: 1.2 },
    { name: 'abilities.tags', weight: 1.2 },
  ],
  threshold: 0.3,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
};
