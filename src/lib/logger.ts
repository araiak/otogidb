/**
 * Structured logger for otogidb.
 *
 * PostHog captures console calls (log/warn/error) and indexes object arguments
 * as queryable properties. Every call here automatically attaches runtime context
 * (locale, data version, network state, etc.) so PostHog logs are self-contained
 * without any manual posthog.capture() calls.
 *
 * Usage:
 *   logger.error('Cards', 'Failed to fetch cards index', { locale, error: String(err) })
 *   logger.warn('Delta', 'Manifest fetch failed', { status: response.status })
 *   logger.info('Availability', 'Merged cards', { updated: 42, total: 917 })
 */

type Level = 'error' | 'warn' | 'info'

interface LogEntry {
  level: Level
  module: string
  message: string
  timestamp: string
  // Runtime context — populated from browser APIs when available
  locale: string | null
  dataVersion: string | null
  htmlLang: string | null
  online: boolean | null
  swActive: boolean | null
  url: string | null
  // Caller-provided fields merged in
  [key: string]: unknown
}

function getContext(): Omit<LogEntry, 'level' | 'module' | 'message' | 'timestamp'> {
  if (typeof window === 'undefined') {
    return { locale: null, dataVersion: null, htmlLang: null, online: null, swActive: null, url: null }
  }
  try {
    return {
      locale: localStorage.getItem('otogidb-locale'),
      dataVersion: (window as unknown as Record<string, string>)['OTOGIDB_DATA_VERSION'] ?? null,
      htmlLang: document.documentElement.lang || null,
      online: navigator.onLine,
      swActive: !!(navigator.serviceWorker?.controller),
      url: window.location.pathname,
    }
  } catch {
    return { locale: null, dataVersion: null, htmlLang: null, online: null, swActive: null, url: null }
  }
}

function log(level: Level, module: string, message: string, extra?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    module,
    message,
    timestamp: new Date().toISOString(),
    ...getContext(),
    ...extra,
  } as LogEntry

  // Pass message as first arg (human-readable in DevTools) and the full
  // structured object as second (PostHog indexes object properties).
  const method = level === 'info' ? 'log' : level
  console[method](`[${module}] ${message}`, entry)
}

export const logger = {
  error: (module: string, message: string, extra?: Record<string, unknown>) =>
    log('error', module, message, extra),
  warn: (module: string, message: string, extra?: Record<string, unknown>) =>
    log('warn', module, message, extra),
  info: (module: string, message: string, extra?: Record<string, unknown>) =>
    log('info', module, message, extra),
}
