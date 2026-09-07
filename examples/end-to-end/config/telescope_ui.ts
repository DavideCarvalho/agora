import { defineConfig } from '@adonis-agora/telescope/ui'
import { authorizeByRoles } from '@adonis-agora/authz'

/**
 * The admin-only Telescope dashboard (goal #5). Mounts at /telescope,
 * gated with authz's shared dashboard helper — the same one used by
 * config/media_dashboard.ts and (per its own docs) every other
 * @adonis-agora dashboard (durable, agent). `loginPath` sends an
 * unauthenticated page navigation to this app's own login route instead of
 * the dashboard's own dead-end "you need to sign in" page.
 */
export default defineConfig({
  authorize: authorizeByRoles({ roles: ['ADMIN'], loginPath: '/auth/login' }),
})
