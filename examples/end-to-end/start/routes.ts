/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'
import { registerAuthHost } from '@adonis-agora/authkit-server'

/**
 * Mounts the OIDC provider itself — /oidc/authorize, /oidc/token, the login /
 * consent / signup interaction pages, password reset, the account console —
 * everything authkit-server's docs call "the host". This app is its own IdP
 * (topology A), so this line and the RP routes below both live here.
 */
registerAuthHost(router, { mountPath: '/oidc' })

router.get('/', [controllers.Home, 'index']).as('home')

// --- OIDC relying-party flow (login/callback/logout) ---
router.get('/auth/login', [controllers.OidcSession, 'login']).as('auth.login')
router.get('/auth/callback', [controllers.OidcSession, 'callback']).as('auth.callback')
router.post('/auth/logout', [controllers.OidcSession, 'logout']).as('auth.logout')

// --- The protected "documents" resource — goal #2 (authz ability gate) and
// goal #4 (media file delivery closed with an ownership + authz check). ---
router
  .group(() => {
    router.get('/', [controllers.Documents, 'index']).as('documents.index')
    router.post('/', [controllers.Documents, 'store']).as('documents.store')
    router.get('/:id/file', [controllers.Documents, 'file']).as('documents.file')
  })
  .prefix('/documents')
  .use(middleware.requireAuth({ redirectTo: '/auth/login' }))

// @adonis-agora/telescope's UI ("ui_provider") mounts its own routes at
// /telescope automatically — gated via config/telescope_ui.ts's `authorize`
// hook (authorizeByRoles ADMIN), not here. Same story for the media console
// at /media/dashboard (config/media_dashboard.ts).
