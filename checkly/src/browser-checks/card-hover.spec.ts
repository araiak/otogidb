import { test, expect, errors } from '@playwright/test'
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
    await cardLink.scrollIntoViewIfNeeded()

    // Retry hover up to 3 times to account for timing variability in headless Chromium:
    // FloatingPortal + React onMouseEnter state chain can miss on first hover under load.
    let popupVisible = false
    for (let attempt = 0; attempt < 3 && !popupVisible; attempt++) {
      // Give React time to process onMouseEnter → setState → FloatingPortal render
      try {
        await cardLink.hover()
        await page.waitForFunction(
          () => document.querySelector('.popup') !== null,
          { timeout: 3000 }
        )
        popupVisible = true
      } catch (e) {
        if (!(e instanceof errors.TimeoutError)) throw e
        // popup didn't appear within timeout - move mouse away and retry
        await page.mouse.move(0, 0)
        await page.waitForTimeout(100)
      }
    }
    if (!popupVisible) throw new Error('Hover popup never appeared after 3 attempts')

    // Wait for CardFloatingPopup to appear via FloatingPortal
    const popup = page.locator('.popup').first()
    await expect(popup).toBeVisible({ timeout: TIMEOUTS.networkIdle })

    // Verify stats are rendered in CardPreviewContent
    await expect(popup.locator('text=ATK')).toBeVisible()
    await expect(popup.locator('text=HP')).toBeVisible()
  })
})
