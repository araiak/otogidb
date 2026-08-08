import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Fuse from 'fuse.js';
import { FUSE_OPTIONS } from '../cardSearch';
import { eventCardIdsMatchingQuery, type EventEntry } from '../eventFilter';

/**
 * Runs against the real card index so the search weighting can actually be measured.
 * Tags were added as search keys and the open question was noise: short tags like "DMG"
 * under a fuzzy threshold could swamp results. These tests pin that down.
 */

const INDEX_PATH = resolve(__dirname, '../../../public/data/cards_index.json');
const EVENTS_PATH = resolve(__dirname, '../../../public/data/events.json');

interface IndexCard {
  id: string;
  name: string;
  skill?: { tags?: string[] } | null;
  abilities?: { tags?: string[] }[];
}

let cards: IndexCard[] = [];
let events: EventEntry[] = [];
let fuse: Fuse<IndexCard>;

beforeAll(() => {
  if (!existsSync(INDEX_PATH)) return;
  cards = Object.values(JSON.parse(readFileSync(INDEX_PATH, 'utf-8')).cards);
  fuse = new Fuse(cards, FUSE_OPTIONS);
  if (existsSync(EVENTS_PATH)) {
    events = JSON.parse(readFileSync(EVENTS_PATH, 'utf-8'));
  }
});

const haveData = () => cards.length > 0;
const search = (q: string) => fuse.search(q).map((r) => r.item);

describe('FUSE_OPTIONS keys', () => {
  it('does not include a top-level description key', () => {
    // There is no top-level description in cards_index.json — it matched 0 of 1002
    // cards and was a dead key.
    const names = FUSE_OPTIONS.keys.map((k) => k.name);
    expect(names).not.toContain('description');
  });

  it('does not search acquisition sources or bond types', () => {
    // Tiny controlled vocabularies with dedicated filters; "event" would match ~half.
    const names = FUSE_OPTIONS.keys.map((k) => k.name);
    expect(names).not.toContain('acquisition.sources');
    expect(names).not.toContain('bonds.type');
  });

  it('weights tags below card and skill names', () => {
    const weightOf = (n: string) => FUSE_OPTIONS.keys.find((k) => k.name === n)!.weight;
    expect(weightOf('skill.tags')).toBeLessThan(weightOf('name'));
    expect(weightOf('abilities.tags')).toBeLessThan(weightOf('skill.name'));
  });
});

describe('tag search against the real index', () => {
  it('finds cards by a multi-word ability tag', () => {
    if (!haveData()) return;
    const results = search('Wave Start');
    expect(results.length).toBeGreaterThan(0);

    const tagged = results.filter((c) =>
      c.abilities?.some((a) => a.tags?.includes('Wave Start'))
    );
    // The tag is the reason these matched, so most hits should genuinely carry it.
    expect(tagged.length).toBeGreaterThan(results.length * 0.5);
  });

  it('finds cards by a skill tag', () => {
    if (!haveData()) return;
    const results = search('Stun');
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((c) => c.skill?.tags?.includes('Stun'))
    ).toBe(true);
  });

  it('adding tags does not materially widen an already-broad query', () => {
    if (!haveData()) return;
    // A broad term like "DMG" matches most of the table via skill.description alone —
    // measured at 814/1002 BEFORE tags were added as keys. The risk was that tags would
    // make that worse; measured, they take it to 862, i.e. ~6% wider.
    //
    // Guard the delta, not the absolute count. Asserting "DMG returns few cards" would
    // be asserting something untrue about the data: most cards really do deal damage,
    // and the tag filters exist for precision.
    const withoutTags = new Fuse(cards, {
      ...FUSE_OPTIONS,
      keys: FUSE_OPTIONS.keys.filter((k) => !k.name.endsWith('.tags')),
    });

    const baseline = withoutTags.search('DMG').length;
    const withTags = search('DMG').length;

    expect(withTags).toBeLessThan(baseline * 1.25);
  });

  it('makes tag-only terms findable at all', () => {
    if (!haveData()) return;
    // The actual win: "AoE" appears in no name or description, so it returned nothing
    // before tags became searchable.
    const withoutTags = new Fuse(cards, {
      ...FUSE_OPTIONS,
      keys: FUSE_OPTIONS.keys.filter((k) => !k.name.endsWith('.tags')),
    });

    expect(withoutTags.search('AoE').length).toBe(0);
    expect(search('AoE').length).toBeGreaterThan(0);
  });

  it('still ranks an exact card name first', () => {
    if (!haveData()) return;
    const target = cards.find((c) => c.name === 'Krampus');
    if (!target) return;

    const results = search('Krampus');
    // Name weight (3) must beat tag weight (1.2), or search becomes unusable.
    expect(results[0]?.id).toBe(target.id);
  });
});

describe('event-name search', () => {
  it('surfaces cards from an event whose name matches', () => {
    if (events.length === 0) return;
    const ids = eventCardIdsMatchingQuery(events, 'anniversary');
    expect(ids.size).toBeGreaterThan(0);
  });

  it('is case insensitive', () => {
    if (events.length === 0) return;
    expect(eventCardIdsMatchingQuery(events, 'HALLOWEEN').size).toBe(
      eventCardIdsMatchingQuery(events, 'halloween').size
    );
  });

  it('ignores queries shorter than the search minimum', () => {
    if (events.length === 0) return;
    // Matches Fuse's minMatchCharLength so a stray keystroke cannot dump a whole event.
    expect(eventCardIdsMatchingQuery(events, 'a').size).toBe(0);
    expect(eventCardIdsMatchingQuery(events, ' ').size).toBe(0);
  });

  it('returns nothing for an unmatched query', () => {
    if (events.length === 0) return;
    expect(eventCardIdsMatchingQuery(events, 'zzzznotanevent').size).toBe(0);
  });

  it('reaches cards that plain text search cannot', () => {
    if (!haveData() || events.length === 0) return;
    // The point of the feature: event membership is not in the card index, so these
    // cards are unreachable by Fuse no matter how it is weighted.
    const ids = eventCardIdsMatchingQuery(events, 'anniversary');
    const fuseIds = new Set(search('anniversary').map((c) => c.id));
    const onlyViaEvent = [...ids].filter((id) => !fuseIds.has(id));
    expect(onlyViaEvent.length).toBeGreaterThan(0);
  });
});
