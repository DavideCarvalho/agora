import { defineConfig } from '@adonis-agora/telescope/ui'
import { authorizeByRoles } from '@adonis-agora/authz'

const requireAdmin = authorizeByRoles({ roles: ['ADMIN'], loginPath: '/auth/login' })

/**
 * The admin-only Telescope dashboard (goal #5). Mounts at /telescope, gated
 * with authz's shared dashboard helper — the same one used by
 * config/media_dashboard.ts and (per its own docs) every other @adonis-agora
 * dashboard (durable, agent). `loginPath` sends an unauthenticated page
 * navigation to this app's own login route instead of the dashboard's own
 * dead-end "you need to sign in" page.
 *
 * `authorizeByRoles` returns a bare boolean, and on a bare `false` telescope's
 * guard picks 401 vs 403 from the REQUEST's shape (was an `Authorization`
 * header or `?token=` presented?) — a heuristic built for its own
 * `credentials: { token, basic }` gate, which never sees the session cookie
 * this helper authenticates with. Returning telescope's `AuthorizeDecision`
 * (`{ allowed, reason }`, telescope@0.20.0+) instead states the case outright,
 * so an authenticated-but-wrong-role denial is a 403 and only a genuinely
 * anonymous one is a 401.
 */
export default defineConfig({
  authorize: async (ctx) => {
    if (await requireAdmin(ctx)) return true

    const auth = (ctx as { auth?: { getUser?: () => Promise<unknown>; user?: unknown } }).auth
    const user = auth ? ((await auth.getUser?.()) ?? auth.user ?? null) : null

    return { allowed: false, reason: user ? 'forbidden' : 'unauthenticated' }
  },
})
