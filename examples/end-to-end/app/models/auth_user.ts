import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withAuthUser, withCredentials } from '@adonis-agora/authkit-server'
import { randomUUID } from 'node:crypto'

/**
 * Por padrão o AuthKit cria/usa as tabelas na conexão DEFAULT da aplicação
 * (config/database.ts) — não força nenhum banco/schema próprio.
 *
 * Se você quiser isolar o AuthKit num schema ou banco dedicado, defina uma
 * conexão no config/database.ts do app e referencie aqui, ex.:
 *
 *   static connection = 'auth'
 *
 * (e aponte as migrations correspondentes para essa conexão).
 */
export default class AuthUser extends compose(BaseModel, withAuthUser(), withCredentials()) {
  @column({ isPrimary: true })
  declare id: string

  /**
   * Also required, also undocumented: none of getting-started.mdx,
   * starter.mdx, or account-store.mdx show a `@beforeCreate` hook (or any
   * other id-generation) on `AuthUser`, yet the Lucid store's `.create()`
   * (lucid_store/core.js) does a bare `Model.create({ email, password, ... })`
   * with no `id` field — it fully expects the HOST model to self-assign a
   * primary key. `id` is a plain string column (not an INTEGER autoincrement),
   * so SQLite happily inserts it as NULL with no error. The first
   * signup/login then serializes that as the STRING `"null"` into the OIDC
   * session (`accountId: "null"`), and the very next account lookup —
   * `WHERE id = 'null'` instead of `WHERE id IS NULL` — finds nothing,
   * surfacing minutes later as the oidc-provider's generic
   * "oops! something went wrong" page with no indication the real cause was
   * a missing id. Reproduced by copying the documented model verbatim; see
   * this repo's README.
   */
  @beforeCreate()
  static assignUuid(user: AuthUser) {
    user.id = randomUUID()
  }

  /**
   * Required even though authkit-server's own docs (getting-started.mdx,
   * starter.mdx, account-store.mdx) show `AuthUser` with only `id` beyond the
   * mixins. The bundled Edge signup screen collects a "Name" field
   * unconditionally, and the Lucid store's `.create()` always passes
   * `fullName: input.fullName ?? null` straight into `AuthUser.create(...)`
   * (see `lucid_store/core.js`) — without this column Lucid throws `Cannot
   * define "fullName" on "AuthUser" model, since it is not defined as a
   * model property` on the very first signup. Reproduced by following the
   * documented minimal model verbatim; see this repo's README.
   */
  @column()
  declare fullName: string | null
}