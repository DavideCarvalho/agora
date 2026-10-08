/**
 * Row 6 of the comparison: what a client that cannot draw everything receives on the native stream.
 *   - text-only (`uiCapabilities: { components: [] }`): not offered `ui__render`; tool pushes arrive
 *     as their `fallbackText`, and no skeleton is sent.
 *   - draws `Card` and `KpiCards` only: the dashboard tree previews what it can, is withdrawn, and
 *     arrives as text.
 *
 *   node ace serve &   # then:
 *   node scripts/text_clients.mjs      # BASE_URL=http://localhost:3333 by default
 */
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const clients = [
  { name: 'text-only', uiCapabilities: { components: [] }, message: 'Show my recent orders' },
  {
    name: 'Card + KpiCards',
    uiCapabilities: { components: [{ name: 'Card', version: 1 }, { name: 'KpiCards', version: 1 }] },
    message: 'Show a dashboard with a chart of revenue by month plus the top 3 orders',
  },
]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`${base}/native`) // the session cookie and the CSRF token
for (const client of clients) {
  const sse = await page.evaluate(async ({ message, uiCapabilities }) => {
    const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] ?? '')
    const response = await fetch('/agent/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-XSRF-TOKEN': token },
      body: JSON.stringify({ message, uiCapabilities }),
    })
    return response.text()
  }, client)
  const events = sse
    .split('\n')
    .filter((line) => line.startsWith('data: {'))
    .map((line) => JSON.parse(line.slice(6)))
  const ui = events.filter((event) => event.kind === 'ui')
  console.log(`--- ${client.name}: "${client.message}"`)
  console.log(`ui events: ${ui.length} (${ui.filter((event) => event.partial).length} previews)`)
  console.log(events.filter((event) => event.kind === 'text').map((event) => event.text).join(''))
}
await browser.close()
