import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Pagination', () => {
  test('table pagination works', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' })

    // Wait for table
    await page.waitForSelector(SELECTORS.cardTable, { timeout: TIMEOUTS.pageLoad })

    // Verify pagination is visible
    const pagination = page.locator(SELECTORS.pagination)
    await expect(pagination).toBeVisible()

    // Get current page text
    const paginationText = await pagination.textContent()
    expect(paginationText).toMatch(/Page 1 of \d+/)

    // Find and click next button
    const nextButton = page.locator(SELECTORS.paginationNext)
    if (await nextButton.isEnabled()) {
      await nextButton.click()

      // Wait for page change
      await page.waitForTimeout(TIMEOUTS.animation)

      // Verify page changed
      const newPaginationText = await page.locator(SELECTORS.pagination).textContent()
      expect(newPaginationText).toMatch(/Page 2 of \d+/)
    }
  })
})
