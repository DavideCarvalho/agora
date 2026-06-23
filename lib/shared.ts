export const appName = 'Agora';
export const appTagline = 'Libraries for the AdonisJS ecosystem.';
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

// npm scope every package in the agora lives under.
export const npmScope = '@adonis-agora';

// GitHub info — used for nav link + "edit on GitHub" + Pages basePath assumptions.
// NOTE: `repo` should match the GitHub repository name; the Pages basePath is
// derived from it automatically by the deploy workflow (configure-pages).
export const gitConfig = {
  user: 'DavideCarvalho',
  repo: 'agora',
  branch: 'main',
};
