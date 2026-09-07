import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import authz from '@adonis-agora/authz/services/main'
import { AuthzService } from '@adonis-agora/authz'
import AppUser from '#models/app_user'
import Document from '#models/document'
import { randomUUID } from 'node:crypto'

/** Writing to the store needs the resolved service instance (per authz's own
 * getting-started doc: "Writing to the store needs the service instance. For
 * *reading* a decision anywhere in the app, import the singleton instead").
 * The `authz` singleton above only forwards the read-only query methods. */
const authzService = () => app.container.make(AuthzService)

/**
 * Fast, deterministic coverage of the exact authorization decisions
 * app/controllers/documents_controller.ts relies on — no HTTP, no OIDC
 * dance. The OIDC login flow itself (signup -> consent -> callback) is
 * covered by ./smoke-test.sh, which drives it for real over HTTP against a
 * running dev server; reproducing that dance inside a Japa test would mean
 * re-implementing PKCE, CSRF-token handling, and the interaction prompts
 * only to re-test the same authz decisions this file already isolates.
 *
 * These tests exercise the REAL @adonis-agora/authz service (the 'lucid'
 * store, same as production — see config/authz.ts) against the app's own
 * SQLite database, truncated before each test.
 */
test.group('documents authorization', (group) => {
  // Truncates every table (including authz's) before each test, so the
  // catalog seeded by `node ace authz:sync` in a real boot does NOT survive
  // here — each test grants the roles/permissions it needs directly through
  // the store, the same idempotent calls `authz:sync` itself makes from
  // config/authz.ts's `catalog`. Self-contained: no dependency on migration
  // or seed command side effects having already run.
  group.each.setup(() => testUtils.db().truncate())

  const seedCatalog = async () => {
    const { store } = await authzService()
    await store.givePermissionToRole('member', 'documents.view')
    await store.givePermissionToRole('member', 'documents.create')
    await store.givePermissionToRole('ADMIN', 'documents.*')
  }

  test('a user with no roles cannot view or create documents', async ({ assert }) => {
    await seedCatalog()
    const user = await AppUser.create({ id: randomUUID(), email: 'anon@example.com' })

    assert.isFalse(await authz.can(user, 'documents.view'))
    assert.isFalse(await authz.can(user, 'documents.create'))
  })

  test('the "member" role grants view + create but not manage', async ({ assert }) => {
    await seedCatalog()
    const user = await AppUser.create({ id: randomUUID(), email: 'member@example.com' })
    await (await authzService()).store.assignRole({ type: 'user', id: user.id }, 'member')

    assert.isTrue(await authz.can(user, 'documents.view'))
    assert.isTrue(await authz.can(user, 'documents.create'))
    assert.isFalse(await authz.can(user, 'documents.manage'))
  })

  test('the "ADMIN" role grants every documents.* permission via the wildcard', async ({
    assert,
  }) => {
    await seedCatalog()
    const user = await AppUser.create({ id: randomUUID(), email: 'admin@example.com' })
    await (await authzService()).store.assignRole({ type: 'user', id: user.id }, 'ADMIN')

    assert.isTrue(await authz.can(user, 'documents.view'))
    assert.isTrue(await authz.can(user, 'documents.create'))
    assert.isTrue(await authz.can(user, 'documents.manage'))
  })

  test('ownership OR "documents.manage" is what the file route actually gates on', async ({
    assert,
  }) => {
    await seedCatalog()
    const owner = await AppUser.create({ id: randomUUID(), email: 'owner@example.com' })
    const stranger = await AppUser.create({ id: randomUUID(), email: 'stranger@example.com' })
    const admin = await AppUser.create({ id: randomUUID(), email: 'admin2@example.com' })
    await (await authzService()).store.assignRole({ type: 'user', id: admin.id }, 'ADMIN')

    const doc = await Document.createFor(owner.id, 'Some document')

    // Mirrors app/controllers/documents_controller.ts#file exactly.
    const decisionFor = async (user: AppUser) => {
      const isOwner = doc.ownerUserId === user.id
      const canManage = await authz.can(user, 'documents.manage')
      return isOwner || canManage
    }

    assert.isTrue(await decisionFor(owner), 'the owner may always read their own file')
    assert.isFalse(await decisionFor(stranger), 'a stranger with no grant is denied')
    assert.isTrue(await decisionFor(admin), 'ADMIN reaches it via documents.manage, not ownership')
  })
})
