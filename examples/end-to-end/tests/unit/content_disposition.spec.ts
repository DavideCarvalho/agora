import { test } from '@japa/runner'
import { contentDisposition } from '#controllers/documents_controller'

/**
 * GET /documents/:id/file echoes the uploader's file name (`file.clientName`) in
 * `Content-Disposition`. Whatever that name holds, the header must stay valid: Node rejects
 * non-latin1 header values (`ERR_INVALID_CHAR`), and a quote would end `filename="…"` early.
 */
test.group('documents file Content-Disposition', () => {
  test('a plain ASCII name is sent as is', ({ assert }) => {
    assert.equal(contentDisposition('inline', 'report.pdf'), 'inline; filename="report.pdf"')
  })

  test('a non-latin1 name gets an ASCII fallback and an RFC 5987 filename*', ({ assert }) => {
    assert.equal(
      contentDisposition('inline', '报告.pdf'),
      `inline; filename="__.pdf"; filename*=UTF-8''%E6%8A%A5%E5%91%8A.pdf`
    )
  })

  test('quotes, backslashes and control characters are stripped', ({ assert }) => {
    assert.equal(
      contentDisposition('attachment', 'a"b\\c\r\nSet-Cookie: x.pdf'),
      'attachment; filename="abcSet-Cookie: x.pdf"'
    )
  })

  test('an empty or lone-surrogate name still yields a valid header', ({ assert }) => {
    assert.equal(contentDisposition('inline', '""'), 'inline; filename="download"')
    assert.doesNotThrow(() => contentDisposition('inline', '\uD800x.pdf'))
  })

  test('every result is a valid header value', ({ assert }) => {
    for (const name of ['报告.pdf', 'naïve "q".txt', '\u0000 ', "it's (1)*.pdf"]) {
      const value = contentDisposition('inline', name)
      assert.match(value, /^[\x20-\x7e]+$/)
    }
  })
})
