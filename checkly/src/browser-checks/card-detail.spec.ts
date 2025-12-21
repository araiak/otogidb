import { test, expect } from '@playwright/test'
import { BASE_URL, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Detail Page', () => {
  test('card detail page renders correctly on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Verify main card image loads (in the .card container)
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // Verify image loaded (not broken)
    const naturalWidth = await cardImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)

    // Verify stats section exists (desktop shows "Max ATK")
    await expect(page.locator('text=Max ATK')).toBeVisible()
    await expect(page.locator('text=Max HP')).toBeVisible()

    // Verify skill section header
    await expect(page.locator('h2:has-text("Skill")')).toBeVisible()

    // Verify JSON-LD structured data exists
    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd).toBeAttached()
  })

  test('card detail page on mobile (iPhone 14)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Verify main card image loads
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // On mobile, quick stats show ATK/HP (not "Max ATK")
    await expect(page.locator('text=ATK').first()).toBeVisible()
    await expect(page.locator('text=HP').first()).toBeVisible()
  })
})
