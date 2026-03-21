import { test, expect } from '@playwright/test'
import { BASE_URL, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Detail Page', () => {
  test('card detail page renders correctly on desktop @critical', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'domcontentloaded' })

    // Verify main card image loads (in the .card container)
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // Verify image loaded (not broken)
    const naturalWidth = await cardImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)

    // Verify stats section exists (desktop shows "ATK (MLB)" / "HP (MLB)")
    await expect(page.locator('text=ATK (MLB)')).toBeVisible()
    await expect(page.locator('text=HP (MLB)')).toBeVisible()
    await expect(page.locator('text=/LB0:/')).toBeVisible()

    // Verify skill section header
    await expect(page.locator('h2:has-text("Skill")')).toBeVisible()

    // Verify JSON-LD structured data exists
    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd).toBeAttached()
  })

  test('card detail page on mobile (iPhone 14)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'domcontentloaded' })

    // Verify main card image loads
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // On mobile, quick stats show ATK (MLB) / HP (MLB)
    await expect(page.locator('text=ATK').first()).toBeVisible()
    await expect(page.locator('text=HP').first()).toBeVisible()
  })
})
