import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Mobile Card Preview', () => {
  test('tap opens modal on Galaxy S21', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.galaxyS21)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for mobile card grid
    await page.waitForSelector(SELECTORS.mobileCardItem, { timeout: TIMEOUTS.pageLoad })

    // Find and tap the preview button (eye icon)
    const previewButton = page.locator(SELECTORS.mobilePreviewButton).first()
    await expect(previewButton).toBeVisible()
    await previewButton.tap()

    // Wait for modal to appear
    const modal = page.locator(SELECTORS.mobileModal)
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal has card content
    await expect(modal.locator('text=/ATK|HP/')).toBeVisible()

    // Find and tap close button
    const closeButton = modal.locator('button').first()
    await closeButton.tap()

    // Modal should be hidden
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })

  test('tap opens modal on iPhone 14', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for mobile card grid
    await page.waitForSelector(SELECTORS.mobileCardItem, { timeout: TIMEOUTS.pageLoad })

    // Find and tap the preview button
    const previewButton = page.locator(SELECTORS.mobilePreviewButton).first()
    await expect(previewButton).toBeVisible()
    await previewButton.tap()

    // Wait for modal to appear
    const modal = page.locator(SELECTORS.mobileModal)
    await expect(modal).toBeVisible({ timeout: 5000 })
  })
})
