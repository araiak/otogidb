import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Search and Filter', () => {
  test('fuzzy search returns relevant results', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table
    await page.waitForSelector(SELECTORS.cardTable, { timeout: TIMEOUTS.pageLoad })

    // Get initial count
    const initialText = await page.locator(SELECTORS.resultsCount).textContent()
    const initialMatch = initialText?.match(/of (\d+) cards/)
    const initialCount = initialMatch ? parseInt(initialMatch[1], 10) : 0

    // Type in search box
    const searchInput = page.locator(SELECTORS.searchInput)
    await searchInput.fill('Nue')

    // Wait for debounce
    await page.waitForTimeout(TIMEOUTS.debounce + 200)

    // Verify results are filtered
    const filteredText = await page.locator(SELECTORS.resultsCount).textContent()
    const filteredMatch = filteredText?.match(/Showing (\d+)/)
    const showingCount = filteredMatch ? parseInt(filteredMatch[1], 10) : 0

    // Should show fewer results than total
    expect(showingCount).toBeGreaterThan(0)
    expect(showingCount).toBeLessThan(initialCount)
  })

  test('attribute filter works', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table
    await page.waitForSelector(SELECTORS.cardTable, { timeout: TIMEOUTS.pageLoad })

    // Click attribute filter dropdown
    const attrFilter = page.locator(SELECTORS.filterAttr)
    await attrFilter.click()

    // Select "Divina" from dropdown
    const divinaOption = page.locator('text=Divina').first()
    await divinaOption.click()

    // Wait for filtered results
    await page.waitForTimeout(TIMEOUTS.debounce)

    // Verify URL updated with filter
    expect(page.url()).toContain('attr=')

    // Verify clear filters button appears
    const clearButton = page.locator(SELECTORS.clearFilters)
    await expect(clearButton).toBeVisible()
  })

  test('combined search and filter', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/`, { waitUntil: 'networkidle' })

    // Wait for table
    await page.waitForSelector(SELECTORS.cardTable, { timeout: TIMEOUTS.pageLoad })

    // Apply rarity filter
    const rarityFilter = page.locator(SELECTORS.filterRarity)
    await rarityFilter.click()

    // Select 5-star
    const fiveStarOption = page.locator('text=/5|★★★★★/').first()
    await fiveStarOption.click()

    await page.waitForTimeout(TIMEOUTS.debounce)

    // Now search
    const searchInput = page.locator(SELECTORS.searchInput)
    await searchInput.fill('healer')

    await page.waitForTimeout(TIMEOUTS.debounce + 200)

    // Verify some results shown
    const resultsText = await page.locator(SELECTORS.resultsCount).textContent()
    expect(resultsText).toMatch(/Showing \d+ of \d+ cards/)
  })
})
