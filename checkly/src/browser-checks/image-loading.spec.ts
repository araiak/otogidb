import { test, expect } from '@playwright/test'
import { BASE_URL, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Image Loading', () => {
  test('card images load from Cloudinary', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Wait for images to load
    await page.waitForLoadState('networkidle')

    // Find Cloudinary images
    const cloudinaryImages = page.locator('img[src*="cloudinary"]')
    const count = await cloudinaryImages.count()

    // Should have at least one Cloudinary image
    expect(count).toBeGreaterThan(0)

    // Verify first image is visible and loaded
    const firstImage = cloudinaryImages.first()
    await expect(firstImage).toBeVisible()

    // Check image actually loaded (not broken)
    const naturalWidth = await firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  })

  test('table thumbnails load correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table
    await page.waitForSelector('table.data-table', { timeout: TIMEOUTS.pageLoad })

    // Find first image in table
    const tableImage = page.locator('table.data-table img').first()
    await expect(tableImage).toBeVisible()

    // Verify image loaded
    const naturalWidth = await tableImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  })
})
