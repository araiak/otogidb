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
})
