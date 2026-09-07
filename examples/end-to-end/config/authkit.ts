import env from '#start/env'
import AuthUser from '#models/auth_user'
import { defineConfig, adapters, lucidAccountStore } from '@adonis-agora/authkit-server'

/**
 * `adapters.database` (not `adapters.redis`) is the deliberate choice here — this
 * whole example runs on SQLite with no external infra, and the database adapter's
 * default `schema.autoManage: true` creates the eight tables it owns on first use,
 * on the SAME `sqlite` connection the rest of the app already uses (see
 * config/database.ts). No separate `auth` connection, no Redis.
 */
const authServerConfig = defineConfig({
  issuer: env.get('AUTHKIT_ISSUER'),
  adapter: adapters.database({ connection: 'sqlite' }),
  jwks: { source: 'managed', algorithm: 'RS256' },
  ttl: { accessToken: '15m', refreshToken: '30d' },
  accountStore: lucidAccountStore(AuthUser),
  mountPath: '/oidc',
  admin: { enabled: true },
  adminApi: { enabled: true, apiKeys: [env.get('AUTHKIT_ADMIN_API_KEY')] },
  // Clients are managed at runtime via the admin console (/admin/clients), the
  // Admin API, or `node ace authkit:clients:create` (see the README) — never
  // declared statically here, so no redeploy is needed to add one.

  /**
   * WORKAROUND, not a design choice — `branding` is typed `optional` here and
   * every doc (getting-started, quickstart, reference) treats it as pure
   * theming you can skip. Omitting it entirely crashes the FIRST hit of the
   * built-in login/consent/signup screen for every visitor:
   * `brandFor(cfg.branding, ...)` in the host's interaction controller reads
   * `cfg.branding.clients` unconditionally, and `defineConfig` never applies
   * a default `{}` — `config.branding` stays `undefined` and the read
   * throws `TypeError: Cannot read properties of undefined (reading
   * 'clients')`. Reproduced on @adonis-agora/authkit-server@0.65.2 by simply
   * following getting-started.mdx verbatim (no branding key) and opening
   * /auth/login. This is the smallest valid BrandingConfig, purely to keep
   * the built-in Edge login screen from crashing — see this repo's README
   * for the full writeup; flagged upstream, not fixed here.
   */
  branding: {
    company: 'Agora',
    clients: {},
    default: {
      appName: 'End-to-end example',
      accent: '#0ea5e9',
      accentSoft: '#e0f2fe',
      tagline: 'A minimal Agora ecosystem demo',
    },
    firstParty: [],
  },
})

export default authServerConfig