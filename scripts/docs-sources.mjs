// Source of truth for the docs sync (scripts/sync-docs.mjs).
//
// Agora follows the TanStack/aviary model: each library keeps its own docs in its
// own repo (`docs/` at the repo root — o authkit é a exceção, ver o `path` dele),
// and this site pulls them in at build time.
// `migrated: true` means the library has been onboarded — only migrated libs are
// synced by default. Flip the flag as each library is brought over.
//
// `path` is the docs directory *inside* the library repo. `repoDir` is the sibling
// folder name used by the optional local mode (AGORA_DOCS_LOCAL=1).

export const sources = [
  {
    slug: 'authkit',
    name: 'AuthKit',
    description:
      'An AdonisJS OIDC/OAuth2 Authorization Server kit, OIDC client adapter, and React frontend ergonomics.',
    icon: 'KeyRound',
    repo: 'DavideCarvalho/adonis-authkit',
    // `main`, não `master`: o authkit é o único dos repos com esse default branch.
    ref: 'main',
    // As docs do authkit são um app Fumadocs próprio (publicado em GitHub Pages
    // pelo `docs.yml` do repo), então o conteúdo mora sob `apps/docs`, e não em
    // `docs/` como nas demais libs.
    path: 'apps/docs/content/docs',
    repoDir: 'adonis-authkit',
    migrated: true,
  },
  {
    slug: 'context',
    name: 'Context',
    description: 'Ambient request/tenant/correlation context that crosses HTTP, queue, durable and ace boundaries.',
    icon: 'Boxes',
    repo: 'DavideCarvalho/adonis-context',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-context',
    migrated: true,
  },
  {
    slug: 'diagnostics',
    name: 'Diagnostics',
    description: 'A zero-dependency diagnostics bus over node:diagnostics_channel, with an OpenTelemetry auto-bridge.',
    icon: 'Activity',
    repo: 'DavideCarvalho/adonis-diagnostics',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-diagnostics',
    migrated: true,
  },
  {
    slug: 'resilience',
    name: 'Resilience',
    description: 'Composable timeout, retry, circuit-breaker and failover policies with a pluggable breaker store.',
    icon: 'Zap',
    repo: 'DavideCarvalho/adonis-resilience',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-resilience',
    migrated: true,
  },
  {
    slug: 'durable',
    name: 'Durable',
    description: 'Durable, resumable, cross-process workflows for AdonisJS — built on @adonisjs/queue.',
    icon: 'Workflow',
    repo: 'DavideCarvalho/adonis-agora-durable',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-durable',
    migrated: true,
  },
  {
    slug: 'telescope',
    name: 'Telescope',
    description: 'A Telescope-style observability console — watchers, entries, and an extensible dashboard.',
    icon: 'Telescope',
    repo: 'DavideCarvalho/adonis-telescope',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-telescope',
    migrated: true,
  },
  {
    slug: 'authz',
    name: 'Authz',
    description: 'DB-backed roles & permissions that feed AdonisJS Bouncer — wildcard grants, tenancy, a Lucid store and ace commands.',
    icon: 'ShieldCheck',
    repo: 'DavideCarvalho/adonis-authz',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-authz',
    migrated: true,
  },
  {
    slug: 'media',
    name: 'Media',
    description:
      'A media library for AdonisJS — owner collections, image conversions, and column attachments on top of @adonisjs/drive.',
    icon: 'Image',
    repo: 'DavideCarvalho/adonis-media',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-media',
    migrated: true,
  },
  {
    slug: 'filter',
    name: 'Filter',
    description:
      'A typed query-param filter language for Lucid — operators, defineFilter classes, offset & cursor pagination, relations via whereHas, full-text (tsvector) and vector-similarity search, and a typed client with codegen.',
    icon: 'Filter',
    repo: 'DavideCarvalho/adonis-filter',
    ref: 'master',
    path: 'docs',
    repoDir: 'adonis-filter',
    migrated: true,
  },
  {
    slug: 'agent',
    name: 'Agent',
    description:
      'A governed, durable-ready AI agent for AdonisJS — streaming chat, tool-calling, HITL, quota/cost accounting and multi-agent delegation.',
    icon: 'Bot',
    repo: 'DavideCarvalho/adonis-agent',
    ref: 'master',
    path: 'packages/adonis/docs',
    repoDir: 'adonis-agent',
    migrated: true,
  },
  {
    slug: 'collaboration',
    name: 'Collaboration',
    description: 'Collaborative editing (CRDT) for AdonisJS — Yjs/Automerge/edge engines, Redis presence, version control, anchored comments, codegen and React client hooks.',
    icon: 'Users',
    repo: 'DavideCarvalho/adonis-agora-collaboration',
    ref: 'main',
    path: 'docs',
    repoDir: 'adonis-collaboration',
    migrated: true,
  },
  // NOTE: authkit is NOT synced here — its docs (apps/docs/content/docs) are a
  // coupled Fumadocs app with live React demos + app path-aliases, not portable.
  // The /docs/authkit page is hand-authored in content/docs/authkit/ instead.
];
