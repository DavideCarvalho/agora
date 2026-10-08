// Ad-hoc probe: node tests/e2e/probe.mjs <path> <scenario-id...>
import { chromium } from 'playwright'
const base = process.env.BASE_URL ?? 'http://localhost:3340'
const [path, ...steps] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('console.' + m.type(), m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('pageerror', e.message))
await page.goto(base + path)
await page.waitForTimeout(2500)
for (const step of steps) {
  if (step.startsWith('click:')) await page.click(step.slice(6))
  else if (step.startsWith('wait:')) await page.waitForTimeout(Number(step.slice(5)))
  else if (step === 'reload') await page.reload()
  else await page.click(`[data-scenario="${step}"]`)
  await page.waitForTimeout(1500)
}
await page.waitForTimeout(3000)
await page.screenshot({ path: `tmp/probe.png` })
console.log((await page.innerText('main')).slice(0, 3000))
await browser.close()
