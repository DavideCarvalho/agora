import { defineConfig } from '@adonisjs/shield'

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
     * Routes that should be excluded from CSRF protection.
     * Useful for webhooks or API endpoints that use other auth methods.
     *
     * `/oidc/*` is authkit-server's own OAuth2/OIDC protocol surface
     * (`registerAuthHost`'s `mountPath`) — token, introspection, revocation,
     * userinfo, etc. Those are machine-to-machine requests authenticated by
     * the OIDC spec itself (client_secret_basic, PKCE), never by a browser
     * form carrying our `_csrf` field. Left un-exempted, `exchangeCode()` in
     * app/controllers/oidc_session_controller.ts gets shield's CSRF-denial
     * HTML back from POST /oidc/token instead of a JSON token response, and
     * fails with `SyntaxError: Unexpected token '<'... is not valid JSON` —
     * reproduced with the web-starter-kit's default shield config (CSRF
     * enabled) plus authkit-server's documented `registerAuthHost` setup.
     * The actual interactive pages (login/signup/consent) live under
     * `/auth/interaction/*`, a different prefix, so their CSRF protection is
     * untouched by this exemption. See this repo's README.
     */
    exceptRoutes: (ctx) => ctx.request.url().startsWith('/oidc/'),

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
