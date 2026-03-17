import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Pagination', () => {
  test('table pagination works', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Pagination renders "Page X of Y" text
    const pagination = page.locator('text=/Page \\d+ of \\d+/')
    await expect(pagination).toBeVisible({ timeout: 5000 })

    const paginationText = await pagination.textContent()
    expect(paginationText).toMatch(/Page 1 of \d+/)

    // Click next page
    const nextButton = page.locator(SELECTORS.paginationNext)
    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await page.waitForTimeout(TIMEOUTS.animation)

      const newText = await page.locator('text=/Page \\d+ of \\d+/').textContent()
      expect(newText).toMatch(/Page 2 of \d+/)
    }
  })
})
