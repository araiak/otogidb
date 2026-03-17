import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Card Table', () => {
  test('loads card table with 850+ cards on desktop @critical', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Desktop table is in hidden md:block wrapper - verify it's present
    await page.waitForSelector(SELECTORS.cardTable, { timeout: 5000 })

    // Verify results count
    const resultsCount = page.locator('text=/Showing \\d+ of \\d+ cards/')
    await expect(resultsCount).toBeVisible({ timeout: 5000 })

    const resultsText = await resultsCount.textContent()
    const match = resultsText?.match(/of (\d+) cards/)
    const cardCount = match ? parseInt(match[1], 10) : 0
    expect(cardCount).toBeGreaterThan(850)

    // Verify first row has content
    const firstRow = page.locator(SELECTORS.cardTableRow).first()
    await expect(firstRow).toBeVisible()
  })

  test('loads card grid on mobile (iPhone 14)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Mobile grid (xs:hidden md:hidden) is visible below md breakpoint
    const cardItems = page.locator(SELECTORS.mobileCardItem)
    await expect(cardItems.first()).toBeVisible({ timeout: 5000 })

    // Verify results count visible
    const resultsCount = page.locator('text=/Showing \\d+ of \\d+ cards/')
    await expect(resultsCount).toBeVisible()
  })

  test('loads card grid on mobile (Galaxy S21)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.galaxyS21)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    const cardItems = page.locator(SELECTORS.mobileCardItem)
    await expect(cardItems.first()).toBeVisible({ timeout: 5000 })
  })
})
