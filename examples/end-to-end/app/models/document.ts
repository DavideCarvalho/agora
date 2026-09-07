import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import { randomUUID } from 'node:crypto'

export default class Document extends BaseModel {
  /**
   * Tells Lucid the app assigns `id` itself (a UUID, via `createFor` below) —
   * without this, Lucid assumes a DB-generated primary key and overwrites
   * the in-memory `id` after INSERT with SQLite's internal integer
   * `lastInsertRowid`. The row itself is stored correctly either way (the
   * INSERT statement includes the real UUID); only the JS object returned
   * from `.create()` gets clobbered, which silently breaks the very next
   * line that reads `document.id`. Base AdonisJS/Lucid + SQLite behavior,
   * not specific to any of the Agora libraries this example wires up.
   */
  static selfAssignPrimaryKey = true

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare ownerUserId: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  static async createFor(ownerUserId: string, title: string) {
    return Document.create({ id: randomUUID(), ownerUserId, title })
  }
}
