import { defineConfig } from '@adonisjs/auth'
import { sessionUserProvider } from '@adonisjs/auth/session'
import type { InferAuthenticators } from '@adonisjs/auth/types'
import { authkitClientGuard } from '@adonis-agora/authkit-client/auth'

/**
 * ctx.auth is backed by the AuthKit session. The guard takes the user from
 * resolveUser in config/authkit_client.ts when you set one (e.g. lucidMirror,
 * which creates the local row on first login), and falls back to this provider
 * otherwise. The model's primary key must be the IdP's sub.
 */
const authConfig = defineConfig({
  default: 'web',
  guards: {
    web: authkitClientGuard({
      provider: sessionUserProvider({
        model: () => import('#models/app_user'),
      }),
    }),
  },
})

export default authConfig

declare module '@adonisjs/auth/types' {
  export interface Authenticators extends InferAuthenticators<typeof authConfig> {}
}
