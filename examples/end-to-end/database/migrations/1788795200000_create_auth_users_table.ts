import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The table backing `AuthUser` (app/models/auth_user.ts), i.e. authkit-server's
 * `withAuthUser()` + `withCredentials()` mixins over `lucidAccountStore`.
 *
 * NOT published by `node ace configure @adonis-agora/authkit-server` — this is
 * hand-written glue. Worth flagging: neither authkit-server's getting-started
 * nor its quickstart doc mentions this migration at all, despite both walking
 * through exactly this `adapters.database` + `lucidAccountStore(AuthUser)`
 * setup; the first signup/login attempt without it fails with a raw
 * `SqliteError: no such table: auth_users` rather than a clear boot-time
 * check (contrast with authz, which either auto-creates its tables or ships
 * a migration + `createAuthzTables` helper for exactly this case). Columns
 * below are read straight off the two mixins' `@column()` declarations
 * (`with_auth_user.js` / `with_credentials.js`) since no schema helper exists
 * to generate them from.
 */
export default class extends BaseSchema {
  protected tableName = 'auth_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('email').notNullable().unique()
      table.string('password').notNullable()
      // See app/models/auth_user.ts for why this column exists.
      table.string('full_name').nullable()
      table.text('global_roles').notNullable().defaultTo('[]')
      table.timestamp('email_verified_at').nullable()
      table.string('email_verification_token').nullable()
      table.string('password_reset_token').nullable()
      table.timestamp('password_reset_expires_at').nullable()
      // No created_at/updated_at: app/models/auth_user.ts (mirroring the
      // docs' own example) declares no such columns, and the mixins don't
      // either — adding them here with no model column to populate them
      // would just violate NOT NULL on the very first insert.
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
