import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { Context } from '@adonis-agora/context'

/**
 * This is the one integration point for goal #3 of this example: propagating
 * the current user/tenant through `@adonis-agora/context`'s ambient store so
 * every OTHER library can read it with ZERO import of this app's auth layer.
 *
 * `@adonis-agora/context`'s own middleware (registered on the SERVER stack by
 * its `configure` step) only establishes the store + trace id — it
 * deliberately does not know who the user is (see context's getting-started
 * doc, "Step 3 — Populate the user and tenant"). This middleware runs on the
 * ROUTER stack, after authkit's `authkit_middleware` has resolved `ctx.auth`,
 * and fills in the two fields context left blank.
 *
 * Once `Context.set(...)` runs here, every one of these already reads it with
 * no wiring of its own:
 *   - `@adonis-agora/authz`'s `resolveTenant: tenantFromContext` (config/authz.ts)
 *     scopes every permission check to the active tenant.
 *   - `@adonis-agora/telescope`'s OTel bridge stamps `entry.traceId` from the
 *     SAME store (see config/telescope.ts / the otel docs).
 *   - Any future library that adds an Agora-context bridge gets it for free —
 *     that is the whole point of the structural, `Symbol.for`-keyed registry
 *     `@adonis-agora/context` publishes: nobody here imported a "current
 *     user" contract, they read a well-known ambient slot.
 *
 * `tenantId` is a fixed 'demo' string — this example is deliberately
 * single-tenant so the domain model (documents, media) stays small. A real
 * multi-tenant app would derive it from the user's organization/workspace
 * instead; the propagation mechanism shown here is identical either way.
 */
export default class StampContextMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = await ctx.auth.getUser()
    if (user) {
      Context.set('userRef', { type: 'user', id: user.id })
      Context.set('tenantId', 'demo')
    }
    return next()
  }
}
