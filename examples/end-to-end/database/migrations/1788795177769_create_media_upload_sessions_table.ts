import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Tables for the @adonis-agora/media resumable (TUS) 'lucid' session store. 'media_upload_sessions'
 * persists offset/length/metadata/expiry so a dropped upload resumes; 'media_upload_parts' is the
 * per-part ETag side-index used to assemble native S3 multipart uploads. JSON 'metadata' is stored as
 * TEXT and timestamps as epoch-ms integers, so the schema is portable across SQLite / Postgres / MySQL.
 * Only needed if you enable 'uploads.resumable' with the 'lucid' session store.
 */
export default class extends BaseSchema {
  protected sessionsTable = 'media_upload_sessions'
  protected partsTable = 'media_upload_parts'

  async up() {
    this.schema.createTable(this.sessionsTable, (table) => {
      table.string('id').primary()
      table.string('disk').notNullable()
      table.text('key').notNullable()
      table.string('content_type').nullable()
      table.bigInteger('size').nullable()
      table.bigInteger('offset').notNullable().defaultTo(0)
      table.integer('parts').notNullable().defaultTo(0)
      table.string('multipart_upload_id').nullable()
      table.text('metadata').nullable()
      table.bigInteger('created_at').notNullable()
      table.bigInteger('expires_at').nullable()
      table.index(['disk'], 'media_upload_sessions_disk_idx')
    })

    this.schema.createTable(this.partsTable, (table) => {
      table.string('session_id').notNullable()
      table.integer('part_number').notNullable()
      table.string('etag').notNullable()
      table.primary(['session_id', 'part_number'])
    })
  }

  async down() {
    this.schema.dropTable(this.partsTable)
    this.schema.dropTable(this.sessionsTable)
  }
}