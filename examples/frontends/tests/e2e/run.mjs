/**
 * Drives every scenario on every page in headless Chromium, saving screenshots to
 * docs/screenshots/ and what each page showed to tests/e2e/.output/results.json.
 *
 *   node ace serve --hmr       # in another terminal (PORT=3333 by default)
 *   pnpm e2e native             # one page at a time: native, copilotkit, openui, a2ui,
 *                               # copilotkit-a2ui, matrix (all of them in one process needs a lot of memory)
 *
 * A check that fails is logged as `FAIL: …` and makes the run exit non-zero.
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
  // `dashMid`: the dashboard while the model is still writing it — on the native page, the streamed
  // tree with the chart still a placeholder. `ordersLoading`: the orders table before its rows.
  native: { newChat: '.threads .new', dashMid: '[data-testid="chart-skeleton"]', midSelector: 'text=loading 2/6', ordersLoading: '[data-testid="order-list-skeleton"]', langDelay: 0 },
  copilotkit: { newChat: '.threads .new', dashMid: 'text=Sales dashboard', midSelector: 'text=loading 2/6', ordersLoading: 'text=Looking up orders…', langDelay: 0 },
  openui: { newChat: 'text=New Chat', dashMid: '.openui-agent-thread-container >> text=Sales dashboard', midSelector: 'text=Called the revenue_by_month tool', midWait: 1700, langDelay: 3000 },
}

const browser = await chromium.launch()
const results = {}

/** What every run gets: a fresh browser context, its log, checks, screenshots, the page's text. */
async function open(name, path) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
  const page = await context.newPage()
  const log = []
  page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && log.push(`console: ${m.text().slice(0, 200)}`))
  const r = (results[name] = { log })
  const h = {
    context,
    page,
    log,
    r,
    check: (ok, message) => {
      if (ok) return
      log.push(`FAIL: ${message}`)
      process.exitCode = 1
    },
    text: async () => (await page.innerText('main')).replace(/\s+/g, ' '),
    shot: (file) => page.screenshot({ path: `${shots}${name}-${file}.png`, timeout: 90000 }),
    scenario: async (id) => page.click(`[data-scenario="${id}"]`),
    goto: async () => {
      await page.goto(`${base}${path}`)
      await page.waitForTimeout(2500)
    },
  }
  await h.goto()
  await page.evaluate(async () => {
    const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]*)/)?.[1] ?? '')
    await fetch('/demo/reset', { method: 'POST', headers: { 'X-XSRF-TOKEN': token } })
  })
  return h
}

/**
 * 8. The sandbox: the model writes a bill splitter into a `Sandbox`; it must go placeholder →
 * preview → live while it streams, validate its input inside the iframe, and its button must start a
 * follow-up turn that the assistant answers with the numbers it was sent.
 */
async function sandboxScenario(h, { langDelay = 0 } = {}) {
  const { page, r, log, check, shot } = h
  // Record every phase any sandbox element shows, however briefly.
  await page.evaluate(() => {
    window.__phases = []
    const record = () => {
      for (const el of document.querySelectorAll('[data-sandbox-phase]')) {
        const phase = el.getAttribute('data-sandbox-phase')
        if (!window.__phases.includes(phase)) window.__phases.push(phase)
      }
    }
    new MutationObserver(record).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-sandbox-phase'],
    })
  })
  await h.scenario('sandbox')
  await page
    .waitForSelector('[data-testid="sandbox-placeholder"]:has-text("bill splitter")', { timeout: 15000 })
    .then(() => shot('8-sandbox-placeholder'))
    .catch(() => log.push('sandbox placeholder missed'))
  await page
    .waitForSelector('iframe[data-sandbox-phase="preview"]', { timeout: 15000 })
    .then(() => shot('8-sandbox-preview'))
    .catch(() => log.push('sandbox preview missed'))
  await page.waitForSelector('iframe[data-sandbox-phase="live"]', { timeout: 30000 })
  const frame = page.frameLocator('iframe[data-sandbox-phase="live"]').last()
  await frame.locator('#each', { hasText: '$46.00' }).waitFor({ timeout: 15000 })
  await page.waitForTimeout(1500 + langDelay)
  await shot('8-sandbox-live')
  r.sandboxLive = await h.text()

  // Inside the iframe: invalid input disables the button, a valid change recomputes.
  await frame.locator('#people').fill('0')
  check(await frame.locator('#settle').isDisabled(), 'sandbox: zero people should disable the button')
  r.sandboxInvalid = await frame.locator('#err').innerText()
  check(/whole number/.test(r.sandboxInvalid), `sandbox: no validation message (${r.sandboxInvalid})`)
  await frame.locator('#people').fill('4')
  await frame.locator('#each', { hasText: '$34.50' }).waitFor({ timeout: 5000 })

  // agent.send → a UiAction → the next turn → the assistant settles it.
  await frame.locator('#settle').click()
  const answer = 'Each of the 4 people pays $34.50'
  await page
    .waitForSelector(`text=${answer}`, { timeout: 30000 })
    .catch(() => check(false, `sandbox: follow-up answer "${answer}" missing`))
  await page.waitForTimeout(1500 + langDelay)
  await shot('8-sandbox-followup')
  r.sandboxFollowup = await h.text()
  r.sandboxPhases = await page.evaluate(() => window.__phases)
  for (const phase of ['placeholder', 'preview', 'live']) {
    check(r.sandboxPhases.includes(phase), `sandbox: phase "${phase}" never shown (${r.sandboxPhases})`)
  }
}

for (const [name, cfg] of Object.entries(pages)) {
  if (only && only !== name) continue
  const h = await open(name, `/${name}`)
  const { page, log, r, text, shot, scenario, check } = h
  const newChat = async () => {
    await page.click(cfg.newChat)
    await page.waitForTimeout(800)
  }

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
  // Mid-stream: while the model is still writing the layout (ui__render arguments / OpenUI Lang).
  await page.waitForSelector(cfg.dashMid, { timeout: 15000 }).catch(() => log.push('dashboard mid missed'))
  await shot('3-dashboard-mid')
  r.dashboardMid = await text()
  r.dashboardMidSkeletons = await page.locator('[data-genui-skeleton]').count()
  await page.waitForTimeout(4000 + cfg.langDelay)
  await shot('3-dashboard')
  r.dashboard = await text()

  // 7. Invalid props.
  await newChat()
  await scenario('invalid')
  await page.waitForTimeout(4000 + cfg.langDelay)
  await shot('7-invalid')
  r.invalid = await text()

  // 8. Sandboxed generated UI → its button → a follow-up turn.
  await newChat()
  await sandboxScenario(h, { langDelay: cfg.langDelay })

  // 1. Tool-driven component, then 4. its Refund buttons → approval.
  await newChat()
  await scenario('orders')
  if (cfg.ordersLoading) {
    await page.waitForSelector(cfg.ordersLoading, { timeout: 15000 }).catch(() => log.push('orders loading missed'))
    await shot('1-orders-loading')
    r.ordersLoading = await text()
  }
  // The read takes 1.5 s (list_orders), then OpenUI's model writes the list.
  await page.waitForSelector('[data-testid="order-list"]', { timeout: 20000 }).catch(() => log.push('order list missed'))
  await page.waitForTimeout(1500 + cfg.langDelay)
  r.skeletonsAfterOrders = await page.locator('[data-genui-skeleton]').count()
  await shot('1-orders')
  r.orders = await text()

  // The same app component on every page — on OpenUI as a custom library component.
  const refund = (id) => page.locator(`[data-testid="refund-${id}"]`).last().click()
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
  r.skeletonsAfterReload = await page.locator('[data-genui-skeleton]').count()
  if (name === 'openui') {
    await page.click('text=Show my recent orders')
    await page.waitForTimeout(2500)
    r.afterReopen = await text()
  }
  await shot('5-reloaded')
  await h.context.close()
}

/**
 * The /a2ui page: Google's official A2UI React renderer over `POST /agent/a2ui`. The orders table is
 * the app's `OrderList` mapped onto basic components (its Refund buttons raise the A2UI event
 * `refund`), the approval is a surface with Approve / Reject buttons, the dashboard is the builtins on
 * the basic catalog, and the sandbox is a custom component of the page's catalog.
 */
if (!only || only === 'a2ui') {
  const h = await open('a2ui', '/a2ui')
  const { page, log, r, text, shot, scenario, check } = h
  const refund = (id) =>
    page.locator(`xpath=//*[normalize-space(text())='#${id}']/ancestor::*[.//button][1]//button`).last().click()

  // 1. Tool-driven component: the skeleton (its text — A2UI has no skeleton), then the rows.
  await scenario('orders')
  await page.waitForSelector('text=Your orders: loading…', { timeout: 15000 }).then(() => shot('1-orders-loading')).catch(() => log.push('orders loading missed'))
  await page.waitForSelector('text=Ada Lovelace', { timeout: 20000 }).catch(() => check(false, 'a2ui: orders table missing'))
  await page.waitForTimeout(1500)
  await shot('1-orders')
  r.orders = await text()
  check(!r.orders.includes('loading…') && r.orders.includes('Edsger Dijkstra'), 'a2ui: the skeleton was not replaced by the rows')

  // 4. Refund (an A2UI action) → approval surface → Approve / Reject (A2UI actions too).
  await refund('1002')
  await page.waitForSelector('button:has-text("Approve")', { timeout: 15000 }).catch(() => check(false, 'a2ui: approval surface missing'))
  await page.waitForTimeout(800)
  await shot('4-approval')
  r.approval = await text()
  await page.locator('button:has-text("Approve")').last().click()
  await page.waitForSelector('text=refunded $129.99', { timeout: 20000 }).catch(() => check(false, 'a2ui: refund result missing'))
  await page.waitForTimeout(1000)
  await shot('4-approved')
  r.approved = await text()
  await refund('1003')
  await page.locator('button:has-text("Reject")').nth(1).waitFor({ timeout: 15000 }).catch(() => check(false, 'a2ui: second approval missing'))
  await page.waitForTimeout(500)
  await page.locator('button:has-text("Reject")').last().click()
  await page.waitForSelector('text=/Order #1003 was/', { timeout: 20000 }).catch(() => check(false, 'a2ui: rejection result missing'))
  await page.waitForTimeout(1000)
  await shot('4-rejected')
  r.rejected = await text()
  check(/not\s*refunded/.test(r.rejected), 'a2ui: rejected refund should say "not refunded"')

  // 3. The model-composed dashboard, streamed into one surface (a fresh thread: reload).
  await h.goto()
  await scenario('dashboard')
  await page.waitForSelector('text=Sales dashboard', { timeout: 15000 }).then(() => shot('3-dashboard-mid')).catch(() => log.push('dashboard mid missed'))
  r.dashboardMid = await text()
  await page.waitForSelector('text=Revenue is up 50%', { timeout: 30000 }).catch(() => check(false, 'a2ui: dashboard did not finish'))
  await page.waitForTimeout(1000)
  await shot('3-dashboard')
  r.dashboard = await text()
  check(r.dashboard.includes('Top 3 orders') && r.dashboard.includes('Alan Turing'), 'a2ui: dashboard table missing')

  // 8. The sandbox, as a custom A2UI component; its agent.send is an A2UI action.
  await h.goto()
  await sandboxScenario(h)
  await h.context.close()
}

/**
 * /copilotkit?renderer=a2ui: CopilotKit's own A2UI renderer draws the `a2ui-surface` activities the
 * AG-UI route adds (`agUiAdapter({ a2ui })`); none of this app's renderers are involved.
 */
if (!only || only === 'copilotkit-a2ui') {
  const h = await open('copilotkit-a2ui', '/copilotkit?renderer=a2ui')
  const { page, log, r, text, shot, scenario, check } = h
  const newChat = async () => {
    await page.click('.threads .new')
    await page.waitForTimeout(800)
  }
  await scenario('dashboard')
  await page.waitForSelector('text=Revenue is up 50%', { timeout: 30000 }).catch(() => check(false, 'copilotkit-a2ui: dashboard did not finish'))
  await page.waitForTimeout(1000)
  await shot('3-dashboard')
  r.dashboard = await text()
  check(r.dashboard.includes('Top 3 orders') && r.dashboard.includes('Alan Turing'), 'copilotkit-a2ui: dashboard surface missing')

  await newChat()
  await scenario('orders')
  await page.waitForSelector('text=Edsger Dijkstra', { timeout: 20000 }).catch(() => check(false, 'copilotkit-a2ui: orders surface missing'))
  await page.waitForTimeout(1500)
  await shot('1-orders')
  r.orders = await text()
  // The Refund button is an A2UI action: CopilotKit forwards it as `forwardedProps.a2uiAction`.
  await page.locator(`xpath=//*[normalize-space(text())='#1002']/ancestor::*[.//button][1]//button`).last().click()
  await page.waitForSelector('[data-testid="approval"]', { timeout: 15000 }).catch(() => check(false, 'copilotkit-a2ui: approval missing'))
  await page.waitForTimeout(800)
  await shot('4-approval')
  await page.click('[data-testid="approval"] button:has-text("Approve")').catch((e) => log.push(`approve: ${e.message}`))
  await page.waitForSelector('text=refunded $129.99', { timeout: 20000 }).catch(() => check(false, 'copilotkit-a2ui: refund result missing'))
  await page.waitForTimeout(1000)
  await shot('4-approved')
  r.approved = await text()

  // The sandbox has no basic-catalog component: this renderer gets its summary as text.
  await newChat()
  await scenario('sandbox')
  await page.waitForSelector('text=Splits a $120 bill', { timeout: 30000 }).catch(() => check(false, 'copilotkit-a2ui: sandbox text fallback missing'))
  await page.waitForTimeout(2000)
  await shot('8-sandbox')
  r.sandbox = await text()
  await h.context.close()
}

if (!only || only === 'matrix') {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1300 } })
  await page.goto(`${base}/`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${shots}matrix.png` })
}
await browser.close()
await writeFile(`${output}results${only ? `-${only}` : ''}.json`, JSON.stringify(results, null, 2))
for (const [name, r] of Object.entries(results)) console.log(name, 'errors:', r.log.length, r.log.slice(0, 5))
