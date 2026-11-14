import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { errors } from '@adonisjs/auth'

/**
 * Denies access to unauthenticated requests. A page navigation is sent to the
 * AuthKit login route (/auth/login, see start/routes.ts); an API call that asks
 * for JSON gets the 401.
 */
export default class AuthMiddleware {
  redirectTo = '/auth/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    try {
      await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
    } catch (error) {
      const wantsJson = ctx.request.accepts(['html', 'json']) === 'json'
      if (error instanceof errors.E_UNAUTHORIZED_ACCESS && !wantsJson) {
        return ctx.response.redirect().withIntendedUrl().toPath(this.redirectTo)
      }
      throw error
    }
    return next()
  }
}
