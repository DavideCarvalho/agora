#!/usr/bin/env node
// Pulls each library's docs into content/docs/<slug>/.
//
//   node scripts/sync-docs.mjs            # sync all migrated libraries
//   node scripts/sync-docs.mjs filter     # sync one library (even if not migrated)
//   AGORA_DOCS_LOCAL=1 node scripts/...    # copy from sibling repos instead of cloning
//
// For each library it: fetches the docs subtree, nests repo-local root-absolute
// /docs links under /docs/<slug> (links that already name a library slug are left
// alone), and writes a library meta.json that makes it a sidebar "root" tab carrying the
// library's name + icon. The latest docs land in content/docs/<slug>/(latest)/ (a folder
// group, so URLs stay /docs/<slug>/...); each older major listed in the source's `versions`
// is pulled from its tag into content/docs/<slug>/<id>/ (/docs/<slug>/<id>/...).
// Run scripts/check-links.mjs afterwards to prove the result.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
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

/** Clone `ref` (a branch or a tag) of `src.repo`, checking out only `paths`. */
function sparseClone(src, ref, paths, tmp) {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const url = `https://github.com/${src.repo}.git`;
  execFileSync(
    'git',
    [
      '-c',
      'advice.detachedHead=false',
      'clone',
      '--depth',
      '1',
      '--filter=blob:none',
      '--sparse',
      '--branch',
      ref,
      url,
      tmp,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  execFileSync('git', ['-C', tmp, 'sparse-checkout', 'set', ...paths], {
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  return tmp;
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
  sparseClone(src, src.ref, [src.path, src.publicDir].filter(Boolean), tmp);
  if (!existsSync(join(tmp, src.path))) {
    throw new Error(
      `docs path "${src.path}" missing in ${src.repo}@${src.ref}`,
    );
  }
  return tmp;
}

/** Does the sibling checkout have `ref`? Fetches the tag from origin once if not. */
function localHasRef(base, ref) {
  const has = () => {
    try {
      execFileSync(
        'git',
        ['-C', base, 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
        { stdio: 'ignore' },
      );
      return true;
    } catch {
      return false;
    }
  };
  if (has()) return true;
  try {
    execFileSync(
      'git',
      [
        '-C',
        base,
        'fetch',
        '--quiet',
        'origin',
        `refs/tags/${ref}:refs/tags/${ref}`,
      ],
      { stdio: 'ignore' },
    );
  } catch {
    return false;
  }
  return has();
}

/**
 * An older version's repo root, as of its tag. Local mode reads the tag out of the sibling
 * checkout with `git archive` (the working tree stays on whatever branch it is on); when the
 * sibling is missing or does not know the tag it falls back to cloning, like the remote mode.
 */
function fetchVersion(src, version, tmp) {
  const path = version.path ?? src.path;
  const paths = [path, src.publicDir].filter(Boolean);
  const base = join(ROOT, '..', src.repoDir);
  if (USE_LOCAL && existsSync(base) && localHasRef(base, version.ref)) {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    const tar = execFileSync(
      'git',
      ['-C', base, 'archive', '--format=tar', version.ref, '--', ...paths],
      { maxBuffer: 1024 * 1024 * 512 },
    );
    execFileSync('tar', ['-x', '-C', tmp], { input: tar });
  } else {
    sparseClone(src, version.ref, paths, tmp);
  }
  if (!existsSync(join(tmp, path))) {
    throw new Error(
      `docs path "${path}" missing in ${src.repo}@${version.ref}`,
    );
  }
  return tmp;
}

// Every slug this site serves under /docs. Used to tell an already-aggregator-absolute
// link (`/docs/durable/stores/lucid`) apart from a repo-local one (`/docs/stores/lucid`).
// O authkit era um caso à parte aqui — uma cópia mantida à mão dentro deste repo, que
// derivou até ficar com 21 das 42 páginas da lib. Agora ele é sincronizado como as
// demais, então basta a lista de fontes.
const KNOWN_SLUGS = new Set(sources.map((s) => s.slug));

// `](/docs...` or `href="/docs...`, capturing the first path segment (if any) and the rest.
const DOCS_LINK = /(\]\(|href=")\/docs(\/[A-Za-z0-9._-]+)?(\/[^)"\s#?]*)?/g;

/**
 * Rewrite root-absolute /docs links so they nest under the library (and version) they belong to.
 *
 * `base` is where this copy of the docs is served: `/docs/<slug>` for the latest version,
 * `/docs/<slug>/<id>` for an older one. Idempotent and defensive:
 * - a repo-local link (`/docs/getting-started`) gets `base` prepended;
 * - a link already naming this library (`/docs/durable/stores/lucid`) stays inside this
 *   version, so an older version's pages never jump to the latest by accident;
 * - a link to another library (`/docs/context/...`) is left alone and so lands on that
 *   library's latest docs — the other library's major is unrelated to this one's.
 */
function rewriteLinks(content, slug, base) {
  return content.replace(DOCS_LINK, (match, open, first, rest) => {
    const segment = first?.slice(1);
    if (segment === slug) {
      // Already under `base` (always true for the latest): leave it.
      const target = `/docs/${slug}${rest ?? ''}`;
      if (target === base || target.startsWith(`${base}/`)) return match;
      return `${open}${base}${rest ?? ''}`;
    }
    if (segment && KNOWN_SLUGS.has(segment)) return match;
    return `${open}${base}${first ?? ''}${rest ?? ''}`;
  });
}

/** Point root-absolute asset refs at the vendored per-library public dir. */
function rewriteAssets(content, assetsBase) {
  return content.replaceAll('src="/', `src="${assetsBase}/`);
}

const GENERIC_TITLE =
  /^(documentation|docs|introduction|intro|overview|home|readme|getting started)$/i;
function normalizeIndexTitle(dir, src) {
  const file = join(dir, 'index.mdx');
  if (!existsSync(file)) return;
  const text = readFileSync(file, 'utf8');
  const fm = text.match(/^---\n[\s\S]*?\n---/);
  if (!fm) return;
  const title = fm[0].match(/^title:\s*(.+?)\s*$/m);
  if (!title || !GENERIC_TITLE.test(title[1].replace(/['"]/g, '').trim()))
    return;
  const patched = fm[0].replace(/^title:\s*.+$/m, `title: ${src.name}`);
  writeFileSync(file, text.replace(fm[0], patched));
}

/**
 * Plain-Markdown docs (`.md`, GitHub-style) often carry no frontmatter and start with a
 * `# Title` heading instead. The page schema needs a `title`, so lift that heading into
 * frontmatter (and drop it from the body, which the page header already renders).
 */
function frontmatterFromHeading(content) {
  if (/^---\n/.test(content)) return content;
  const heading = content.match(/^\s*#\s+(.+?)\s*#*\s*$/m);
  if (!heading || content.slice(0, heading.index).trim() !== '') return content;
  const body = content
    .slice(heading.index + heading[0].length)
    .replace(/^\n+/, '');
  return `---\ntitle: ${JSON.stringify(heading[1])}\n---\n\n${body}`;
}

/**
 * A docs folder without an index page would leave /docs/<slug> (the library tab's link) a 404.
 * Give it a generated landing page: the library's description and one card per top-level page.
 */
function writeFallbackIndex(dir, src, base) {
  if (existsSync(join(dir, 'index.mdx')) || existsSync(join(dir, 'index.md')))
    return;
  const cards = readdirSync(dir)
    .filter((name) => /\.mdx?$/.test(name))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
      const raw = fm.match(/^title:\s*(.+?)\s*$/m)?.[1] ?? name;
      const title = raw.startsWith('"')
        ? JSON.parse(raw)
        : raw.replace(/^'|'$/g, '');
      return `  <Card title={${JSON.stringify(title)}} href="${base}/${name.replace(/\.mdx?$/, '')}" />`;
    });
  const description = src.description
    ? `description: ${JSON.stringify(src.description)}\n`
    : '';
  writeFileSync(
    join(dir, 'index.mdx'),
    `---\ntitle: ${JSON.stringify(src.name)}\n${description}---\n\n<Cards>\n${cards.join('\n')}\n</Cards>\n`,
  );
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Make a version folder a `root: 'version'` folder titled with its label. Fumadocs scopes the
 * sidebar to the innermost root folder on the current page's path, so each version shows only
 * its own tree; components/version-select.tsx lists these folders as the version dropdown.
 */
function markVersionFolder(dir, label) {
  const file = join(dir, 'meta.json');
  const meta = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  writeJson(file, { ...meta, root: 'version', title: label });
}

// Folder group holding the latest version: Fumadocs drops `(…)` segments from URLs, so the
// latest docs keep their /docs/<slug>/... URLs while still being a folder of their own.
const LATEST_DIR = '(latest)';

/**
 * Copy one version of a library's docs into `dest`, rewriting links against `base`.
 * Returns the number of doc files and of /docs links seen.
 */
function installDocs({ src, from, dest, base, assetsBase }) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });
  cpSync(from, dest, { recursive: true });
  // Internal design specs / skill outputs live under docs/superpowers — never publish them
  // (their .md files have no frontmatter title and break the strict page-schema build).
  rmSync(join(dest, 'superpowers'), { recursive: true, force: true });
  // Internal plans (docs/plans/*.md) have no frontmatter title and break the
  // strict page-schema build too — never publish them.
  rmSync(join(dest, 'plans'), { recursive: true, force: true });
  // Dated design specs (docs/specs/*.md) are internal too.
  rmSync(join(dest, 'specs'), { recursive: true, force: true });

  let files = 0;
  let links = 0;
  for (const file of walk(dest)) {
    if (file.endsWith('.mdx') || file.endsWith('.md')) {
      const before = readFileSync(file, 'utf8');
      let after = rewriteLinks(before, src.slug, base);
      if (file.endsWith('.md')) after = frontmatterFromHeading(after);
      if (assetsBase) after = rewriteAssets(after, assetsBase);
      links += (before.match(/\]\(\/docs|href="\/docs/g) || []).length;
      if (after !== before) writeFileSync(file, after);
      files += 1;
    }
  }
  normalizeIndexTitle(dest, src);
  writeFallbackIndex(dest, src, base);
  return { files, links };
}

/** Copy a library's public dir (if any) to public/lib-assets/<...>; returns the file count. */
function installAssets(src, repo, segments) {
  if (!src.publicDir) return 0;
  const assetsFrom = join(repo, src.publicDir);
  if (!existsSync(assetsFrom)) return 0;
  const assetsDest = join(ROOT, 'public', 'lib-assets', ...segments);
  rmSync(assetsDest, { recursive: true, force: true });
  mkdirSync(assetsDest, { recursive: true });
  cpSync(assetsFrom, assetsDest, { recursive: true });
  return walk(assetsDest).length;
}

let totalFiles = 0;
let totalLinks = 0;

for (const src of selected) {
  const dest = join(ROOT, 'content', 'docs', src.slug);
  const tmp = join(ROOT, '.docs-tmp', src.slug);
  const versions = src.versions ?? [];
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dest, { recursive: true });

  // The library folder: a sidebar root tab carrying the library's name + icon. Its children
  // are the version folders — the latest in a `(latest)` group, older majors under `<id>/`.
  writeJson(join(dest, 'meta.json'), {
    root: true,
    title: src.name,
    description: src.description,
    icon: src.icon,
    pages: [LATEST_DIR, ...versions.map((v) => v.id)],
  });

  // Latest: the default branch, served at /docs/<slug>/...
  const repo = fetchRepo(src, tmp);
  const latest = installDocs({
    src,
    from: join(repo, src.path),
    dest: join(dest, LATEST_DIR),
    base: `/docs/${src.slug}`,
    assetsBase: src.publicDir && `/lib-assets/${src.slug}`,
  });
  const assets = installAssets(src, repo, [src.slug]);
  markVersionFolder(join(dest, LATEST_DIR), src.latestLabel ?? 'Latest');
  if (!USE_LOCAL) rmSync(tmp, { recursive: true, force: true });

  let files = latest.files;
  let links = latest.links;
  const labels = [src.latestLabel ?? 'latest'];

  // Older majors: each pinned to a tag, served at /docs/<slug>/<id>/...
  for (const version of versions) {
    const vtmp = join(ROOT, '.docs-tmp', `${src.slug}@${version.id}`);
    const vrepo = fetchVersion(src, version, vtmp);
    const result = installDocs({
      src,
      from: join(vrepo, version.path ?? src.path),
      dest: join(dest, version.id),
      base: `/docs/${src.slug}/${version.id}`,
      assetsBase: src.publicDir && `/lib-assets/${src.slug}/${version.id}`,
    });
    installAssets(src, vrepo, [src.slug, version.id]);
    markVersionFolder(join(dest, version.id), version.label);
    rmSync(vtmp, { recursive: true, force: true });
    files += result.files;
    links += result.links;
    labels.push(`${version.label}@${version.ref}`);
  }

  totalFiles += files;
  totalLinks += links;
  console.log(
    `✓ ${src.slug.padEnd(12)} ${files} docs, ${links} links${assets ? `, ${assets} assets` : ''}  (${USE_LOCAL ? 'local' : `${src.repo}@${src.ref}`}; ${labels.join(', ')})`,
  );
}

console.log(
  `\n✓ synced ${selected.length} librar${selected.length === 1 ? 'y' : 'ies'} · ${totalFiles} files · ${totalLinks} links`,
);
