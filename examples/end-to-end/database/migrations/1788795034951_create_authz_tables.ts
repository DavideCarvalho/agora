import { BaseSchema } from '@adonisjs/lucid/schema'
import { createAuthzTables, dropAuthzTables } from '@adonis-agora/authz'

/**
 * RBAC tables for @adonis-agora/authz. This package NEVER owns a users table — users
 * are referenced polymorphically by (user_type, user_id). The tenant_id column is
 * part of the user-role primary key ('' = the global scope) so the same
 * (user, role) pair can be granted per-tenant independently.
 *
 * The DDL lives in the lib (createAuthzTables / dropAuthzTables) — the SAME code the
 * store runs when autoCreateSchema is on — so this migration can never drift from it.
 * Set autoCreateSchema to false in config/authz.ts when you run this migration.
 */
export default class extends BaseSchema {
  async up() {
    this.defer(async (db) => {
      await createAuthzTables(db)
    })
  }

  async down() {
    this.defer(async (db) => {
      await dropAuthzTables(db)
    })
  }
}