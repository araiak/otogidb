import { describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import LocaleSwitcher from '../LocaleSwitcher';

// The pages are prerendered, so the first client render must match HTML built with no
// localStorage. Reading a stored locale during render caused React #418 on every page.
function renderWithStoredLocale(stored: string | null) {
  if (stored === null) {
    delete (globalThis as any).localStorage;
  } else {
    (globalThis as any).localStorage = { getItem: () => stored };
  }
  return renderToString(<LocaleSwitcher />);
}

afterEach(() => {
  delete (globalThis as any).localStorage;
});

describe('LocaleSwitcher', () => {
  it('renders the same markup regardless of stored locale', () => {
    const prerendered = renderWithStoredLocale(null);
    for (const locale of ['ja', 'ko', 'zh-cn', 'zh-tw', 'es']) {
      expect(renderWithStoredLocale(locale)).toBe(prerendered);
    }
  });

  it('prerenders EN', () => {
    expect(renderWithStoredLocale(null)).toContain('>EN<');
  });
});
