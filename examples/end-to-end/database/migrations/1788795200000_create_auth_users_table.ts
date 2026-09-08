import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The table backing `AuthUser` (app/models/auth_user.ts) — i.e.
 * authkit-server's `withAuthUser()` + `withCredentials()` mixins over
 * `lucidAccountStore`. Same migration `node ace configure
 * @adonis-agora/authkit-server` scaffolds (authkit-server@0.66.0+); it lives
 * here, not inside the package, because AuthKit deliberately treats the
 * account table as host-owned (`ensureAuthkitSchema()` never creates it).
 */
export default class extends BaseSchema {
  protected tableName = 'auth_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      /**
       * A string, NOT `increments()`: the model's `@beforeCreate` hook assigns
       * a `randomUUID()` before the insert.
       */
      table.string('id').notNullable().primary()

      // withAuthUser()
      table.string('email').notNullable().unique()
      table.string('password').notNullable()
      // Serialized as a JSON string ("[]" when empty) by the mixin.
      table.json('global_roles').notNullable().defaultTo('[]')

      // withCredentials()
      table.timestamp('email_verified_at', { useTz: true }).nullable()
      table.string('email_verification_token').nullable()
      table.string('password_reset_token').nullable()
      table.timestamp('password_reset_expires_at', { useTz: true }).nullable()

      // The model's own column (see app/models/auth_user.ts).
      table.string('full_name').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
