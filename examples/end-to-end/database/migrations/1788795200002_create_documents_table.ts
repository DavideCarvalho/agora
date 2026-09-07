import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The protected resource this example gates with @adonis-agora/authz: a
 * "documents.view"/"documents.create" ability check on the list/create routes,
 * plus an OWNERSHIP check (owner_user_id === the caller) on the file download
 * route — see app/controllers/documents_controller.ts.
 */
export default class extends BaseSchema {
  protected tableName = 'documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.string('owner_user_id').notNullable().references('id').inTable('app_users')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
