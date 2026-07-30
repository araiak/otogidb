/**
 * Upload built source maps to PostHog so error-tracking stack traces are readable.
 *
 * Runs after `astro build` (see the `build:deploy` npm script). posthog-cli injects a
 * chunk ID into each bundled JS file, uploads the matching map, then --delete-after
 * removes the .map files and strips the sourceMappingURL comments so dist/ ships clean.
 *
 * This must run in the same build that produces the deployed files — Cloudflare Pages
 * builds from source, so a chunk ID injected anywhere else would not match the bundle
 * users actually load.
 *
 * Credentials come from the environment (set these in the Pages dashboard):
 *   POSTHOG_CLI_API_KEY     personal API key with symbol-set write access
 *   POSTHOG_CLI_PROJECT_ID  numeric project ID
 * For local runs they can instead live in .env.local, which is gitignored — do NOT
 * use .env.production or .env.development, both of which are committed to the public
 * repo. When no credentials are found the upload is skipped rather than failed, so a
 * plain local `npm run build:deploy` still produces a usable dist/.
 *
 * Upload failures never fail the build: shipping the site matters more than readable
 * stack traces. Check the build log to confirm the upload actually happened.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// Invoke the CLI's node wrapper directly rather than the .bin shim — the shim needs a
// shell on Windows, this works the same everywhere.
const cli = require.resolve('@posthog/cli/run-posthog-cli.js');

function releaseVersion() {
  // Cloudflare Pages injects the commit SHA; fall back to git for local runs.
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return git.status === 0 ? git.stdout.trim() : 'local';
}

// Cloudflare supplies credentials as real env vars; locally they can sit in the
// gitignored .env.local, which the CLI reads via --dotenv-file. (Use that spelling,
// not --env-file: node's own --env-file flag would intercept it in the CLI's wrapper.)
const inEnv = process.env.POSTHOG_CLI_API_KEY && process.env.POSTHOG_CLI_PROJECT_ID;
const dotenvFile = ['.env.local', '.env'].find((f) => existsSync(f));

if (!inEnv && !dotenvFile) {
  console.warn(
    '[sourcemaps] No PostHog credentials (POSTHOG_CLI_API_KEY / POSTHOG_CLI_PROJECT_ID\n' +
      '[sourcemaps] in the environment, or a .env.local file) — skipping upload.\n' +
      '[sourcemaps] Source maps remain in dist/. Do not deploy this build as-is.'
  );
  process.exit(0);
}

const args = [
  cli,
  '--no-fail',
  ...(inEnv ? [] : ['--dotenv-file', dotenvFile]),
  'sourcemap',
  'process',
  '--directory',
  'dist',
  '--delete-after',
  '--release-name',
  'otogidb',
  '--release-version',
  releaseVersion(),
];

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });

if (result.status !== 0) {
  console.warn(`[sourcemaps] posthog-cli exited with ${result.status} — continuing anyway.`);
}

// --delete-after only removes maps the CLI paired with a JS chunk. Astro inlines the
// <script> blocks from .astro files into the HTML, so their maps have no chunk to pair
// with and survive. Sweep them up — otherwise they ship as publicly fetchable source.
const leftover = readdirSync('dist', { recursive: true, encoding: 'utf8' }).filter((f) =>
  f.endsWith('.map')
);

for (const file of leftover) {
  rmSync(join('dist', file));
}

if (leftover.length > 0) {
  console.log(`[sourcemaps] Removed ${leftover.length} unpaired source map(s) from dist/.`);
}
