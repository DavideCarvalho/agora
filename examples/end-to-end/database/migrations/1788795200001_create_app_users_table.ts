import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * This app's own domain user (see #models/app_user) — `id` is the OIDC `sub`
 * claim, so it is a string primary key rather than an auto-increment integer.
 */
export default class extends BaseSchema {
  protected tableName = 'app_users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('email').notNullable()
      table.string('full_name').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
