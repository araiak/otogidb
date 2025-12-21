import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Table', () => {
  test('loads card table with 850+ cards on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    // Navigate to homepage
    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for card table to load
    await page.waitForSelector(SELECTORS.cardTable, { timeout: TIMEOUTS.pageLoad })

    // Verify results count shows cards loaded
    const resultsText = await page.locator(SELECTORS.resultsCount).textContent()
    expect(resultsText).toBeTruthy()

    // Extract card count - "Showing X of Y cards"
    const match = resultsText?.match(/of (\d+) cards/)
    const cardCount = match ? parseInt(match[1], 10) : 0
    expect(cardCount).toBeGreaterThan(850)

    // Verify first row has content
    const firstRow = page.locator(SELECTORS.cardTableRow).first()
    await expect(firstRow).toBeVisible()

    // Verify table has images
    const firstImage = page.locator(`${SELECTORS.cardTable} img`).first()
    await expect(firstImage).toBeVisible()
  })

  test('loads card grid on mobile (iPhone 14)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // On mobile, should show card grid instead of table
    await page.waitForSelector(SELECTORS.mobileCardItem, { timeout: TIMEOUTS.pageLoad })

    // Verify at least some cards are visible
    const cardItems = page.locator(SELECTORS.mobileCardItem)
    await expect(cardItems.first()).toBeVisible()

    // Verify results count is visible
    const resultsText = await page.locator(SELECTORS.resultsCount).textContent()
    expect(resultsText).toMatch(/Showing \d+ of \d+ cards/)
  })

  test('loads card grid on mobile (Galaxy S21)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.galaxyS21)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for mobile card grid
    await page.waitForSelector(SELECTORS.mobileCardItem, { timeout: TIMEOUTS.pageLoad })

    // Verify cards are visible
    const cardItems = page.locator(SELECTORS.mobileCardItem)
    await expect(cardItems.first()).toBeVisible()
  })
})
