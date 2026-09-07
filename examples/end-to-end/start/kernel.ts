/*
|--------------------------------------------------------------------------
| HTTP kernel file
|--------------------------------------------------------------------------
|
| The HTTP kernel file is used to register the middleware with the server
| or the router.
|
*/

import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

/**
 * The error handler is used to convert an exception
 * to an HTTP response.
 */
server.errorHandler(() => import('#exceptions/handler'))

/**
 * The server middleware stack runs middleware on all the HTTP
 * requests, even if there is no route registered for
 * the request URL.
 */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('@adonisjs/static/static_middleware'),
  () => import('@adonisjs/vite/vite_middleware'),
  () => import('@adonis-agora/context/context_middleware'),
  () => import('@adonis-agora/telescope/telescope_middleware')
])

/**
 * The router middleware stack runs middleware on all the HTTP
 * requests with a registered route.
 */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/session/session_middleware'),
  () => import('@adonisjs/shield/shield_middleware'),
  // Makes `ctx.auth` available on every request (never throws for an
  // anonymous visitor) — the OIDC relying-party half of authkit. See
  // app/controllers/oidc_session_controller.ts for the login/callback/logout
  // flow that populates it.
  () => import('@adonis-agora/authkit-client/authkit_middleware'),
  // Stamps the resolved user (+ a demo tenant id) into @adonis-agora/context's
  // ambient store — goal #3. Must run after authkit_middleware above (needs
  // ctx.auth already resolved) and after @adonis-agora/context's own server
  // middleware (already entered the store before routing even started).
  () => import('#middleware/stamp_context_middleware'),
])

/**
 * Named middleware collection must be explicitly assigned to
 * the routes or the routes group.
 *
 * `requireAuth` enforces a login (redirecting an anonymous visitor to
 * /auth/login); `requireRole` is authz's route guard (see
 * app/controllers/documents_controller.ts and the telescope dashboard config
 * for how each is used).
 */
export const middleware = router.named({
  requireAuth: () => import('@adonis-agora/authkit-client/auth_middleware'),
  requireRole: () => import('@adonis-agora/authz/middleware'),
})
