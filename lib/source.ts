import { type ComponentType, createElement } from 'react';
import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import * as lucide from 'lucide-react';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';

const lucideExports = lucide as unknown as Record<string, ComponentType | undefined>;

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toFumadocsSource(),
  // Resolve the `icon` field in meta.json / frontmatter to a lucide icon so the
  // per-lib sidebar tabs render their emblem. We resolve against the full lucide
  // namespace (not the `icons` object) so renamed-icon aliases still work —
  // e.g. `Filter` is an alias kept for back-compat while the canonical export is
  // now `Funnel`, and the `icons` map only contains canonical names.
  icon(icon) {
    if (!icon) return;
    const Icon = lucideExports[icon];
    if (Icon) return createElement(Icon);
  },
  plugins: [],
});

export function getPageImage(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'image.png'];

  return {
    segments,
    url: `${docsImageRoute}/${segments.join('/')}`,
  };
}

export function getPageMarkdownUrl(page: (typeof source)['$inferPage']) {
  const segments = [...page.slugs, 'content.md'];

  return {
    segments,
    url: `${docsContentRoute}/${segments.join('/')}`,
  };
}

export async function getLLMText(page: (typeof source)['$inferPage']) {
  const processed = await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}
