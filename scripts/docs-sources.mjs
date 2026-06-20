// Source of truth for the docs sync (scripts/sync-docs.mjs).
//
// Agora follows the TanStack/aviary model: each library keeps its own docs in its
// own repo (`docs/` at the repo root), and this site pulls them in at build time.
// `migrated: true` means the library has been onboarded — only migrated libs are
// synced by default. Flip the flag as each library is brought over.
//
// `path` is the docs directory *inside* the library repo. `repoDir` is the sibling
// folder name used by the optional local mode (AGORA_DOCS_LOCAL=1).

export const sources = [
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
    repo: 'DavideCarvalho/adonis-durable',
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
];
