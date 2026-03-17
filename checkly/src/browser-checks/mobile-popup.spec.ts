import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Mobile Card Preview', () => {
  test('click opens modal on Galaxy S21', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.galaxyS21)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // MobileCardGrid renders card-grid-item below md breakpoint (768px)
    const cardItems = page.locator('.card-grid-item')
    await expect(cardItems.first()).toBeVisible({ timeout: 5000 })

    // Each card row has a preview button
    const previewButton = page.locator('button[aria-label="Preview card"]').first()
    await expect(previewButton).toBeVisible({ timeout: 5000 })

    await previewButton.click()

    // CardTable's mobile modal appears (fixed inset-0 z-50, md:hidden)
    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Modal header has card name
    await expect(modal.locator('h3').first()).toBeVisible()

    // Close the modal
    const closeButton = page.locator('button[aria-label="Close preview"]')
    await expect(closeButton).toBeVisible()
    await closeButton.click()

    await expect(modal).not.toBeVisible({ timeout: 3000 })
  })

  test('click opens modal on iPhone 14', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    const previewButton = page.locator('button[aria-label="Preview card"]').first()
    await expect(previewButton).toBeVisible({ timeout: 5000 })

    await previewButton.click()

    const modal = page.locator('.fixed.inset-0.z-50')
    await expect(modal).toBeVisible({ timeout: 5000 })

    await expect(modal.locator('h3').first()).toBeVisible()
  })
})
