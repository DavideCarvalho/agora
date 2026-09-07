import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * The 'media' table for the @adonis-agora/media 'lucid' store. JSON payloads ('custom_properties',
 * 'conversions') are stored as TEXT — the store (de)serializes them — and timestamps as epoch-ms
 * integers, so the schema is portable across SQLite / Postgres / MySQL.
 */
export default class extends BaseSchema {
  protected tableName = 'media'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('owner_type').notNullable()
      table.string('owner_id').notNullable()
      table.string('collection').notNullable()
      table.string('name').notNullable()
      table.string('file_name').notNullable()
      table.string('mime_type').notNullable()
      table.bigInteger('size').notNullable()
      table.string('disk').notNullable()
      table.text('path').notNullable()
      table.integer('order').notNullable().defaultTo(0)
      table.text('custom_properties')
      table.text('conversions')
      table.bigInteger('created_at').notNullable()
      table.bigInteger('updated_at').notNullable()
      table.index(['owner_type', 'owner_id'], 'media_owner_idx')
      table.index(['owner_type', 'owner_id', 'collection'], 'media_owner_collection_idx')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}