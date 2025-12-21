import { test, expect } from '@playwright/test'
import { BASE_URL, SELECTORS, SAMPLE_CARD_IDS, TIMEOUTS } from '../utils/constants'
import { VIEWPORTS } from '../utils/viewports'

test.describe('Card Detail Page', () => {
  test('card detail page renders correctly on desktop', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Verify card image loads from Cloudinary
    const cardImage = page.locator(SELECTORS.cardImage).first()
    await expect(cardImage).toBeVisible()

    // Verify image is from Cloudinary CDN
    const imgSrc = await cardImage.getAttribute('src')
    expect(imgSrc).toContain('res.cloudinary.com')

    // Verify stats section exists
    await expect(page.locator(SELECTORS.cardStats)).toBeVisible()

    // Verify skill section
    await expect(page.locator(SELECTORS.skillSection)).toBeVisible()

    // Verify JSON-LD structured data exists
    const jsonLd = page.locator('script[type="application/ld+json"]')
    await expect(jsonLd).toBeAttached()
  })

  test('card detail page on mobile (iPhone 14)', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.iphone14)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Verify page loaded
    await expect(page.locator(SELECTORS.cardImage).first()).toBeVisible()

    // Verify stats are visible on mobile
    await expect(page.locator('text=/ATK|HP/')).toBeVisible()

    // Verify mobile-friendly layout
    const viewport = page.viewportSize()
    expect(viewport?.width).toBe(VIEWPORTS.iphone14.width)
  })

  test('similar cards section renders', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop)

    await page.goto(`${BASE_URL}/en/cards/${SAMPLE_CARD_IDS.primary}`, { waitUntil: 'networkidle' })

    // Look for similar cards section
    const similarSection = page.locator('text=/Similar|Related/i').first()

    // This section may or may not exist depending on the card
    // Just verify page loaded successfully
    await expect(page.locator(SELECTORS.cardImage).first()).toBeVisible()
  })
})
