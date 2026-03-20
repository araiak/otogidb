import { test, expect, request } from '@playwright/test'
import { BASE_URL, R2_BASE_URL } from '../utils/constants'

/**
 * Verifies that HTTP Cache-Control headers match the rules in public/_headers,
 * and that every URL referenced in manifest.json actually resolves.
 *
 * Complements data-hashed.spec.ts (which checks 200 + content-type) by
 * validating the caching contract specifically.
 *
 * Expected rules (from public/_headers):
 *   Hashed data files   → max-age=129600, immutable
 *   Delta files         → max-age=31536000, immutable
 *   Non-hashed data     → max-age=900, stale-while-revalidate=3600
 */
test.describe('Cache Header Validation', () => {
  test('manifest.json has short TTL + stale-while-revalidate', async () => {
    const ctx = await request.newContext()
    try {
      const res = await ctx.get(`${BASE_URL}/data/manifest.json`)

      expect(res.ok(), `manifest returned ${res.status()}`).toBeTruthy()

      const cc = res.headers()['cache-control'] ?? ''
      expect(cc, 'manifest should have max-age=900').toContain('max-age=900')
      expect(cc, 'manifest should have stale-while-revalidate').toContain('stale-while-revalidate')

      // Basic structure sanity
      const manifest = await res.json()
      expect(manifest.version, 'manifest.version missing').toBeTruthy()
      expect(manifest.files, 'manifest.files missing').toBeDefined()
      expect(manifest.delta, 'manifest.delta missing').toBeDefined()
      expect(manifest.delta.available_deltas, 'delta.available_deltas missing').toBeDefined()
    } finally {
      await ctx.dispose()
    }
  })

  test('hashed cards_index + cards_skeleton files have immutable cache', async () => {
    const ctx = await request.newContext()
    try {
      const manifest = await (await ctx.get(`${BASE_URL}/data/manifest.json`)).json()

      for (const [locale, paths] of Object.entries(
        manifest.files as Record<string, { cards_index?: string; cards_skeleton?: string }>
      )) {
        for (const [key, hashedPath] of Object.entries(paths)) {
          if (!hashedPath || key === 'cards_index_base') continue

          const res = await ctx.get(`${BASE_URL}${hashedPath}`)
          expect(res.ok(), `[${locale}] ${key} ${hashedPath} → ${res.status()}`).toBeTruthy()

          const cc = res.headers()['cache-control'] ?? ''
          expect(cc, `[${locale}] ${key} should be immutable`).toContain('immutable')
          // max-age should be at least 1 day
          const match = cc.match(/max-age=(\d+)/)
          const maxAge = match ? parseInt(match[1], 10) : 0
          expect(maxAge, `[${locale}] ${key} max-age too short`).toBeGreaterThanOrEqual(86400)
        }
      }
    } finally {
      await ctx.dispose()
    }
  })

  test('non-hashed data files have short TTL + stale-while-revalidate', async () => {
    const ctx = await request.newContext()
    try {
      const nonHashedFiles = [
        '/data/manifest.json',
        '/data/cards_index.json',
        '/data/cards.json',
        '/data/calendar.json',
      ]

      for (const file of nonHashedFiles) {
        const res = await ctx.get(`${BASE_URL}${file}`)
        expect(res.ok(), `${file} → ${res.status()}`).toBeTruthy()

        const cc = res.headers()['cache-control'] ?? ''
        expect(cc, `${file} should have max-age=900`).toContain('max-age=900')
        expect(cc, `${file} should have stale-while-revalidate`).toContain('stale-while-revalidate')
        // Should NOT be immutable — these files change with each release
        expect(cc, `${file} should NOT be immutable`).not.toContain('immutable')
      }
    } finally {
      await ctx.dispose()
    }
  })

  test('delta chain: all referenced files exist with immutable cache', async () => {
    const ctx = await request.newContext()
    try {
      const manifest = await (await ctx.get(`${BASE_URL}/data/manifest.json`)).json()

      const deltas: Array<{ file: string; from_version: string; to_version: string }> =
        manifest.delta?.available_deltas ?? []
      expect(deltas.length, 'no delta files in manifest').toBeGreaterThan(0)

      for (const delta of deltas) {
        const res = await ctx.get(`${BASE_URL}${delta.file}`)
        expect(
          res.ok(),
          `delta ${delta.from_version}→${delta.to_version} (${delta.file}) → ${res.status()}`
        ).toBeTruthy()

        const cc = res.headers()['cache-control'] ?? ''
        expect(cc, `${delta.file} should be immutable`).toContain('immutable')
        expect(cc, `${delta.file} should have max-age=31536000`).toContain('max-age=31536000')
      }
    } finally {
      await ctx.dispose()
    }
  })

  test('R2 availability: manifest links to a reachable versioned file', async () => {
    const ctx = await request.newContext()
    try {
      // Availability manifest — always fresh
      const manifestRes = await ctx.get(`${R2_BASE_URL}/availability/manifest.json`, {
        headers: { 'Cache-Control': 'no-cache' },
      })
      expect(manifestRes.ok(), `availability manifest → ${manifestRes.status()}`).toBeTruthy()

      const avManifest = await manifestRes.json()
      expect(avManifest.current_version, 'current_version missing').toBeTruthy()
      expect(avManifest.cards_count, 'cards_count missing').toBeGreaterThan(0)

      // Versioned data file — should be immutable
      const versionedUrl = `${R2_BASE_URL}/availability/${avManifest.current_version}.json`
      const versionedRes = await ctx.get(versionedUrl)
      expect(
        versionedRes.ok(),
        `versioned availability file ${avManifest.current_version}.json → ${versionedRes.status()}`
      ).toBeTruthy()

      // Sanity check structure — avData.version is the pipeline cards version,
      // which is different from the availability file ID in avManifest.current_version
      const avData = await versionedRes.json()
      expect(avData.version, 'versioned file missing version field').toBeTruthy()
      expect(avData.cards, 'versioned file missing cards').toBeDefined()
    } finally {
      await ctx.dispose()
    }
  })
})
