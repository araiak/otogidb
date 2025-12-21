import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './src/browser-checks',
  timeout: 60000,
  retries: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'playwright-results.json' }],
  ],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
})
