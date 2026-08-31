#!/usr/bin/env node
// Fails the build when a root-absolute /docs link does not resolve to a real page — or points at a
// heading that page does not have.
//
//   node scripts/check-links.mjs [--strict]
//
// Without `--strict` it reports and exits 0. Pass `--strict` once a site's own
// libraries are clean, so a new broken link fails the build instead of scrolling past.
//
// Runs after scripts/sync-docs.mjs (see the `prebuild` script). It walks
// content/docs, derives the URL every page will be served at, and then checks
// every `](/docs...)` / `href="/docs..."` link found in that content against it.
// This is the guard against the link rewriting silently double-prefixing slugs.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = join(ROOT, 'content', 'docs');

if (!existsSync(DOCS_DIR)) {
  console.error(
    `✖ ${relative(ROOT, DOCS_DIR)} not found — run the docs sync first`,
  );
  process.exit(1);
}

/** Recursively list files under a directory. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const pages = walk(DOCS_DIR).filter(
  (f) => f.endsWith('.mdx') || f.endsWith('.md'),
);

// Frontmatter that does not parse fails the Next build with a js-yaml stack and no
// filename, so catch the one mistake that actually happens: an unquoted value holding
// a colon-space, which YAML reads as a nested mapping. Always fatal — the build would
// die on it anyway, and dying here says which file.
const badFrontmatter = [];
for (const file of pages) {
  const fm = /^---\n([\s\S]*?)\n---/.exec(readFileSync(file, 'utf8'));
  if (!fm) continue;
  for (const line of fm[1].split('\n')) {
    const kv = /^([A-Za-z_][\w-]*):\s+(.*)$/.exec(line);
    if (!kv || /^["'[{]/.test(kv[2]) || !/:\s/.test(kv[2])) continue;
    badFrontmatter.push({ file: relative(ROOT, file), key: kv[1] });
  }
}

if (badFrontmatter.length > 0) {
  console.error(
    `\n✖ ${badFrontmatter.length} frontmatter value${badFrontmatter.length === 1 ? '' : 's'} YAML cannot parse:\n`,
  );
  for (const { file, key } of badFrontmatter) {
    console.error(
      `  ${file}  →  \`${key}:\` holds an unquoted ": " — wrap the value in quotes, or use a dash`,
    );
  }
  console.error('');
  process.exit(1);
}

/** The URL fumadocs will serve a content file at. */
function pageUrl(file) {
  const parts = relative(DOCS_DIR, file).split(sep);
  const last = parts.pop().replace(/\.mdx?$/, '');
  if (last !== 'index') parts.push(last);
  return `/docs${parts.length ? `/${parts.join('/')}` : ''}`;
}

const known = new Set(pages.map(pageUrl));

/** The id fumadocs gives a heading. An explicit `## Title [#custom-id]` wins outright; otherwise
 *  github-slugger's rules, which notably do NOT collapse the runs of hyphens a dropped character
 *  leaves behind, so "A — B" becomes "a--b". */
function headingSlug(text) {
  const explicit = /\[#([^\]]+)\]\s*$/.exec(text);
  if (explicit) return explicit[1];
  return text
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s/g, '-');
}

/** Every heading id a page will expose, keyed by the URL it is served at. */
const anchors = new Map(
  pages.map((file) => [
    pageUrl(file),
    new Set(
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line) => /^#{2,6}\s+(.*)$/.exec(line))
        .filter(Boolean)
        .map((m) => headingSlug(m[1])),
    ),
  ]),
);

// `](/docs...)` or `href="/docs..."` — capture the target up to the closing delimiter.
const LINK = /(?:\]\(|href=")(\/docs[^)"\s]*)/g;

const STRICT = process.argv.includes('--strict');

const broken = [];
const staleAnchors = [];
let checked = 0;

for (const file of pages) {
  const text = readFileSync(file, 'utf8');
  for (const [, raw] of text.matchAll(LINK)) {
    checked += 1;
    // Split off the anchor / query, then the trailing slash.
    const [path, anchor] = raw.split('?')[0].split('#');
    const target = path.replace(/\/$/, '');
    if (!target) continue;
    if (!known.has(target)) {
      broken.push({ file: relative(ROOT, file), target: raw });
      continue;
    }
    // The page resolves — but the heading it points at may not, in which case the link lands at the
    // top of the right page and silently loses the reader. Reported, not fatal: a stale anchor is a
    // navigation annoyance, and most of them live in a library repo this build only mirrors, so
    // failing here would let one library's typo block every library's docs.
    if (anchor && !anchors.get(target).has(anchor)) {
      staleAnchors.push({ file: relative(ROOT, file), target: raw });
    }
  }
}

if (staleAnchors.length > 0) {
  console.warn(
    `\n⚠ ${staleAnchors.length} link${staleAnchors.length === 1 ? '' : 's'} point at a heading that no longer exists:\n`,
  );
  for (const { file, target } of staleAnchors)
    console.warn(`  ${file}  →  ${target}`);
  console.warn(
    '\n  The page resolves, so the reader lands at its top instead of the section.\n',
  );
}

if (broken.length > 0) {
  const mark = STRICT ? '✖' : '⚠';
  console.error(
    `\n${mark} ${broken.length} broken internal link${broken.length === 1 ? '' : 's'}:\n`,
  );
  for (const { file, target, reason } of broken) {
    console.error(`  ${file}  →  ${target}${reason ? `  (${reason})` : ''}`);
  }
  console.error(
    `\n  ${checked} /docs links checked against ${known.size} pages.` +
      '\n  Links inside a library repo may be written either repo-local (/docs/guide) or' +
      '\n  aggregator-absolute (/docs/<lib>/guide); both are accepted, missing pages are not.' +
      (STRICT
        ? '\n'
        : '\n  Reporting only — pass --strict to make this fail the build.\n'),
  );
  if (STRICT) process.exit(1);
}

if (broken.length === 0) {
  console.log(
    `✓ ${checked} internal /docs links resolve across ${known.size} pages` +
      (staleAnchors.length
        ? ` (${staleAnchors.length} with a stale anchor, listed above)`
        : ''),
  );
}
