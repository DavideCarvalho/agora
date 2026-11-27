import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
import { getPageVersion, source } from '@/lib/source';

// Static export: written once at build time as /sitemap.xml.
export const dynamic = 'force-static';

/** Every page a search engine should index: the landing, partners and the latest docs.
 *  Docs for older majors are left out (they are `noindex`, see the docs page metadata). */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const docs = source
    .getPages()
    .filter((page) => getPageVersion(page)?.version.latest ?? true)
    .map((page) => ({
      url: absoluteUrl(page.url),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      // A library's overview page ranks above its sub-pages.
      priority: page.slugs.length <= 1 ? 0.8 : 0.6,
    }));

  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/docs'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/partners'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...docs.filter((d) => d.url !== absoluteUrl('/docs')),
  ];
}
