import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Hover Popups', () => {
  test('desktop hover shows floating popup', async ({ page }) => {
    // Must use desktop viewport for hover to work (popup has hidden md:block)
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'domcontentloaded' })

    // Wait for table to load
    await page.waitForSelector('table.data-table tbody tr', { timeout: TIMEOUTS.pageLoad })

    // Find first card image in table (the image cell has hover behavior)
    const firstCardImage = page.locator('table.data-table tbody tr img').first()
    await expect(firstCardImage).toBeVisible()

    // Get the parent anchor element for hovering
    const cardLink = firstCardImage.locator('..')

    // Hover over the card image
    await cardLink.hover()

    // Wait for popup to appear (CardFloatingPopup renders via FloatingPortal)
    const popup = page.locator('.popup').first()
    await expect(popup).toBeVisible({ timeout: 5000 })

    // Verify popup has stat labels from CardPreviewContent
    await expect(popup.locator('text=ATK')).toBeVisible()
    await expect(popup.locator('text=HP')).toBeVisible()
  })
})
