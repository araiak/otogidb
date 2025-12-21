import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Hover Popups', () => {
  test('desktop hover shows floating popup', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table to load
    await page.waitForSelector(SELECTORS.cardTableRow, { timeout: TIMEOUTS.pageLoad })

    // Find first card link in table
    const firstCardLink = page.locator(`${SELECTORS.cardTable} a[href^="/en/cards/"]`).first()
    await expect(firstCardLink).toBeVisible()

    // Hover over the card link
    await firstCardLink.hover()

    // Wait for popup to appear
    await page.waitForTimeout(TIMEOUTS.animation)
    const popup = page.locator(SELECTORS.popup)

    // Popup should be visible (hidden on touch devices, visible on desktop)
    await expect(popup).toBeVisible({ timeout: 5000 })

    // Verify popup has card stats content
    await expect(popup.locator('text=/ATK|HP|Max ATK/')).toBeVisible()
  })
})
