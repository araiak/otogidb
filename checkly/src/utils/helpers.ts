import { Page } from '@playwright/test'
import { TIMEOUTS } from './constants'

/**
 * Navigate to a page that loads cards_index.json client-side,
 * and wait for both the network response and the rendered count text.
 * Response listener is set up BEFORE navigation to avoid race condition.
 */
export async function gotoAndWaitForCards(page: Page, url: string): Promise<void> {
  const responsePromise = page.waitForResponse(
    r => r.url().includes('cards_index') && r.status() === 200,
    { timeout: TIMEOUTS.pageLoad }
  )
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await responsePromise
  await page.waitForSelector('text=/Showing \\d+ of \\d+ cards/', { timeout: 10000 })
}
