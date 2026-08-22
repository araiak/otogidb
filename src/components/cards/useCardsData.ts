import { useEffect, useState } from 'react';
import type { Card } from '../../types/card';
import { getCardsData } from '../../lib/cards';
import {
  SUPPORTED_LOCALES,
  LOCALE_STORAGE_KEY,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from '../../lib/i18n';

const EMPTY_CARDS: Record<string, Card> = {};

function readStoredLocale(): SupportedLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  } catch { /* localStorage unavailable */ }
  return DEFAULT_LOCALE;
}

/**
 * Resolve the card database for the reader's current locale.
 *
 * Card data is deliberately NOT passed to islands as props: Astro serializes
 * island props into the page, so handing each island the full database inlined
 * it into every HTML file once per island (~6MB a copy). Instead each island
 * reads the locale index through getCardsData(), which serves it from memory /
 * IndexedDB with delta updates and dedupes concurrent callers — so every island
 * on a page shares a single load, and a reader who already has the index cached
 * pays no network at all.
 *
 * `initialCards` is an optional fallback for call sites that still supply their
 * own data; the fetched locale index takes over once it resolves.
 */
export function useCardsData(initialCards?: Record<string, Card>): {
  cards: Record<string, Card>;
  locale: SupportedLocale;
} {
  const [locale, setLocale] = useState<SupportedLocale>(readStoredLocale);
  const [fetchedCards, setFetchedCards] = useState<Record<string, Card> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCardsData({ locale })
      .then((data) => {
        if (!cancelled) setFetchedCards(data.cards as Record<string, Card>);
      })
      .catch(() => {
        /* keep whatever data we already have rather than blanking the UI */
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    const handleLocaleChange = (e: Event) => {
      const next = (e as CustomEvent<{ locale: SupportedLocale }>).detail?.locale;
      if (next && SUPPORTED_LOCALES.includes(next)) setLocale(next);
    };
    window.addEventListener('otogidb-locale-change', handleLocaleChange);
    return () => window.removeEventListener('otogidb-locale-change', handleLocaleChange);
  }, []);

  return { cards: fetchedCards ?? initialCards ?? EMPTY_CARDS, locale };
}
