import app from '@adonisjs/core/services/app'
import { AuthzService, defineAuthzAbilities } from '@adonis-agora/authz'

/**
 * Static, DB-backed Bouncer abilities for @adonis-agora/authz. Bouncer has no runtime
 * API to register one ability per DB row, so we register a small fixed set whose
 * body consults the AuthzService (which reads roles/permissions from the store
 * and applies wildcard matching, e.g. "posts.*" covers "posts.edit").
 *
 * Register them with your bouncer instance / middleware, then check:
 *
 *   await ctx.bouncer.allows('can', 'posts.edit', post)
 *   await ctx.bouncer.authorize('hasRole', 'admin')
 *
 * In Edge templates:
 *
 *   @can('can', 'posts.edit')
 *     <a href="...">Edit</a>
 *   @end
 */
const service = await app.container.make(AuthzService)

export const { can, hasRole } = defineAuthzAbilities(service)