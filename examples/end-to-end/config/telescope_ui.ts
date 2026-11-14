import { defineConfig } from '@adonis-agora/telescope/ui'
import { authorizeByRoles } from '@adonis-agora/authz'

/**
 * The admin-only Telescope dashboard (goal #5). Mounts at /telescope, gated
 * with authz's shared console helper — the same one config/media_dashboard.ts
 * uses, and the one every other @adonis-agora console (durable, agent,
 * payments) takes.
 *
 * An anonymous visitor gets 401 (a page navigation is sent to this app's
 * `loginPath` instead), a signed-in user without `ADMIN` gets 403, and an
 * `ADMIN` gets in.
 */
export default defineConfig({
  authorize: authorizeByRoles({ roles: ['ADMIN'], loginPath: '/auth/login' }),
})
