import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withAuthUser, withCredentials } from '@adonis-agora/authkit-server'
import { randomUUID } from 'node:crypto'

/**
 * The IdP-side account model. Same shape `node ace configure
 * @adonis-agora/authkit-server` scaffolds (authkit-server@0.66.0+), with the
 * comments translated — nothing here is app-specific.
 *
 * By default AuthKit uses the app's DEFAULT database connection
 * (config/database.ts); set `static connection = 'auth'` (and point the
 * matching migrations at it) to isolate it on a dedicated one.
 */
export default class AuthUser extends compose(BaseModel, withAuthUser(), withCredentials()) {
  /**
   * Required together with the `@beforeCreate` hook below: without it Lucid
   * overwrites the assigned UUID with the raw INSERT result (the database's
   * internal rowid) as soon as the row is saved.
   */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  /** Neither mixin generates the primary key — the host model owns it. */
  @beforeCreate()
  static assignUuid(user: AuthUser) {
    user.id = randomUUID()
  }

  /**
   * Not from a mixin: the built-in signup screen always collects a "Name"
   * field and the Lucid account store passes it straight to
   * `AuthUser.create()`.
   */
  @column()
  declare fullName: string | null
}
