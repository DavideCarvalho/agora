/**
 * Row 6 of the comparison — the same component, for surfaces that cannot draw it:
 *   1. its server-generated `fallbackText` (what WhatsApp/Slack/SMS get), and
 *   2. a PNG rendered on the server from the SAME React renderer the web page uses.
 *
 *   node --import=@poppinss/ts-exec scripts/non_visual.tsx
 */
import { writeFile } from 'node:fs/promises'
import { createReactComponentRegistry } from '@adonis-agora/agent/react/genui'
import { createReactServerRenderer } from '@adonis-agora/agent/react/genui/server'
import { createPlaywrightCaptureAdapter } from '@adonis-agora/agent/react/genui/server/playwright'
import { chromium } from 'playwright'
import { OrderList as OrderListComponent } from '../app/genui/catalog.ts'
import { listOrders } from '../app/agent/orders.ts'
import { OrderList } from '../resources/js/shared/renderers.tsx'

const presentation = await OrderListComponent({ orders: listOrders() })
console.log('--- fallbackText (what a text channel receives) ---')
console.log(presentation.fallbackText)

const registry = createReactComponentRegistry().register(OrderListComponent.definition, { react: OrderList })
const browser = await chromium.launch()
try {
  const renderer = createReactServerRenderer({
    registry,
    stylesheet: { path: './resources/css/genui.css' },
    theme: 'light',
    capture: createPlaywrightCaptureAdapter({ browser }),
  })
  const [png] = await renderer.images(presentation, { width: 640, height: 400 })
  await writeFile('docs/screenshots/server-render-order-list.png', png!)
  const html = await renderer.html(presentation)
  console.log(`--- server render: ${html.length} bytes of HTML, docs/screenshots/server-render-order-list.png ---`)
} finally {
  await browser.close()
}
