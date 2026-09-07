import { defineConfig } from '@adonis-agora/media/dashboard'
import { authorizeByRoles } from '@adonis-agora/authz'

/**
 * Configuration for the @adonis-agora/media dashboard -- a management console (React SPA + JSON API)
 * embedded in this same package, mounted by '@adonis-agora/media/dashboard_provider' (registered by
 * 'configure' above). Storage, uploads and everything else come from the already-configured
 * @adonis-agora/media manager; this config only places the console and picks which disks are browsable.
 *
 * The console is a READ-ONLY browser by default. Flip 'actions' on to enable copy/move/delete -- gate
 * the routes with your own 'middleware' (an auth guard) before you do, and/or configure 'auth' for a
 * built-in session-cookie login independent of 'middleware'.
 */
export default defineConfig({
  // enabled: true,
  // basePath: '/media/dashboard',
  // apiBasePath: '/media/dashboard/api',
  // actions: true,
  // disks: ['s3', 'backups'],           // default: derived from config/media.ts

  // Same "authorize" gate every @adonis-agora dashboard exposes (telescope,
  // durable, agent) — closed by default with authz's shared helper, the same
  // one config/telescope_ui.ts uses.
  authorize: authorizeByRoles({ roles: ['ADMIN'], loginPath: '/auth/login' }),

  // Built-in session-cookie login, independent of (and composable with) 'middleware'. At least one of
  // 'login'/'session' is required when 'auth' is set.
  // auth: {
  //   secret: env.get('MEDIA_DASHBOARD_SECRET'),
  //   ttl: '8h',
  //   // Mode B — standalone login page (the SPA renders it until a valid cookie exists).
  //   login: async (username, password) => {
  //     if (username === 'admin' && password === env.get('MEDIA_DASHBOARD_PASSWORD')) {
  //       return { id: 'admin', name: 'Admin' }
  //     }
  //     return null
  //   },
  //   // Mode A — mint a session for an already-authenticated host request.
  //   // session: async (request) => (request.user?.isAdmin ? { id: request.user.id } : null),
  // },
})