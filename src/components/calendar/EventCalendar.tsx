import { useState, useEffect } from 'react';
import { getAndroidImageWithFallback } from '../../lib/images';
import { SUPPORTED_LOCALES, type SupportedLocale } from '../../lib/i18n';
import type { Card } from '../../types/card';

// ============================================================================
// Types
// ============================================================================

interface CardRef {
  id: string;
  name?: string;
}

interface CalendarEvent {
  type: 'conquest';
  event_id: string;
  name?: string;
  start: string;
  end: string;
  half?: string;
  kill?: string;
  boss_card?: CardRef;
}

interface Banner {
  type: 'featured_banner';
  banner_id: string;
  start: string;
  end: string;
  cards: CardRef[];
  pity_step?: number;
  group_id?: string;
}

interface Exchange {
  type: 'event_exchange' | 'permanent_exchange';
  exchange_id: string;
  start?: string;
  end?: string;
  currency: string;
  price: number;
  price_add?: number;
  limit: number;
  card?: CardRef;
}

interface DailyDungeon {
  type: 'daily_dungeon';
  dungeon_id: string;
  battle_id: string;
  name?: string;
  weekdays: number[];
  time_start: string;
  time_end: string;
  energy_cost: number;
  rewards?: string;
  drop_cards?: CardRef[];
}

interface CalendarData {
  generated_at: string;
  events: CalendarEvent[];
  banners: Banner[];
  exchanges: Exchange[];
  daily_dungeons: DailyDungeon[];
}

interface Props {
  data: CalendarData;
  cards?: Record<string, Card>;
}

// ============================================================================
// Helpers
// ============================================================================

const WEEKDAY_NAMES: Record<number, string> = {
  1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun',
};

function formatDate(isoStr: string | undefined): string {
  if (!isoStr) return '\u2014';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatDateFull(isoStr: string | undefined): string {
  if (!isoStr) return '\u2014';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  });
}

function getTimeRemaining(targetStr: string): string {
  const now = Date.now();
  const target = new Date(targetStr).getTime();
  const diff = target - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

function isActive(start: string | undefined, end: string | undefined): boolean {
  const now = Date.now();
  const s = start ? new Date(start).getTime() : 0;
  const e = end ? new Date(end).getTime() : Infinity;
  return now >= s && now < e;
}

function isUpcoming(start: string | undefined): boolean {
  if (!start) return false;
  return Date.now() < new Date(start).getTime();
}

const CURRENCY_NAMES: Record<string, string> = {
  gApple: 'Mochi',
  coin: 'Coin',
  pvpPt: 'PvP Points',
  ticket: 'Ticket',
};

function formatCurrency(code: string): string {
  return CURRENCY_NAMES[code] || code;
}

function parseRewards(rf: string): string {
  // Parse "coin[200]" format
  const match = rf.match(/^(\w+)\[(\d+)\]$/);
  if (match) return `${match[2]} ${formatCurrency(match[1])}`;
  return rf;
}

function getCardImage(cardRef: CardRef, cards?: Record<string, Card>): string | null {
  if (!cards) return null;
  const fullCard = cards[cardRef.id];
  if (!fullCard) return null;
  const url = getAndroidImageWithFallback(fullCard);
  // getAndroidImageWithFallback returns placeholder if no image; check for that
  if (url.includes('placeholder')) return null;
  return url;
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ start, end }: { start?: string; end?: string }) {
  if (isActive(start, end)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        Active
      </span>
    );
  }
  if (isUpcoming(start)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
      Ended
    </span>
  );
}

function Countdown({ targetDate, label }: { targetDate: string; label: string }) {
  const [remaining, setRemaining] = useState(getTimeRemaining(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(getTimeRemaining(targetDate));
    }, 60_000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (remaining === 'Ended') return null;

  return (
    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
      {label} {remaining}
    </span>
  );
}

function CardBadge({ card, locale = 'en', cards }: { card: CardRef; locale?: SupportedLocale; cards?: Record<string, Card> }) {
  const displayName = cards?.[card.id]?.name || card.name || `#${card.id}`;
  return (
    <a
      href={`/${locale}/cards/${card.id}`}
      data-card-id={card.id}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors"
      style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-accent)' }}
    >
      {displayName}
    </a>
  );
}

function CardCircle({ card, cards, locale = 'en', size = 'md' }: { card: CardRef; cards?: Record<string, Card>; locale?: SupportedLocale; size?: 'sm' | 'md' | 'lg' }) {
  const imgUrl = getCardImage(card, cards);
  if (!imgUrl) return null;
  const displayName = cards?.[card.id]?.name || card.name || '';
  const sizeClass = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-14 h-14' : 'w-10 h-10';
  return (
    <a href={`/${locale}/cards/${card.id}`} data-card-id={card.id} className="flex-shrink-0">
      <img
        src={imgUrl}
        alt={displayName}
        className={`${sizeClass} rounded-full object-cover`}
        loading="lazy"
      />
    </a>
  );
}

function DateRange({ start, end }: { start?: string; end?: string }) {
  return (
    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
      {formatDate(start)} {'\u2014'} {formatDate(end)}
    </span>
  );
}

// ============================================================================
// Section components
// ============================================================================

function EventSection({ events, cards, locale }: { events: CalendarEvent[]; cards?: Record<string, Card>; locale: SupportedLocale }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>Conquest Events</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
          {events.length}
        </span>
      </h2>
      <div className="space-y-3">
        {events.map((event) => (
          <div key={event.event_id} className="card p-4">
            <div className="flex items-start gap-3">
              {event.boss_card && (
                <CardCircle card={event.boss_card} cards={cards} locale={locale} size="lg" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="font-semibold">
                      {event.name || `Event #${event.event_id}`}
                    </div>
                    <DateRange start={event.start} end={event.end} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge start={event.start} end={event.end} />
                    {isActive(event.start, event.end) && event.end && (
                      <Countdown targetDate={event.end} label="Ends in" />
                    )}
                    {isUpcoming(event.start) && (
                      <Countdown targetDate={event.start} label="Starts in" />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {event.half && (
                    <span>Half: {formatDate(event.half)}</span>
                  )}
                  {event.kill && (
                    <span>Archive: {formatDate(event.kill)}</span>
                  )}
                  {event.boss_card && (
                    <span>Boss: <CardBadge card={event.boss_card} locale={locale} cards={cards} /></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BannerSection({ banners, cards, locale }: { banners: Banner[]; cards?: Record<string, Card>; locale: SupportedLocale }) {
  if (banners.length === 0) return null;

  // Group by group_id when available
  const grouped = banners.reduce<Record<string, Banner[]>>((acc, b) => {
    const key = b.group_id || b.banner_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>Featured Banners</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
          {banners.length}
        </span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(grouped).map(([groupKey, group]) => (
          <div key={groupKey} className="card p-4">
            {group.map((banner, idx) => (
              <div key={banner.banner_id} className={idx > 0 ? 'mt-3 pt-3 border-t' : ''} style={idx > 0 ? { borderColor: 'var(--color-border)' } : undefined}>
                <div className="flex items-start gap-3 mb-2">
                  <div className="flex flex-wrap gap-1 flex-shrink-0">
                    {banner.cards.slice(0, 3).map((card) => (
                      <CardCircle key={card.id} card={card} cards={cards} locale={locale} size="md" />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {banner.cards.map((card) => (
                        <CardBadge key={card.id} card={card} locale={locale} cards={cards} />
                      ))}
                    </div>
                    <DateRange start={banner.start} end={banner.end} />
                    {banner.pity_step && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Pity: {banner.pity_step} pulls
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge start={banner.start} end={banner.end} />
                    {isActive(banner.start, banner.end) && banner.end && (
                      <Countdown targetDate={banner.end} label="Ends in" />
                    )}
                    {isUpcoming(banner.start) && (
                      <Countdown targetDate={banner.start} label="Starts in" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExchangeSection({ exchanges, cards, locale }: { exchanges: Exchange[]; cards?: Record<string, Card>; locale: SupportedLocale }) {
  // Only show timed (event) exchanges, not permanent shop items
  const timed = exchanges
    .filter((e) => e.type === 'event_exchange')
    .sort((a, b) => {
      const aStart = a.start ? new Date(a.start).getTime() : 0;
      const bStart = b.start ? new Date(b.start).getTime() : 0;
      return aStart - bStart;
    });
  if (timed.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>Exchange Shop</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
          {timed.length}
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {timed.map((exchange) => (
          <div key={exchange.exchange_id} className="card p-4">
            <div className="flex items-start gap-3 mb-1">
              {exchange.card && (
                <CardCircle card={exchange.card} cards={cards} locale={locale} size="md" />
              )}
              <div className="flex-1 min-w-0">
                {exchange.card && <CardBadge card={exchange.card} locale={locale} cards={cards} />}
                <div className="mt-1">
                  <DateRange start={exchange.start} end={exchange.end} />
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <StatusBadge start={exchange.start} end={exchange.end} />
                {isActive(exchange.start, exchange.end) && exchange.end && (
                  <Countdown targetDate={exchange.end} label="Ends in" />
                )}
                {isUpcoming(exchange.start) && (
                  <Countdown targetDate={exchange.start!} label="Starts in" />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{exchange.price} {formatCurrency(exchange.currency)}</span>
              {exchange.price_add ? <span>(+{exchange.price_add}/ea)</span> : null}
              {exchange.limit > 0 && <span>Limit: {exchange.limit}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DungeonSection({ dungeons, cards, locale }: { dungeons: DailyDungeon[]; cards?: Record<string, Card>; locale: SupportedLocale }) {
  // Filter out "all day" dungeons (no time_start)
  const timed = dungeons.filter((d) => !!d.time_start);
  if (timed.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span>Daily Dungeons</span>
        <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
          {timed.length}
        </span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: 'var(--color-text-secondary)' }}>
              <th className="pb-2 pr-4 font-medium">Dungeon</th>
              <th className="pb-2 pr-4 font-medium">Days</th>
              <th className="pb-2 pr-4 font-medium">Time</th>
              <th className="pb-2 pr-4 font-medium">Energy</th>
              <th className="pb-2 font-medium">Drop Cards</th>
            </tr>
          </thead>
          <tbody>
            {timed.map((dungeon) => (
              <tr key={dungeon.dungeon_id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td className="py-2 pr-4">{dungeon.name || `#${dungeon.dungeon_id}`}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-1">
                    {dungeon.weekdays.map((d) => (
                      <span key={d} className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                        {WEEKDAY_NAMES[d] || d}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-2 pr-4">{dungeon.time_start}{'\u2013'}{dungeon.time_end}</td>
                <td className="py-2 pr-4">{dungeon.energy_cost}</td>
                <td className="py-2">
                  {dungeon.drop_cards && dungeon.drop_cards.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {dungeon.drop_cards.map((card) => {
                        const imgUrl = getCardImage(card, cards);
                        const name = cards?.[card.id]?.name || card.name || `#${card.id}`;
                        return imgUrl ? (
                          <a key={card.id} href={`/${locale}/cards/${card.id}`} data-card-id={card.id} className="flex-shrink-0" title={name}>
                            <img src={imgUrl} alt={name} className="w-7 h-7 rounded-full object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <CardBadge key={card.id} card={card} locale={locale} cards={cards} />
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{'\u2014'}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function EventCalendar({ data, cards }: Props) {
  const [, setTick] = useState(0);
  const [locale, setLocale] = useState<SupportedLocale>('en');

  useEffect(() => {
    // Detect locale from URL path (same pattern as CardHoverProvider)
    const pathMatch = window.location.pathname.match(/^\/([a-z]{2}(?:-[a-z]{2})?)\//);
    if (pathMatch && SUPPORTED_LOCALES.includes(pathMatch[1] as SupportedLocale)) {
      setLocale(pathMatch[1] as SupportedLocale);
      return;
    }
    try {
      const stored = localStorage.getItem('otogidb-locale');
      if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
        setLocale(stored as SupportedLocale);
      }
    } catch {}
  }, []);

  // Re-render every minute for countdown updates
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  const generatedDate = data.generated_at ? formatDateFull(data.generated_at) : 'Unknown';

  return (
    <div>
      <EventSection events={data.events} cards={cards} locale={locale} />
      <BannerSection banners={data.banners} cards={cards} locale={locale} />
      <ExchangeSection exchanges={data.exchanges} cards={cards} locale={locale} />
      <DungeonSection dungeons={data.daily_dungeons} cards={cards} locale={locale} />

      <div className="text-xs mt-8" style={{ color: 'var(--color-text-secondary)' }}>
        Data generated: {generatedDate} UTC. All times in UTC.
      </div>
    </div>
  );
}
