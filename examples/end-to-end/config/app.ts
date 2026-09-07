import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { Secret } from '@adonisjs/core/helpers'
import { defineConfig } from '@adonisjs/core/http'

/**
 * The app URL can be used in various places where you want to create absolute
 * URLs to your application. For example, when sending emails, images should
 * use absolute URLs.
 */
export const appUrl = env.get('APP_URL')

/**
 * `@adonis-agora/authkit-server` reads `app.appKey` directly (via
 * `app.config.get('app.appKey')`) to sign the oidc-provider's cookies via
 * keygrip — it does NOT read `config/encryption.ts`'s key list, which is where
 * this AdonisJS 7 starter kit otherwise keeps APP_KEY-derived material. Boot
 * fails fast with an actionable message if this export is missing; this is
 * that fix, not a workaround for a real bug.
 */
export const appKey = new Secret(env.get('APP_KEY').release())

/**
 * The configuration settings used by the HTTP server
 */
export const http = defineConfig({
  /**
   * Generate a unique request ID for each incoming HTTP request.
   * Useful for request tracing and debugging in logs.
   */
  generateRequestId: true,

  /**
   * Allow method spoofing via _method query parameter or form field.
   * Enables using PUT, PATCH, DELETE methods in HTML forms by spoofing
   * through POST requests with _method field.
   */
  allowMethodSpoofing: true,

  /**
   * Enabling async local storage will let you access HTTP context
   * from anywhere inside your application.
   */
  useAsyncLocalStorage: false,

  /**
   * Manage cookies configuration. The settings for the session id cookie are
   * defined inside the "config/session.ts" file.
   */
  cookie: {
    /**
     * The domain for which the cookie is valid.
     * Empty string means the cookie is valid for the current domain only.
     */
    domain: '',

    /**
     * The path for which the cookie is valid.
     * '/' means the cookie is accessible for all routes.
     */
    path: '/',

    /**
     * Maximum age of the cookie.
     * After this time, the cookie will expire.
     */
    maxAge: '2h',

    /**
     * When true, the cookie is only accessible via HTTP(S) and not
     * by client-side JavaScript, helping prevent XSS attacks.
     */
    httpOnly: true,

    /**
     * When true, the cookie is only sent over HTTPS connections.
     * Enabled in production for security.
     */
    secure: app.inProduction,

    /**
     * Controls when cookies are sent with cross-site requests.
     * 'lax' provides reasonable security while allowing some cross-site usage.
     */
    sameSite: 'lax',
  },
})
