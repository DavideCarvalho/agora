/**
 * Shield's CSRF token, as the `X-XSRF-TOKEN` header. `config/shield.ts` sets `enableXsrfCookie`, so
 * the token rides a readable `XSRF-TOKEN` cookie; read it per request (it rotates). The native page
 * does not need this file — `<AgentProvider>` does the same on its own.
 */
export function xsrfHeaders(): Record<string, string> {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
  return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]!) } : {}
}

/** `fetch` with the session cookie and the CSRF header — for clients that let you swap `fetch`. */
export const csrfFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers)
  for (const [name, value] of Object.entries(xsrfHeaders())) headers.set(name, value)
  return fetch(input, { ...init, headers, credentials: 'same-origin' })
}
