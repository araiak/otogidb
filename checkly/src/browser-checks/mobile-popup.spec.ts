import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Mobile Card Preview', () => {
  test('click opens modal on Galaxy S21', async ({ page }) => {
    // Set viewport BEFORE navigation to ensure proper responsive rendering
    await page.setViewportSize(VIEWPORTS.galaxyS21)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for page to be fully loaded and React to hydrate
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    // Wait for either the mobile grid or pagination to appear (React rendered)
    await page.waitForSelector('.card-grid-item, [class*="Page"]', { timeout: TIMEOUTS.pageLoad })

    // At 360px width (below xs=480px), the mobile card grid should be visible
    // The preview button only appears in mobile layouts
    const previewButton = page.locator('button[aria-label="Preview card"]').first()

    // Check if preview button exists and is visible
    const buttonCount = await previewButton.count()
    if (buttonCount === 0) {
      // Mobile layout might not have rendered - check for card data
      const cardItems = page.locator('.card-grid-item')
      const itemCount = await cardItems.count()
      throw new Error(`Expected mobile preview buttons but found ${buttonCount}. Card items: ${itemCount}`)
    }

    await expect(previewButton).toBeVisible({ timeout: 10000 })

    // Click the preview button
    await previewButton.click()

    // Wait for modal backdrop
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal has card name in header (first h3 is the title)
    await expect(modal.locator('h3').first()).toBeVisible()

    // Find close button with aria-label
    const closeButton = page.locator('button[aria-label="Close preview"]')
    await expect(closeButton).toBeVisible()
    await closeButton.click()

    // Modal should be hidden
    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })

  test('click opens modal on iPhone 14', async ({ page }) => {
    // Set viewport BEFORE navigation
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for React to fully hydrate
    await page.waitForLoadState('domcontentloaded')
    await page.waitForLoadState('networkidle')

    // Wait for the card grid to render
    await page.waitForSelector('.card-grid-item, [class*="Page"]', { timeout: TIMEOUTS.pageLoad })

    // Find the preview button (only visible in mobile layouts below 768px)
    const previewButton = page.locator('button[aria-label="Preview card"]').first()
    await expect(previewButton).toBeVisible({ timeout: 10000 })

    // Click the preview button
    await previewButton.click()

    // Wait for modal to appear
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify modal content (first h3 is the card name)
    await expect(modal.locator('h3').first()).toBeVisible()
  })
})
