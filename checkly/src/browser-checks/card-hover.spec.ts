import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Card Hover Popups', () => {
  test('desktop hover shows floating popup', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Desktop table is inside hidden md:block wrapper - find first card thumbnail
    const firstCardImage = page.locator('table.data-table tbody tr img').first()
    await expect(firstCardImage).toBeVisible({ timeout: TIMEOUTS.pageLoad })

    // Hover over the parent anchor (ImageCell wraps img in <a> with onMouseEnter)
    const cardLink = firstCardImage.locator('..')
    await cardLink.hover()

    // Wait for CardFloatingPopup to appear via FloatingPortal
    const popup = page.locator('.popup').first()
    await expect(popup).toBeVisible({ timeout: 5000 })

    // Verify stats are rendered in CardPreviewContent
    await expect(popup.locator('text=ATK')).toBeVisible()
    await expect(popup.locator('text=HP')).toBeVisible()
  })
})
