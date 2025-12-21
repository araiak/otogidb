import { test, expect } from '@playwright/test'
import { BASE_URL, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Locale Switching', () => {
  test('Japanese locale loads correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/ja/`, { waitUntil: 'networkidle' })

    // Verify Japanese content loaded via lang attribute
    await expect(page.locator('html[lang="ja"]')).toBeAttached()

    // Verify page content loaded (table or card data)
    await page.waitForSelector('table.data-table, .card-grid-item', { timeout: TIMEOUTS.pageLoad })
  })

  test('Korean locale loads correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/ko/`, { waitUntil: 'networkidle' })

    // Verify Korean content loaded
    await expect(page.locator('html[lang="ko"]')).toBeAttached()
  })

  test('Chinese (Simplified) locale loads correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/zh-cn/`, { waitUntil: 'networkidle' })

    // Verify Chinese content loaded
    await expect(page.locator('html[lang="zh-cn"], html[lang="zh-CN"]')).toBeAttached()
  })

  test('Spanish locale loads correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/es/`, { waitUntil: 'networkidle' })

    // Verify Spanish content loaded
    await expect(page.locator('html[lang="es"]')).toBeAttached()
  })
})
