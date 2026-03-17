import { test, expect } from '@playwright/test'
import { BASE_URL, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Image Loading', () => {
  test('card detail main image loads correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'domcontentloaded' })

    // Main card image is inside .card container, uses loading="eager"
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // Verify image actually loaded (not broken)
    const naturalWidth = await cardImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)

    // Verify src is a valid URL
    const imgSrc = await cardImage.getAttribute('src')
    expect(imgSrc).toMatch(/^https?:\/\//)
  })

  test('table thumbnails are present after data loads', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Desktop table is in hidden md:block wrapper
    const tableImage = page.locator('table.data-table img').first()
    await expect(tableImage).toBeVisible({ timeout: 5000 })

    // Verify a src is present (lazy images may not have naturalWidth > 0 before scroll)
    const imgSrc = await tableImage.getAttribute('src')
    expect(imgSrc).toBeTruthy()
  })
})
