import type { HttpContext } from '@adonisjs/core/http'
import {
  buildAuthorizeUrl,
  buildEndSessionUrl,
  exchangeCode,
  generatePkce,
} from '@adonis-agora/authkit-client'
import { randomUUID } from 'node:crypto'

/**
 * The OIDC relying-party flow — authorization-code + PKCE against THIS SAME
 * app's own IdP (topology A: "everything in one app", see authkit-server's
 * docs/topologies.mdx). Three routes, wired in start/routes.ts:
 *
 *   GET  /auth/login    -> redirects the browser to the IdP's /oidc/authorize
 *   GET  /auth/callback -> exchanges the code for tokens, starts the session
 *   POST /auth/logout   -> RP-initiated logout (ends the IdP session too)
 */
export default class OidcSessionController {
  async login(ctx: HttpContext) {
    const manager = await ctx.containerResolver.make('authkit.client')
    const cfg = manager.clientConfig
    const { verifier, challenge } = await generatePkce()
    const state = randomUUID()

    // Stash the PKCE verifier + state so the callback can verify the round-trip.
    ctx.session.put('authkit_pkce', { verifier, state })

    const url = buildAuthorizeUrl({
      issuer: cfg.issuer,
      clientId: cfg.clientId,
      redirectUri: cfg.redirectUri,
      scopes: cfg.scopes,
      state,
      codeChallenge: challenge,
    })
    return ctx.response.redirect(url)
  }

  async callback(ctx: HttpContext) {
    const manager = await ctx.containerResolver.make('authkit.client')
    const cfg = manager.clientConfig
    const { code, state } = ctx.request.qs()
    const pkce = ctx.session.get('authkit_pkce') as
      | { verifier: string; state: string }
      | undefined

    if (!pkce || pkce.state !== state) {
      return ctx.response.badRequest({ error: 'invalid state' })
    }

    const tokenSet = await exchangeCode({
      issuer: cfg.issuer,
      clientId: cfg.clientId,
      clientSecret: cfg.clientSecret,
      redirectUri: cfg.redirectUri,
      code: String(code),
      codeVerifier: pkce.verifier,
    })

    // Persist the token set as a FRESH session (also clears any credential a
    // previous login parked in this cookie jar) — this is what
    // resolvers.jwt({ tokenSource: 'session' }) reads on every later request.
    manager.startSession(ctx, tokenSet)
    ctx.session.forget('authkit_pkce')

    return ctx.response.redirect('/')
  }

  async logout(ctx: HttpContext) {
    const manager = await ctx.containerResolver.make('authkit.client')
    const cfg = manager.clientConfig
    const idToken = manager.getIdToken(ctx)

    ctx.session.forget(cfg.sessionKey)

    return ctx.response.redirect(
      buildEndSessionUrl({
        issuer: cfg.issuer,
        idToken,
        clientId: cfg.clientId,
        postLogoutRedirectUri: `${ctx.request.protocol()}://${ctx.request.host()}/`,
      }),
    )
  }
}
