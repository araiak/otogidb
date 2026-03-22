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

    // Retry hover up to 3 times to account for timing variability in headless Chromium.
    // Verify stats inside the same attempt while mouse is still on the card.
    let verified = false
    for (let attempt = 0; attempt < 3 && !verified; attempt++) {
      await cardLink.hover()
      const popup = page.locator('.popup').first()
      try {
        await expect(popup).toBeVisible({ timeout: 4000 })
        await expect(popup.locator('text=ATK')).toBeVisible({ timeout: 2000 })
        await expect(popup.locator('text=HP')).toBeVisible({ timeout: 2000 })
        verified = true
      } catch (e) {
        if (!(e instanceof errors.TimeoutError)) throw e
        await page.mouse.move(0, 0)
        await page.waitForTimeout(200)
      }
    }
    if (!verified) throw new Error('Hover popup stats never verified after 3 attempts')
  })
})
