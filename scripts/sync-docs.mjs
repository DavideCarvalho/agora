#!/usr/bin/env node
// Pulls each library's docs into content/docs/<slug>/.
//
//   node scripts/sync-docs.mjs            # sync all migrated libraries
//   node scripts/sync-docs.mjs filter     # sync one library (even if not migrated)
//   AGORA_DOCS_LOCAL=1 node scripts/...    # copy from sibling repos instead of cloning
//
// For each library it: fetches the docs subtree, rewrites root-absolute /docs
// links to be nested under /docs/<slug>, and turns the top-level meta.json into a
// sidebar "root" tab carrying the library's name + icon.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sources } from './docs-sources.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const USE_LOCAL = process.env.AGORA_DOCS_LOCAL === '1';
const only = process.argv[2];

const selected = only
  ? sources.filter((s) => s.slug === only)
  : sources.filter((s) => s.migrated);

if (only && selected.length === 0) {
  console.error(`✖ no source configured for "${only}"`);
  process.exit(1);
}
if (selected.length === 0) {
  console.log('· no migrated libraries to sync yet');
  process.exit(0);
}

/** Recursively list files under a directory. */
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

/** The library repo root: a sibling checkout (local mode) or a sparse clone. */
function fetchRepo(src, tmp) {
  if (USE_LOCAL) {
    const base = join(ROOT, '..', src.repoDir);
    if (!existsSync(join(base, src.path))) {
      throw new Error(`local source not found: ${join(base, src.path)}`);
    }
    return base;
  }
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const url = `https://github.com/${src.repo}.git`;
  execFileSync(
    'git',
    ['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', src.ref, url, tmp],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  const checkout = [src.path, src.publicDir].filter(Boolean);
  execFileSync('git', ['-C', tmp, 'sparse-checkout', 'set', ...checkout], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  if (!existsSync(join(tmp, src.path))) {
    throw new Error(`docs path "${src.path}" missing in ${src.repo}@${src.ref}`);
  }
  return tmp;
}

/** Rewrite root-absolute /docs links so they nest under the library slug. */
function rewriteLinks(content, slug) {
  return content
    .replaceAll('](/docs', `](/docs/${slug}`)
    .replaceAll('href="/docs', `href="/docs/${slug}`);
}

/** Point root-absolute asset refs at the vendored per-library public dir. */
function rewriteAssets(content, slug) {
  return content.replaceAll('src="/', `src="/lib-assets/${slug}/`);
}

const GENERIC_TITLE = /^(documentation|docs|introduction|intro|overview|home|readme|getting started)$/i;
function normalizeIndexTitle(dir, src) {
  const file = join(dir, 'index.mdx');
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  const fm = text.match(/^---\n[\s\S]*?\n---/);
  if (!fm) return;
  const title = fm[0].match(/^title:\s*(.+?)\s*$/m);
  if (!title || !GENERIC_TITLE.test(title[1].replace(/['"]/g, '').trim())) return;
  const patched = fm[0].replace(/^title:\s*.+$/m, `title: ${src.name}`);
  writeFileSync(file, text.replace(fm[0], patched));
}

/** Promote the top-level meta.json to a sidebar root tab with name + icon. */
function transformRootMeta(file, src) {
  const meta = JSON.parse(readFileSync(file, 'utf8'));
  const next = {
    ...meta,
    root: true,
    title: src.name,
    description: src.description ?? meta.description,
    icon: src.icon,
  };
  writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
}

let totalFiles = 0;
let totalLinks = 0;

for (const src of selected) {
  const dest = join(ROOT, 'content', 'docs', src.slug);
  const tmp = join(ROOT, '.docs-tmp', src.slug);

  const repo = fetchRepo(src, tmp);
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(join(repo, src.path), dest, { recursive: true });

  let assets = 0;
  if (src.publicDir) {
    const assetsFrom = join(repo, src.publicDir);
    if (existsSync(assetsFrom)) {
      const assetsDest = join(ROOT, 'public', 'lib-assets', src.slug);
      rmSync(assetsDest, { recursive: true, force: true });
      mkdirSync(assetsDest, { recursive: true });
      cpSync(assetsFrom, assetsDest, { recursive: true });
      assets = walk(assetsDest).length;
    }
  }

  if (!USE_LOCAL) rmSync(tmp, { recursive: true, force: true });

  let files = 0;
  let links = 0;
  for (const file of walk(dest)) {
    if (file.endsWith('.mdx') || file.endsWith('.md')) {
      const before = readFileSync(file, 'utf8');
      let after = rewriteLinks(before, src.slug);
      if (src.publicDir) after = rewriteAssets(after, src.slug);
      links += (before.match(/\]\(\/docs|href="\/docs/g) || []).length;
      if (after !== before) writeFileSync(file, after);
      files += 1;
    }
  }

  normalizeIndexTitle(dest, src);
  const rootMeta = join(dest, 'meta.json');
  if (existsSync(rootMeta)) transformRootMeta(rootMeta, src);

  totalFiles += files;
  totalLinks += links;
  console.log(
    `✓ ${src.slug.padEnd(12)} ${files} docs, ${links} links${assets ? `, ${assets} assets` : ''}  (${USE_LOCAL ? 'local' : `${src.repo}@${src.ref}`})`,
  );
}

console.log(
  `\n✓ synced ${selected.length} librar${selected.length === 1 ? 'y' : 'ies'} · ${totalFiles} files · ${totalLinks} links`,
);
