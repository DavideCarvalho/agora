import { defineConfig } from '@adonis-agora/media/dashboard'
import { authorizeByRoles } from '@adonis-agora/authz'

/**
 * Configuration for the @adonis-agora/media dashboard -- a management console (React SPA + JSON API)
 * embedded in this same package, mounted by '@adonis-agora/media/dashboard_provider' (registered by
 * 'configure' above). Storage, uploads and everything else come from the already-configured
 * @adonis-agora/media manager; this config only places the console and picks which disks are browsable.
 *
 * The console is a READ-ONLY browser by default. Flip 'actions' on to enable copy/move/delete -- the
 * 'authorize' gate below decides who reaches it.
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
})
