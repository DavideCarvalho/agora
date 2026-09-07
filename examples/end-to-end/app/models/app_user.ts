import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

/**
 * This app's own domain user — distinct from `AuthUser` (the identity-provider
 * side model authkit-server's `withAuthUser()`/`withCredentials()` mixins
 * compose). In topology A (this example) the host is its own OIDC client, so
 * both models describe the same human, but keeping them separate mirrors what
 * every multi-app deployment needs: the IdP owns identity/credentials,
 * relying-party apps own whatever profile data *they* care about.
 *
 * `id` is the OIDC `sub` claim (`identity.userId`) — a string, not an
 * auto-increment integer, so it lines up 1:1 with the AuthUser id it was
 * minted from. `documents.ownerUserId` (see #models/document) references
 * this id, and `@adonis-agora/authz` grants/roles are assigned against it too.
 */
export default class AppUser extends BaseModel {
  /**
   * The app assigns `id` itself (the OIDC `sub`, via `resolveUser` in
   * config/authkit_client.ts) — without this, Lucid assumes a DB-generated
   * primary key and overwrites the in-memory `id` after INSERT with
   * SQLite's internal integer `lastInsertRowid` (see the identical note on
   * #models/document, where this was caught first). It happened to go
   * unnoticed on the `updateOrCreate()` path `resolveUser` uses in the real
   * request flow, but surfaced immediately in a direct `.create()` call
   * (this example's own unit tests) — same root cause, so fixed the same
   * way rather than left to depend on which Lucid method happens to be
   * called.
   */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare fullName: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
