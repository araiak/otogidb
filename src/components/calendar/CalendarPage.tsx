import { useState, useEffect } from 'react';
import { getCardsData, getSkillsData } from '../../lib/cards';
import type { CardLocale } from '../../lib/cards';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../lib/i18n';
import type { Card } from '../../types/card';
import EventCalendar from './EventCalendar';
import CardPopups from '../cards/CardPopups';

interface CalendarPageProps {
  data: any;
}

function detectLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en';
  const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
  if (pathMatch && SUPPORTED_LOCALES.includes(pathMatch[1] as SupportedLocale)) {
    return pathMatch[1] as SupportedLocale;
  }
  try {
    const stored = localStorage.getItem('otogidb-locale');
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  } catch { /* localStorage unavailable */ }
  return 'en';
}

/**
 * Client-side wrapper that loads locale-appropriate card data
 * for both EventCalendar and CardPopups.
 */
export default function CalendarPage({ data }: CalendarPageProps) {
  const [cards, setCards] = useState<Record<string, Card>>({});
  const [skills, setSkills] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const locale = detectLocale();
    async function loadData() {
      try {
        const [cardsResult, skillsResult] = await Promise.all([
          getCardsData({ locale: locale as CardLocale }),
          getSkillsData(),
        ]);
        setCards(cardsResult.cards);
        setSkills(skillsResult.skills || {});
      } catch (err) {
        console.error('[CalendarPage] Failed to load card data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <EventCalendar data={data} cards={loading ? undefined : cards} />
      {!loading && Object.keys(cards).length > 0 && (
        <CardPopups cards={cards} skills={skills} />
      )}
    </>
  );
}
