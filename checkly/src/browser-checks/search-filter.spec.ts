import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'
import { gotoAndWaitForCards } from '../utils/helpers'

test.describe('Search and Filter', () => {
  test('fuzzy search returns relevant results', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    const searchInput = page.locator('input[placeholder="Search cards..."]')

    // Get initial count
    const resultsCount = page.locator('text=/Showing \\d+ of \\d+ cards/')
    await expect(resultsCount).toBeVisible()
    const initialText = await resultsCount.textContent()
    const initialMatch = initialText?.match(/of (\d+) cards/)
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0

    // Search
    await searchInput.fill('Nue')
    await page.waitForTimeout(TIMEOUTS.debounce + 200)

    // Verify filtered results
    const filteredText = await resultsCount.textContent()
    const filteredMatch = filteredText?.match(/Showing (\d+)/)
    const showingCount = filteredMatch ? parseInt(filteredMatch[1], 10) : 0

    expect(showingCount).toBeGreaterThan(0)
    expect(showingCount).toBeLessThan(initialCount)
  })

  test('attribute filter works', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // FilterDropdown button shows placeholder "Attr" when nothing selected
    const attrFilter = page.locator('button:has-text("Attr")')
    await expect(attrFilter).toBeVisible({ timeout: 5000 })
    await attrFilter.click()

    // Select "Divina" from the open dropdown
    const divinaOption = page.locator('text=Divina').first()
    await divinaOption.click()

    await page.waitForTimeout(TIMEOUTS.debounce)

    // URL should update with attr= param
    expect(page.url()).toContain('attr=')

    // "Clear filters" button appears when a filter is active
    const clearButton = page.locator('button:has-text("Clear filters")')
    await expect(clearButton).toBeVisible()
  })

  test('combined search and filter', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await gotoAndWaitForCards(page, `${BASE_URL}/en/`)

    // Click rarity filter (placeholder "Rarity" when nothing selected)
    const rarityFilter = page.locator('button:has-text("Rarity")')
    await expect(rarityFilter).toBeVisible({ timeout: 5000 })
    await rarityFilter.click()

    const fiveStarOption = page.locator('text=/5|★★★★★/').first()
    await fiveStarOption.click()
    await page.waitForTimeout(TIMEOUTS.debounce)

    // Search
    const searchInput = page.locator('input[placeholder="Search cards..."]')
    await searchInput.fill('healer')
    await page.waitForTimeout(TIMEOUTS.debounce + 200)

    const resultsText = await page.locator('text=/Showing \\d+ of \\d+ cards/').textContent()
    expect(resultsText).toMatch(/Showing \d+ of \d+ cards/)
  })
})
