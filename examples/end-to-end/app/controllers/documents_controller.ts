import type { HttpContext } from '@adonisjs/core/http'
import { createReadStream } from 'node:fs'
import authz from '@adonis-agora/authz/services/main'
import media from '@adonis-agora/media/services/main'
import { MediaDeliveryHandler } from '@adonis-agora/media'
import Document from '#models/document'

/**
 * A `Content-Disposition` value that is safe for ANY stored file name. The name comes from the
 * uploader (`file.clientName`), so it can hold quotes, control characters or non-latin1 text
 * (`报告.pdf`) — interpolated raw into `filename="…"` it would break the header, and Node throws
 * `ERR_INVALID_CHAR` on non-latin1 header values. This sends an ASCII `filename` fallback plus the
 * exact name as RFC 6266/5987 `filename*=UTF-8''…` (what every current browser uses).
 */
export function contentDisposition(
  type: 'inline' | 'attachment',
  fileName: string | undefined
): string {
  const clean = (fileName ?? '')
    .toWellFormed()
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f"\\]/g, '')
    .trim()
  const name = clean === '' ? 'download' : clean
  const ascii = name.replace(/[^\x20-\x7e]/g, '_')
  if (ascii === name) return `${type}; filename="${ascii}"`
  const encoded = encodeURIComponent(name).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  )
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

/**
 * The protected resource for goal #2 (authz-gated access) AND goal #4 (media
 * access with NO built-in authorization, wired shut by this controller).
 *
 * Every action reads `ctx.auth.user` (authkit's guard) and checks it against
 * `@adonis-agora/authz` — the exact "structural adapter" pattern documented
 * in adonis-agent's authz-tool-authorizer.ts and used by every
 * `@adonis-agora` dashboard's `authorize` hook: resolve the user, ask authz,
 * deny closed on anything else.
 */
export default class DocumentsController {
  /**
   * GET /documents — list every document. Gated on the "documents.view"
   * permission (see README for how to grant it: `node ace authz:assignments:add`).
   */
  async index({ auth, response }: HttpContext) {
    const user = auth.user
    if (!user) return response.unauthorized({ error: 'Not authenticated' })
    if (!(await authz.can(user, 'documents.view'))) {
      return response.forbidden({ error: 'Forbidden' })
    }

    const documents = await Document.all()
    return response.ok(
      documents.map((doc) => ({ id: doc.id, title: doc.title, ownerUserId: doc.ownerUserId }))
    )
  }

  /**
   * POST /documents — create a document AND attach an uploaded file to it via
   * @adonis-agora/media (owner collections). Gated on "documents.create".
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user
    if (!user) return response.unauthorized({ error: 'Not authenticated' })
    if (!(await authz.can(user, 'documents.create'))) {
      return response.forbidden({ error: 'Forbidden' })
    }

    const title = request.input('title', 'Untitled document')
    const document = await Document.createFor(user.id, title)

    const file = request.file('file')
    if (file?.tmpPath) {
      await media.library.attach({
        ownerType: 'Document',
        ownerId: document.id,
        collection: 'attachment',
        fileName: file.clientName,
        mimeType: file.type ?? 'application/octet-stream',
        contents: createReadStream(file.tmpPath),
      })
    }

    return response.created({ id: document.id, title: document.title })
  }

  /**
   * GET /documents/:id/file — the media DELIVERY route. `MediaDeliveryHandler`
   * itself performs NO authorization by design (see its own docs' "The
   * handler performs NO authorization" callout) — mounting it unguarded would
   * publish every file to anyone who can guess a document id. This is the
   * fix: an ownership check (the caller owns the document) OR-ed with an
   * authz escape hatch ("documents.manage", e.g. granted to ADMIN) before a
   * single byte is ever resolved.
   */
  async file({ auth, params, response }: HttpContext) {
    const user = auth.user
    if (!user) return response.unauthorized({ error: 'Not authenticated' })

    const document = await Document.find(params.id)
    if (!document) return response.notFound({ error: 'Not found' })

    const isOwner = document.ownerUserId === user.id
    const canManage = await authz.can(user, 'documents.manage')
    if (!isOwner && !canManage) {
      return response.forbidden({ error: 'Forbidden' })
    }

    const [record] = await media.library.list('Document', document.id, 'attachment')
    if (!record) return response.notFound({ error: 'No file attached' })

    // `mode: 'proxy'` is a HANDLER constructor option, not a per-call one
    // (`library.deliver(id, { mode })` is the per-call form; `handle()` only
    // takes `{ mediaId, conversion }` — see docs/media/delivery.mdx). Forced
    // here because the local `fs` disk (config/drive.ts) is
    // `visibility: 'private'`, so the default `auto` mode would resolve to
    // `signed` and this action would just redirect to a signed URL — never
    // actually exercising the ownership/authz check's real payoff, which is
    // gating the BYTES themselves. `proxy` is also the documented right mode
    // for storage the internet can't reach at all.
    const delivery = new MediaDeliveryHandler({ library: media.library, mode: 'proxy' })
    const result = await delivery.handle({ mediaId: record.id })

    if (result.kind === 'redirect') return response.redirect(result.url)

    response.header('content-type', result.mimeType)
    if (result.size !== undefined) response.header('content-length', String(result.size))
    response.header('content-disposition', contentDisposition('inline', result.fileName))
    return response.stream(result.stream)
  }
}
