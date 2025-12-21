import { defineConfig } from 'checkly'
import { Frequency } from 'checkly/constructs'
import { discordChannel } from './src/alert-channels'

export default defineConfig({
  projectName: 'OtogiDB Website Monitoring',
  logicalId: 'otogidb-monitoring',
  repoUrl: 'https://github.com/yourusername/otogidb',

  checks: {
    activated: true,
    muted: false,
    runtimeId: '2025.04',
    frequency: Frequency.EVERY_12H, // Default for browser checks (free tier optimization)
    locations: ['us-east-1', 'eu-west-1'],
    tags: ['otogidb', 'production'],
    alertChannels: [discordChannel], // Global alert channel for all checks
    checkMatch: 'src/**/*.check.ts',
    browserChecks: {
      frequency: Frequency.EVERY_12H,
      testMatch: 'src/browser-checks/**/*.spec.ts',
    },
  },

  cli: {
    runLocation: 'us-east-1',
    reporters: ['list'],
  },
})
