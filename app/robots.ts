import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

// Static export: /robots.txt. On a GitHub Pages project site crawlers read the robots.txt at
// the domain root (the user site), so this file matters once the site moves to its own
// domain; the sitemap is also referenced from the root robots.txt.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
