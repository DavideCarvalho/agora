import type AppUser from '#models/app_user'

/**
 * Types `ctx.authkit.getUser()` as this app's user. `ctx.auth.user` is typed by
 * the guard's provider in config/auth.ts.
 */
declare module '@adonis-agora/authkit-client' {
  interface AuthkitUserType {
    user: AppUser
  }
}
