import env from '#start/env'
import { defineConfig, resolvers } from '@adonis-agora/authkit-client'
import type { Identity } from '@adonis-agora/authkit-client'
import AppUser from '#models/app_user'

/**
 * Hand-written rather than published by `node ace configure @adonis-agora/authkit-client`.
 *
 * That codemod currently crashes on this exact file: its published stub
 * (config/authkit_client.stub) contains a literal backtick inside a comment
 * (`` `resolveRoles` ``), and the codemod's template engine (tempura) compiles
 * a stub by wrapping its raw source in a JS template literal — an unescaped
 * backtick in the stub's own content closes that literal early and the
 * generated code fails with `SyntaxError: Unexpected identifier 'resolveRoles'`.
 * Reproduced directly against the installed package:
 *
 *   node -e "require('tempura').compile(require('fs').readFileSync(
 *     'node_modules/@adonis-agora/authkit-client/build/stubs/config/authkit_client.stub','utf8'))"
 *
 * This is a genuine upstream bug in @adonis-agora/authkit-client@0.18.2 (not a
 * misconfiguration on this app's part) — see this example's README for the
 * full writeup. Below is the config the codemod would have published, typed
 * by hand.
 */
const authkitClientConfig = defineConfig({
  issuer: env.get('AUTHKIT_ISSUER'),
  clientId: env.get('AUTHKIT_CLIENT_ID'),
  clientSecret: env.get('AUTHKIT_CLIENT_SECRET'),
  redirectUri: env.get('AUTHKIT_REDIRECT_URI'),
  resolver: resolvers.jwt({ tokenSource: 'session' }),

  // Map the IdP identity (claims) onto this app's own user record. Topology A
  // (this example): the host is its own client, so AppUser and AuthUser cover
  // the same person — kept as two models because that's the real shape every
  // multi-app deployment needs (see docs/topologies).
  resolveUser: async (identity: Identity) => {
    return AppUser.updateOrCreate(
      { id: identity.userId },
      { id: identity.userId, email: identity.email, fullName: identity.profile?.name ?? null },
    )
  },
})

export default authkitClientConfig
