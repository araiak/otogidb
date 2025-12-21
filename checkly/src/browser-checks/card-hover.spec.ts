import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Hover Popups', () => {
  test('desktop hover shows floating popup', async ({ page }) => {
    // Must use desktop viewport for hover to work (popup has hidden md:block)
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table to load
    await page.waitForSelector('table.data-table tbody tr', { timeout: TIMEOUTS.pageLoad })

    // Find first card image in table (the image cell has hover behavior)
    const firstCardImage = page.locator('table.data-table tbody tr img').first()
    await expect(firstCardImage).toBeVisible()

    // Get the parent anchor element for hovering
    const cardLink = firstCardImage.locator('..')

    // Hover over the card image
    await cardLink.hover()

    // Wait for popup animation
    await page.waitForTimeout(TIMEOUTS.animation + 200)

    // Check for popup with .popup class (hidden md:block means visible on desktop)
    const popup = page.locator('.popup')
    await expect(popup).toBeVisible({ timeout: 5000 })

    // Verify popup has content (ATK/HP stats in the preview)
    const popupContent = await popup.textContent()
    expect(popupContent).toMatch(/ATK|HP/i)
  })
})
