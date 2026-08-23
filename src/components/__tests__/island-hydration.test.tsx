import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import LocaleSwitcher from '../LocaleSwitcher';
import CardReferencePopups from '../blog/CardReferencePopups';
import GlossaryPopups from '../blog/GlossaryPopups';
import ListBlock from '../blog/ListBlock';
import FilteredCardsBlock from '../blog/FilteredCardsBlock';
import TeamBlock from '../blog/TeamBlock';

// Every page is prerendered in English at build time, then hydrated in the
// reader's stored locale. So an island's FIRST client render must match HTML
// produced with no localStorage at all — a locale read during render (rather
// than in an effect) makes them disagree and React throws #418 on every page.
// That is exactly what LocaleSwitcher did until 97fa569; this pins the whole
// island set so the next one gets caught here instead of in PostHog.
const ISLANDS: Array<[string, () => React.ReactElement]> = [
  ['LocaleSwitcher', () => <LocaleSwitcher />],
  ['CardReferencePopups', () => <CardReferencePopups />],
  ['GlossaryPopups', () => <GlossaryPopups glossary={{}} />],
  ['ListBlock', () => <ListBlock />],
  ['FilteredCardsBlock', () => <FilteredCardsBlock />],
  ['TeamBlock', () => <TeamBlock />],
];

function renderWithStoredLocale(el: () => React.ReactElement, stored: string | null) {
  if (stored === null) {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  } else {
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: () => stored };
  }
  return renderToString(el());
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
  vi.restoreAllMocks();
});

describe('island hydration', () => {
  it.each(ISLANDS)('%s prerenders identically for any stored locale', (_name, el) => {
    const prerendered = renderWithStoredLocale(el, null);
    for (const locale of ['ja', 'ko', 'zh-cn', 'zh-tw', 'es']) {
      expect(renderWithStoredLocale(el, locale)).toBe(prerendered);
    }
  });
});
