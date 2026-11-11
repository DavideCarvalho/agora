import type * as PageTree from 'fumadocs-core/page-tree';
import { docsRoute } from './shared';

// Per-library docs versions, read off the page tree that scripts/sync-docs.mjs lays out:
//
//   content/docs/<slug>/meta.json      root: true        — the library (sidebar tab)
//   content/docs/<slug>/(latest)/      root: 'version'   — latest major, /docs/<slug>/...
//   content/docs/<slug>/<id>/          root: 'version'   — older major, /docs/<slug>/<id>/...
//
// Version folders are typed root folders, so Fumadocs scopes the sidebar to the version the
// reader is on; these helpers give the version dropdown and the "older version" banner what
// they need. Pure functions over the serialisable tree, so they run on server and client.

export const VERSION_ROOT = 'version';
export const LATEST_DIR = '(latest)';

export interface DocsVersion {
  /** the version folder in the page tree */
  folder: PageTree.Folder;
  /** dropdown label, e.g. `1.x` */
  label: string;
  /** the URL segment (`v0`), or null for the latest */
  id: string | null;
  latest: boolean;
  /** URL prefix every page of this version lives under, e.g. `/docs/durable/v0` */
  prefix: string;
}

export interface LibVersions {
  /** the library's root folder */
  folder: PageTree.Folder;
  slug: string;
  name: string;
  /** latest first, then older majors in meta.json order */
  versions: DocsVersion[];
}

function folderPath(folder: PageTree.Folder): string | undefined {
  return folder.$ref?.folder;
}

function isVersionFolder(node: PageTree.Node): node is PageTree.Folder {
  return node.type === 'folder' && node.root === VERSION_ROOT;
}

/** The versions of one library folder (empty when it is not versioned). */
export function getLibVersions(lib: PageTree.Folder): LibVersions | undefined {
  const path = folderPath(lib);
  if (!path) return;
  const versions = lib.children.filter(isVersionFolder).flatMap((folder) => {
    const segments = folderPath(folder)?.split('/') ?? [];
    const last = segments.at(-1);
    if (!last) return [];
    const latest = last === LATEST_DIR;
    return [
      {
        folder,
        label: typeof folder.name === 'string' ? folder.name : last,
        id: latest ? null : last,
        latest,
        prefix: [
          docsRoute,
          ...segments.filter((s) => !/^\(.+\)$/.test(s)),
        ].join('/'),
      },
    ];
  });
  if (versions.length === 0) return;
  versions.sort((a, b) => Number(b.latest) - Number(a.latest));
  return {
    folder: lib,
    slug: path,
    name: typeof lib.name === 'string' ? lib.name : path,
    versions,
  };
}

/** Every versioned library in the tree, keyed by slug. */
export function getAllLibVersions(
  tree: PageTree.Root,
): Map<string, LibVersions> {
  const out = new Map<string, LibVersions>();
  for (const node of tree.children) {
    if (node.type !== 'folder' || node.root !== true) continue;
    const lib = getLibVersions(node);
    if (lib) out.set(lib.slug, lib);
  }
  return out;
}

/** Every page URL inside a folder. */
export function getFolderUrls(
  folder: PageTree.Folder,
  out = new Set<string>(),
): Set<string> {
  if (folder.index) out.add(folder.index.url);
  for (const child of folder.children) {
    if (child.type === 'page' && !child.external) out.add(child.url);
    if (child.type === 'folder') getFolderUrls(child, out);
  }
  return out;
}

/**
 * The URL of the page at `url` (in version `from`) as it is in version `to`: the same path
 * when that version has it, else `to`'s landing page.
 */
export function projectUrl(
  url: string | undefined,
  from: DocsVersion,
  to: DocsVersion,
): string {
  const urls = getFolderUrls(to.folder);
  if (url && (url === from.prefix || url.startsWith(`${from.prefix}/`))) {
    const candidate = `${to.prefix}${url.slice(from.prefix.length)}`;
    if (urls.has(candidate)) return candidate;
  }
  if (urls.has(to.prefix)) return to.prefix;
  return urls.values().next().value ?? to.prefix;
}

/**
 * A tree without the older versions' folders — what llms.txt lists, so it only carries the
 * latest docs.
 */
export function latestOnlyTree(tree: PageTree.Root): PageTree.Root {
  const strip = <T extends PageTree.Root | PageTree.Folder>(node: T): T => ({
    ...node,
    children: node.children.flatMap((child): PageTree.Node[] => {
      if (child.type !== 'folder') return [child];
      if (
        isVersionFolder(child) &&
        folderPath(child)?.split('/').at(-1) !== LATEST_DIR
      )
        return [];
      return [strip(child)];
    }),
  });
  return strip(tree);
}
