import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Creates the table the 'lucid' telescope store persists entries into.
 *
 * 'content' and 'tags' are JSON text columns; 'created_at' is stored as epoch
 * milliseconds (a plain integer) so newest-first ordering and age-based pruning
 * are driver-agnostic integer comparisons across sqlite / Postgres / MySQL.
 */
export default class extends BaseSchema {
  protected tableName = 'telescope_entries'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary().notNullable()
      table.string('type').notNullable()
      table.string('family_hash').nullable()
      table.text('content').notNullable()
      table.text('tags').notNullable()
      table.integer('sequence').notNullable()
      table.integer('duration_ms').nullable()
      table.string('origin').notNullable()
      table.string('trace_id').nullable()
      table.bigInteger('created_at').notNullable()

      table.index(['created_at'])
      table.index(['type'])
      table.index(['trace_id'])
      table.index(['family_hash'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}