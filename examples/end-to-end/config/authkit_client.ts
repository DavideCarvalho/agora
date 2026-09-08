import env from '#start/env'
import { defineConfig, resolvers } from '@adonis-agora/authkit-client'
import type { Identity } from '@adonis-agora/authkit-client'
import AppUser from '#models/app_user'

/**
 * Published verbatim by `node ace configure @adonis-agora/authkit-client`,
 * with the stub's commented-out `resolveUser` placeholder filled in below.
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

  // App roles? Configure `resolveRoles` in @adonis-agora/authz, not here —
  // AuthKit only authenticates. See config/authz.ts.
})

export default authkitClientConfig
