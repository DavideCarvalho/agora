import { defineConfig } from '@adonisjs/shield'
import { authkitCsrfExceptions } from '@adonis-agora/authkit-server'

/**
 * Security configuration using Shield.
 * Provides protection against common web vulnerabilities like CSRF,
 * XSS, clickjacking, and other security threats.
 */
const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    /**
     * Enable Content Security Policy headers.
     * CSP helps prevent XSS attacks by controlling which resources can be loaded.
     */
    enabled: false,

    /**
     * CSP directives define the allowed sources for different resource types.
     * Example: { defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'"] }
     */
    directives: {},

    /**
     * When true, CSP violations are reported but not enforced.
     * Useful for testing CSP policies before enforcing them.
     */
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    /**
     * Enable CSRF protection.
     * Protects against Cross-Site Request Forgery attacks.
     */
    enabled: true,

    /**
     * Routes excluded from CSRF protection.
     *
     * `authkitCsrfExceptions` is authkit-server's own helper for exactly this:
     * it covers the IdP protocol surface mounted at `mountPath` (token,
     * introspection, revocation, userinfo...), the PAT introspection route and
     * the client's back-channel logout route. Those are machine-to-machine
     * requests authenticated by the OIDC spec itself (client_secret_basic,
     * PKCE), never by a browser form carrying shield's `_csrf` field — left
     * un-exempted, `exchangeCode()` in
     * app/controllers/oidc_session_controller.ts gets shield's CSRF-denial
     * HTML back from `POST /oidc/token` instead of a JSON token response.
     *
     * The interactive pages (login/signup/consent) live under
     * `/auth/interaction/*`, which the helper does not match, so their CSRF
     * protection is untouched.
     */
    exceptRoutes: (ctx) => authkitCsrfExceptions(ctx.request.url(), { mountPath: '/oidc' }),

    /**
     * Enable XSRF-TOKEN cookie for JavaScript frameworks.
     * When enabled, the CSRF token is available to client-side code.
     */
    enableXsrfCookie: false,

    /**
     * HTTP methods that require CSRF token validation.
     * GET, HEAD, and OPTIONS are safe methods and don't need protection.
     */
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    /**
     * Enable X-Frame-Options header.
     * Helps prevent clickjacking attacks.
     */
    enabled: true,

    /**
     * Frame embedding policy.
     * 'DENY' prevents all framing, 'SAMEORIGIN' allows same-origin framing.
     */
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    /**
     * Enable HTTP Strict Transport Security.
     * Tells browsers to always use HTTPS for this site.
     */
    enabled: true,

    /**
     * How long browsers should remember to use HTTPS.
     * After this period, browsers may try HTTP again.
     */
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    /**
     * Enable X-Content-Type-Options: nosniff header.
     * Prevents MIME type sniffing which can lead to security vulnerabilities.
     */
    enabled: true,
  },
})

export default shieldConfig
