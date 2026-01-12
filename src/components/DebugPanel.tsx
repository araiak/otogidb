import { useState, useEffect } from 'react';
import { clearCache, getCacheInfo } from '../lib/cache';
import { fetchAvailabilityManifest, getAvailabilitySize } from '../lib/availability';

interface CacheEntry {
  key: string;
  version: string;
  hash: string;
  age: number;
}

interface AvailabilityInfo {
  version: string;
  lastUpdated: string;
  size: string;
  cardsCount: number;
}

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [status, setStatus] = useState<string>('');
  const [availabilityInfo, setAvailabilityInfo] = useState<AvailabilityInfo | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load cache info and availability when opened
  useEffect(() => {
    if (isOpen) {
      loadCacheInfo();
      loadAvailabilityInfo();
    }
  }, [isOpen]);

  const loadCacheInfo = async () => {
    try {
      const entries = await getCacheInfo();
      setCacheEntries(entries);
    } catch (error) {
      console.error('Failed to load cache info:', error);
    }
  };

  const loadAvailabilityInfo = async () => {
    try {
      setAvailabilityError(null);
      const manifest = await fetchAvailabilityManifest();
      if (manifest) {
        setAvailabilityInfo({
          version: manifest.current_version,
          lastUpdated: manifest.last_updated,
          size: getAvailabilitySize(manifest),
          cardsCount: manifest.cards_count,
        });
      } else {
        setAvailabilityError('No availability data on R2 (manifest not found)');
        setAvailabilityInfo(null);
      }
    } catch (error) {
      console.error('Failed to load availability info:', error);
      setAvailabilityError(`Error: ${error}`);
      setAvailabilityInfo(null);
    }
  };

  const handleClearJsonCache = async () => {
    try {
      setStatus('Clearing JSON cache...');
      await clearCache();
      setCacheEntries([]);
      setStatus('JSON cache cleared! Reload the page to fetch fresh data.');
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const handleClearBrowserCache = () => {
    setStatus('Clearing browser caches...');

    // Clear localStorage items related to our app
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('otogidb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage
    sessionStorage.clear();

    setStatus(`Cleared ${keysToRemove.length} localStorage items and sessionStorage. For images, do a hard refresh (Ctrl+Shift+R).`);
  };

  const handleClearAll = async () => {
    setStatus('Clearing all caches...');

    // Clear IndexedDB
    await clearCache();
    setCacheEntries([]);

    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('otogidb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear sessionStorage
    sessionStorage.clear();

    setStatus('All caches cleared! Reloading page...');

    // Force reload without cache
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleHardReload = () => {
    // Force reload bypassing cache
    window.location.href = window.location.href + (window.location.href.includes('?') ? '&' : '?') + '_cache=' + Date.now();
  };

  const formatAge = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-2 rounded-full opacity-20 hover:opacity-100 transition-opacity"
        style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
        title="Open Debug Panel (Ctrl+Shift+D)"
        suppressHydrationWarning
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" suppressHydrationWarning>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[90vw] rounded-lg shadow-xl border"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      suppressHydrationWarning>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-opacity-20"
          style={{ color: 'var(--color-text-secondary)' }}
          suppressHydrationWarning
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" suppressHydrationWarning>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Cache Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cache Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleClearJsonCache}
              className="btn-secondary text-xs py-2 px-3 rounded"
            >
              Clear JSON Cache
            </button>
            <button
              onClick={handleClearBrowserCache}
              className="btn-secondary text-xs py-2 px-3 rounded"
            >
              Clear Browser Cache
            </button>
            <button
              onClick={handleClearAll}
              className="btn-primary text-xs py-2 px-3 rounded"
            >
              Clear All & Reload
            </button>
            <button
              onClick={handleHardReload}
              className="btn-secondary text-xs py-2 px-3 rounded col-span-2"
            >
              Hard Reload (Bypass Cache)
            </button>
          </div>
        </div>

        {/* Status */}
        {status && (
          <div className="p-2 rounded text-xs" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
            {status}
          </div>
        )}

        {/* Cache Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>IndexedDB Cache</p>
            <button
              onClick={loadCacheInfo}
              className="text-xs underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Refresh
            </button>
          </div>

          {cacheEntries.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>No cached data</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {cacheEntries.map((entry, i) => (
                <div key={i} className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
                  <div className="truncate font-mono" style={{ color: 'var(--color-text)' }}>
                    {entry.key.replace('/data/', '')}
                  </div>
                  <div className="flex gap-2 mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Age: {formatAge(entry.age)}</span>
                    <span>Hash: {entry.hash.slice(0, 8)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* R2 Availability Data */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>R2 Availability Data</p>
            <button
              onClick={loadAvailabilityInfo}
              className="text-xs underline"
              style={{ color: 'var(--color-accent)' }}
            >
              Refresh
            </button>
          </div>

          {availabilityError ? (
            <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }}>{availabilityError}</p>
          ) : availabilityInfo ? (
            <div className="text-xs p-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span style={{ color: 'var(--color-text-secondary)' }}>Version:</span>
                <span className="font-mono" style={{ color: 'var(--color-text)' }}>{availabilityInfo.version.slice(0, 8)}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Last Updated:</span>
                <span style={{ color: 'var(--color-text)' }}>{availabilityInfo.lastUpdated ? new Date(availabilityInfo.lastUpdated).toLocaleString() : 'N/A'}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cards:</span>
                <span style={{ color: 'var(--color-text)' }}>{availabilityInfo.cardsCount}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>Size:</span>
                <span style={{ color: 'var(--color-text)' }}>{availabilityInfo.size}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
          )}
        </div>

        {/* Tips */}
        <div className="text-xs space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
          <p><strong>Tip:</strong> If images show "No Image", try:</p>
          <ol className="list-decimal list-inside space-y-0.5 pl-2">
            <li>Clear All & Reload above</li>
            <li>Hard refresh: Ctrl+Shift+R</li>
            <li>Check browser dev tools Network tab</li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        Press <kbd className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>Ctrl+Shift+D</kbd> to toggle
      </div>
    </div>
  );
}
