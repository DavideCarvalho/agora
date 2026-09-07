import type { Authenticator } from '@adonis-agora/authkit-client'
import type AppUser from '#models/app_user'

/**
 * Fixes `ctx.auth` as `Authenticator<AppUser>` app-wide, so every
 * `auth.getUser()` call site is typed without a cast. See authkit-client's
 * getting-started doc ("Using it in controllers") — declare this ONCE, never
 * alongside the library's own unparameterised declaration.
 */
declare module '@adonisjs/core/http' {
  interface HttpContext {
    auth: Authenticator<AppUser>
  }
}
