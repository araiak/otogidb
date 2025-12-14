/**
 * Theme management for light/dark mode
 */

export type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'otogidb-theme';

/**
 * Get current theme from localStorage or system preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_KEY) as Theme | null;
  if (stored) return stored;

  // Default to system preference
  return 'system';
}

/**
 * Get resolved theme (light or dark based on system preference if needed)
 * Default to dark if no system preference
 */
export function getResolvedTheme(): 'light' | 'dark' {
  const theme = getTheme();

  if (theme === 'system') {
    if (typeof window === 'undefined') return 'dark'; // SSR default to dark

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

    if (prefersDark.matches) return 'dark';
    if (prefersLight.matches) return 'light';

    // No system preference, default to dark
    return 'dark';
  }

  return theme;
}

/**
 * Set theme and update document
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;

  let resolved: 'light' | 'dark';

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

    if (prefersDark.matches) {
      resolved = 'dark';
    } else if (prefersLight.matches) {
      resolved = 'light';
    } else {
      resolved = 'dark'; // Default to dark
    }
  } else {
    resolved = theme;
  }

  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Toggle between light and dark
 */
export function toggleTheme(): void {
  const current = getResolvedTheme();
  setTheme(current === 'light' ? 'dark' : 'light');
}

/**
 * Initialize theme on page load
 * Call this in a script tag before content renders
 */
export function initTheme(): void {
  const theme = getTheme();
  applyTheme(theme);

  // Listen for system preference changes
  if (theme === 'system') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (_e) => {
      if (getTheme() === 'system') {
        applyTheme('system');
      }
    });
  }
}

/**
 * Script to inject in head for preventing flash of wrong theme
 * Priority: localStorage override > system preference > dark (default)
 */
export const themeInitScript = `
  (function() {
    const stored = localStorage.getItem('${THEME_KEY}');
    let resolved;

    if (stored && stored !== 'system') {
      // User has explicitly chosen a theme
      resolved = stored;
    } else {
      // Check system preference, default to dark if no preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)');

      if (prefersDark.matches) {
        resolved = 'dark';
      } else if (prefersLight.matches) {
        resolved = 'light';
      } else {
        // No system preference, default to dark
        resolved = 'dark';
      }
    }

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  })();
`;
