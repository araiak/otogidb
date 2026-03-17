import { test, expect, request } from '@playwright/test'
import { BASE_URL } from '../utils/constants'

/**
 * Verify that the hashed data files referenced in the manifest actually exist.
 * The API monitors check /data/cards_index.json (non-hashed fallback), which passes
 * even if the hashed URL the browser fetches is a 404.
 */
test.describe('Hashed Data Files', () => {
  test('manifest hashed URLs are reachable for all locales', async () => {
    const ctx = await request.newContext()

    // Fetch the manifest
    const manifestRes = await ctx.get(`${BASE_URL}/data/manifest.json`)
    expect(manifestRes.ok(), `manifest returned ${manifestRes.status()}`).toBeTruthy()
    const manifest = await manifestRes.json()

    expect(manifest.files, 'manifest missing files').toBeDefined()

    // Check every locale's hashed cards_index URL
    for (const [locale, paths] of Object.entries(manifest.files as Record<string, { cards_index: string }>)) {
      const hashedPath = paths.cards_index
      expect(hashedPath, `${locale} missing cards_index path`).toBeTruthy()

      const res = await ctx.get(`${BASE_URL}${hashedPath}`)
      expect(
        res.ok(),
        `[${locale}] hashed cards_index ${hashedPath} returned ${res.status()}`
      ).toBeTruthy()
      expect(
        res.headers()['content-type'],
        `[${locale}] wrong content-type`
      ).toContain('application/json')
    }

    await ctx.dispose()
  })
})
