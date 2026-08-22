#!/usr/bin/env node
/**
 * Build-time HTML size budget.
 *
 * Cloudflare Pages refuses to deploy any file over 25 MiB, and it enforces that
 * at upload time — after a full build, and long before the post-deploy
 * validators in scripts/validate-deployment/ ever get to run. A regression that
 * inlines data into pages therefore only surfaces as a failed deploy.
 *
 * This runs against dist/ as part of `build:deploy` so the same regression
 * fails locally and in CI instead. The budget is deliberately far below the
 * hard limit: a static page has no business being megabytes of HTML, and the
 * common cause is serializing a dataset into Astro island props.
 */
import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const DIST_DIR = 'dist';
const MIB = 1024 * 1024;

// Hard fail: page is broken/bloated, and well before Cloudflare's 25 MiB wall.
const FAIL_BYTES = 2 * MIB;
// Warn: worth a look before it grows into a failure.
const WARN_BYTES = 512 * 1024;

async function* walkHtml(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkHtml(path);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      yield path;
    }
  }
}

function formatSize(bytes) {
  return bytes >= MIB
    ? `${(bytes / MIB).toFixed(1)} MiB`
    : `${Math.round(bytes / 1024)} KiB`;
}

const oversized = [];
const warnings = [];
let count = 0;

for await (const path of walkHtml(DIST_DIR)) {
  const { size } = await stat(path);
  count++;
  if (size >= FAIL_BYTES) {
    oversized.push({ path: relative(DIST_DIR, path), size });
  } else if (size >= WARN_BYTES) {
    warnings.push({ path: relative(DIST_DIR, path), size });
  }
}

if (count === 0) {
  console.error(`[html-size] No HTML found in ${DIST_DIR}/ — did the build run?`);
  process.exit(1);
}

const bySizeDesc = (a, b) => b.size - a.size;

for (const { path, size } of warnings.sort(bySizeDesc).slice(0, 10)) {
  console.warn(`[html-size] warning: ${path} is ${formatSize(size)}`);
}

if (oversized.length > 0) {
  console.error(
    `\n[html-size] ${oversized.length} page(s) over the ${formatSize(FAIL_BYTES)} budget:\n`
  );
  for (const { path, size } of oversized.sort(bySizeDesc)) {
    console.error(`  ${formatSize(size).padStart(9)}  ${path}`);
  }
  console.error(
    '\nA static page this large almost always means a dataset was serialized into\n' +
    'the HTML. The usual cause is passing card/skill data to a client:load island —\n' +
    'Astro inlines island props into every page that renders them. Load the data\n' +
    'through getCardsData() instead, which serves the locale index from cache.\n'
  );
  process.exit(1);
}

console.log(`[html-size] OK — ${count} page(s), all under ${formatSize(FAIL_BYTES)}.`);
