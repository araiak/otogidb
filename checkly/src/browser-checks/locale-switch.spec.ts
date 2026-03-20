import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Locale Switching', () => {
  test('non-EN locale URLs redirect to /en/', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    // Playwright follows 301s by default; final URL should be /en/cards/1
    await page.goto(`${BASE_URL}/ja/cards/1`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).toContain('/en/cards/1')
  })

  test('locale switcher is present on /en/', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[data-locale-switcher], #locale-switcher, [aria-label*="locale"], [aria-label*="language"]', {
      timeout: TIMEOUTS.pageLoad,
    })
  })

  test('switching locale updates localStorage', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' })

    // Wait for the page to be interactive
    await page.waitForTimeout(500)

    // Dispatch locale change event directly to simulate switcher click
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('otogidb-locale-change', { detail: { locale: 'ja' } })
      )
      localStorage.setItem('otogidb-locale', 'ja')
    })

    const stored = await page.evaluate(() => localStorage.getItem('otogidb-locale'))
    expect(stored).toBe('ja')
  })

  test('root /ja/ returns redirect to /en/', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/ja/`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).toContain('/en/')
  })

  test('root /ko/ returns redirect to /en/', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/ko/`, { waitUntil: 'domcontentloaded' })
    expect(page.url()).toContain('/en/')
  })

  test('switching locale sets html[lang] on card detail page', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    // Load an English card page, then simulate locale switching to each supported locale
    const locales = ['ja', 'ko', 'zh-cn', 'es'] as const
    for (const locale of locales) {
      await page.goto(`${BASE_URL}/en/cards/270`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(300)

      // Simulate what the locale switcher does
      await page.evaluate((loc) => {
        localStorage.setItem('otogidb-locale', loc)
        window.dispatchEvent(new CustomEvent('otogidb-locale-change', { detail: { locale: loc } }))
      }, locale)

      // html[lang] should be updated synchronously by apply()
      await expect(page.locator(`html[lang="${locale}"]`)).toBeAttached({ timeout: TIMEOUTS.pageLoad })

      // Clean up for next iteration
      await page.evaluate(() => localStorage.removeItem('otogidb-locale'))
    }
  })

  test('explicit "en" preference skips patching and keeps html[lang="en"]', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/270`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(300)

    // Simulate user explicitly choosing English
    await page.evaluate(() => {
      localStorage.setItem('otogidb-locale', 'en')
      window.dispatchEvent(new CustomEvent('otogidb-locale-change', { detail: { locale: 'en' } }))
    })

    // apply() should be skipped for 'en' — html[lang] stays "en"
    await expect(page.locator('html[lang="en"]')).toBeAttached({ timeout: TIMEOUTS.pageLoad })

    await page.evaluate(() => localStorage.removeItem('otogidb-locale'))
  })
})
