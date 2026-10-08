/**
 * Drives every scenario on every page in headless Chromium, saving screenshots to
 * docs/screenshots/ and what each page showed to tests/e2e/.output/results.json.
 *
 *   node ace serve --watch     # in another terminal (PORT=3333 by default)
 *   pnpm e2e                    # BASE_URL=http://localhost:3333
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:3333'
const only = process.argv[2]
const shots = new URL('../../docs/screenshots/', import.meta.url).pathname
const output = new URL('./.output/', import.meta.url).pathname
await mkdir(shots, { recursive: true })
await mkdir(output, { recursive: true })

const pages = {
  native: { newChat: '.threads .new', midSelector: 'text=loading 2/6', langDelay: 0 },
  copilotkit: { newChat: '.threads .new', midSelector: 'text=loading 2/6', langDelay: 0 },
  openui: { newChat: 'text=New Chat', midSelector: 'text=Called the revenue_by_month tool', midWait: 1700, langDelay: 3000 },
}

const browser = await chromium.launch()
const results = {}
for (const [name, cfg] of Object.entries(pages)) {
  if (only && only !== name) continue
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()
  const log = []
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && log.push(`console: ${m.text().slice(0, 200)}`))
  const r = (results[name] = { log })
  const text = async () => (await page.innerText('main')).replace(/\s+/g, ' ')
  const shot = (file) => page.screenshot({ path: `${shots}${name}-${file}.png` })
  const scenario = async (id) => page.click(`[data-scenario="${id}"]`)
  const newChat = async () => {
    await page.click(cfg.newChat)
    await page.waitForTimeout(800)
  }

  await page.goto(`${base}/${name}`)
  await page.waitForTimeout(2500)
  await page.evaluate(async () => {
    const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] ?? '')
    await fetch('/demo/reset', { method: 'POST', headers: { 'X-XSRF-TOKEN': token } })
  })

  // 2. Progressive render (first, so the page is fresh).
  await scenario('revenue')
  // Mid-stream: the first partial state each page shows (a chart with some months / a header).
  await page.waitForSelector(cfg.midSelector, { timeout: 15000 }).catch(() => log.push('mid selector missed'))
  await page.waitForTimeout(cfg.midWait ?? 0)
  await shot('2-progressive-mid')
  r.progressiveMid = await text()
  await page.waitForTimeout(6000 + cfg.langDelay)
  await shot('2-progressive-final')
  r.progressiveFinal = await text()

  // 3. Model-composed dashboard.
  await newChat()
  await scenario('dashboard')
  await page.waitForTimeout(4000 + cfg.langDelay)
  await shot('3-dashboard')
  r.dashboard = await text()

  // 7. Invalid props.
  await newChat()
  await scenario('invalid')
  await page.waitForTimeout(4000 + cfg.langDelay)
  await shot('7-invalid')
  r.invalid = await text()

  // 1. Tool-driven component, then 4. its Refund buttons → approval.
  await newChat()
  await scenario('orders')
  await page.waitForTimeout(3500 + cfg.langDelay)
  await shot('1-orders')
  r.orders = await text()

  const refund = (id) =>
    name === 'openui' ? page.click(`button:has-text("Refund #${id}")`) : page.click(`[data-testid="refund-${id}"]`)
  await refund('1002')
  await page.waitForTimeout(2500)
  await shot('4-approval')
  r.approvalShown = (await page.locator('[data-testid="approval"]').count()) > 0
  await page.click('[data-testid="approval"] button:has-text("Approve"), [data-testid="approval"] button:has-text("Refund")')
  await page.waitForTimeout(3000 + cfg.langDelay)
  await shot('4-approved')
  r.approved = await text()
  await refund('1003').catch((e) => log.push(`refund 1003: ${e.message}`))
  await page.waitForTimeout(2500)
  if (await page.locator('[data-testid="approval"]').count()) {
    await page.click('[data-testid="approval"] button:has-text("Reject")')
  }
  await page.waitForTimeout(3000 + cfg.langDelay)
  await shot('4-rejected')
  r.rejected = await text()

  // 5. Persistence: reload; reopen the thread from the list if the page did not.
  await page.reload()
  await page.waitForTimeout(3500)
  r.afterReloadUrl = page.url()
  r.afterReload = await text()
  if (name === 'openui') {
    await page.click('text=Show my recent orders')
    await page.waitForTimeout(2500)
    r.afterReopen = await text()
  }
  await shot('5-reloaded')
  await context.close()
}
await browser.close()
await writeFile(`${output}results${only ? `-${only}` : ''}.json`, JSON.stringify(results, null, 2))
for (const [name, r] of Object.entries(results)) console.log(name, 'errors:', r.log.length, r.log.slice(0, 5))
