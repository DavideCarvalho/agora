#!/usr/bin/env node
// Fails the build when a root-absolute /docs link does not resolve to a real page.
//
//   node scripts/check-links.mjs
//
// Runs after scripts/sync-docs.mjs (see the `prebuild` script). It walks
// content/docs, derives the URL every page will be served at, and then checks
// every `](/docs...)` / `href="/docs..."` link found in that content against it.
// This is the guard against the link rewriting silently double-prefixing slugs.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'content', 'docs');

if (!existsSync(DOCS_DIR)) {
  console.error(`✖ ${relative(ROOT, DOCS_DIR)} not found — run the docs sync first`);
  process.exit(1);
}

/** Recursively list files under a directory. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const pages = walk(DOCS_DIR).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

/** The URL fumadocs will serve a content file at. */
function pageUrl(file) {
  const parts = relative(DOCS_DIR, file).split(sep);
  const last = parts.pop().replace(/\.mdx?$/, '');
  if (last !== 'index') parts.push(last);
  return `/docs${parts.length ? `/${parts.join('/')}` : ''}`;
}

const known = new Set(pages.map(pageUrl));

// `](/docs...)` or `href="/docs..."` — capture the target up to the closing delimiter.
const LINK = /(?:\]\(|href=")(\/docs[^)"\s]*)/g;

const broken = [];
let checked = 0;

for (const file of pages) {
  const text = readFileSync(file, 'utf8');
  for (const [, raw] of text.matchAll(LINK)) {
    checked += 1;
    // Drop the anchor / query, then the trailing slash.
    const target = raw.split('#')[0].split('?')[0].replace(/\/$/, '');
    if (!target || known.has(target)) continue;
    broken.push({ file: relative(ROOT, file), target: raw });
  }
}

if (broken.length > 0) {
  console.error(`\n✖ ${broken.length} broken internal link${broken.length === 1 ? '' : 's'}:\n`);
  for (const { file, target } of broken) console.error(`  ${file}  →  ${target}`);
  console.error(
    `\n  ${checked} /docs links checked against ${known.size} pages.` +
      '\n  Links inside a library repo may be written either repo-local (/docs/guide) or' +
      '\n  aggregator-absolute (/docs/<lib>/guide); both are accepted, missing pages are not.\n',
  );
  process.exit(1);
}

console.log(`✓ ${checked} internal /docs links resolve across ${known.size} pages`);
