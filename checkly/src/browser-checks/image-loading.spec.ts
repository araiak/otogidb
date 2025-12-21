import { test, expect } from '@playwright/test'
import { BASE_URL, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Image Loading', () => {
  test('card detail images load correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Wait for images to load
    await page.waitForLoadState('networkidle')

    // Find the main card image (first img in .card container)
    const cardImage = page.locator('.card img').first()
    await expect(cardImage).toBeVisible()

    // Check image actually loaded (not broken)
    const naturalWidth = await cardImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)

    // Verify src contains expected domain (either cloudinary or placeholder)
    const imgSrc = await cardImage.getAttribute('src')
    expect(imgSrc).toBeTruthy()
    // The src should be a valid URL
    expect(imgSrc).toMatch(/^https?:\/\//)
  })

  test('table thumbnails load correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table
    await page.waitForSelector('table.data-table', { timeout: TIMEOUTS.pageLoad })

    // Find first image in table
    const tableImage = page.locator('table.data-table img').first()
    await expect(tableImage).toBeVisible()

    // Verify image loaded (naturalWidth > 0 means image loaded successfully)
    const naturalWidth = await tableImage.evaluate((img: HTMLImageElement) => img.naturalWidth)
    expect(naturalWidth).toBeGreaterThan(0)
  })
})
