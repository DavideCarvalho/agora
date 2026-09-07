import { defineConfig, stores, tenantFromContext } from '@adonis-agora/authz'

export default defineConfig({
  /**
   * The active store. "memory" keeps RBAC state in-process (great for tests);
   * "lucid" persists it in your database. Point "default" at the one you use.
   */
  default: 'lucid',

  /**
   * Named stores, built with the "stores" factory. The Lucid store lazily
   * imports @adonisjs/lucid only when selected. `autoCreateSchema` is left at
   * its default (true) — a fresh SQLite file gets its five authz tables on
   * first use, no migration step required (see authz's getting-started doc).
   */
  stores: {
    memory: stores.memory(),
    lucid: stores.lucid(),
  },

  /**
   * The opt-in Agora bridge (goal #3): when a check has no explicit tenant,
   * default it to @adonis-agora/context's active tenantId — the same field
   * app/middleware/stamp_context_middleware.ts populates after login. Zero
   * import of the context package's internals; this reads it structurally.
   * See adonis-authz/docs/agora-integration.mdx.
   */
  resolveTenant: tenantFromContext,

  /**
   * Declarative roles -> permissions, seeded with `node ace authz:sync` (see
   * the README). "member" is the everyday logged-in user; "ADMIN" also gates
   * the Telescope and media dashboards (config/telescope_ui.ts,
   * config/media_dashboard.ts).
   */
  catalog: {
    permissions: ['documents.view', 'documents.create', 'documents.manage'],
    roles: {
      member: ['documents.view', 'documents.create'],
      ADMIN: ['documents.*'],
    },
  },
})