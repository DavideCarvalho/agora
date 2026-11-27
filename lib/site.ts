import { gitConfig } from '@/lib/shared';

/** Public origin + base path, e.g. https://davidecarvalho.github.io/agora (no trailing slash). */
export const siteUrl = `https://${gitConfig.user.toLowerCase()}.github.io${process.env.NEXT_PUBLIC_BASE_PATH || ''}`;

/** Absolute URL for a site path ("/docs/durable" → https://…/agora/docs/durable). */
export function absoluteUrl(path = '/'): string {
  if (path === '/' || path === '') return siteUrl;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

/** Search-facing name and pitch, shared by the root metadata, JSON-LD and the OG card. */
export const seoTitle = 'Agora: production-grade libraries for AdonisJS';
export const seoDescription =
  'Production-grade AdonisJS libraries for workflows, auth, feature flags, payments, observability and more. Run them inside one app, then grow to a Hub that serves all your apps.';

export const seoKeywords = [
  'AdonisJS',
  'AdonisJS libraries',
  'AdonisJS packages',
  'Node.js',
  'TypeScript',
  'durable workflows',
  'OIDC server',
  'OAuth2 authorization server',
  'feature flags',
  'A/B testing',
  'payments',
  'observability',
  'multi-tenancy',
  'roles and permissions',
  'secrets management',
  'control plane',
  '@adonis-agora',
];
