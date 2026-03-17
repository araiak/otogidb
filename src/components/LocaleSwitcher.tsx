import { useState, useEffect, useRef } from 'react';
import { SUPPORTED_LOCALES, LOCALE_NAMES, LOCALE_STORAGE_KEY, type SupportedLocale } from '../lib/i18n';

function getInitialLocale(): SupportedLocale {
  // Locale is stored in localStorage — URL is always /en/ and is not the source of truth
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
      return stored as SupportedLocale;
    }
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

export default function LocaleSwitcher() {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(getInitialLocale);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function handleSelect(locale: SupportedLocale) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // localStorage unavailable
    }
    setCurrentLocale(locale);
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent('otogidb-locale-change', { detail: { locale } })
    );
  }

  const displayCode = currentLocale.startsWith('zh-') ? 'ZH' : currentLocale.toUpperCase();

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="btn-secondary px-2 py-1 rounded-md text-xs font-medium uppercase touch-target"
        aria-label="Change language"
      >
        {displayCode}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 py-1 rounded-md shadow-lg z-50"
          style={{
            backgroundColor: 'var(--color-header)',
            border: '1px solid var(--color-border)',
            minWidth: '140px',
          }}
        >
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              onClick={() => handleSelect(locale)}
              className={`block w-full text-left px-3 py-1.5 text-sm hover:bg-white/10 ${locale === currentLocale ? 'font-medium' : ''}`}
              style={locale === currentLocale ? { color: 'var(--color-accent)' } : undefined}
            >
              {LOCALE_NAMES[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
