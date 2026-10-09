import type { A2uiComponent, A2uiMapper } from '@adonis-agora/agent/a2ui'
import { isPlaceholder } from '#genui/catalog'

/**
 * How this app's own components travel as A2UI (https://a2ui.org, v0.9). The library maps its
 * builtins onto A2UI's basic catalog by itself (a chart becomes a table of its points: the basic
 * catalog has no chart); these are the two components only this app knows.
 */

type Order = { id: string; customer: string; totalCents: number; status: string }

/**
 * `OrderList` in basic components: a header row, one row per order, and a Refund `Button` whose
 * action is the A2UI event `refund` with `{ orderId }` — the A2UI page posts it back, and it becomes
 * the next turn (the scripted model calls `refund_order`, which asks for an approval). The
 * placeholder pushed before the rows (`list_orders`' skeleton) is a line of text.
 */
export const orderListToA2ui: A2uiMapper = (props, ctx) => {
  if (isPlaceholder(props)) {
    return [{ id: ctx.id, component: 'Text', text: ctx.text() || 'Loading your orders…', variant: 'caption' }]
  }
  const orders = (Array.isArray(props.orders) ? props.orders : []) as Order[]
  const cell = (id: string, text: string, variant = 'body'): A2uiComponent => ({ id, component: 'Text', text, variant, weight: 1 })
  const out: A2uiComponent[] = []
  const header = ctx.derive('header')
  const labels = ['Order', 'Customer', 'Total', 'Status', '']
  out.push({ id: header, component: 'Row', children: labels.map((_, i) => ctx.derive(`h${i}`)) })
  labels.forEach((label, i) => out.push(cell(ctx.derive(`h${i}`), label, 'caption')))
  const rows = orders.map((order) => {
    const row = ctx.derive(`o${order.id}`)
    const cells = [`#${order.id}`, order.customer, `$${(order.totalCents / 100).toFixed(2)}`, order.status]
    const ids = cells.map((_, i) => ctx.derive(`o${order.id}c${i}`))
    cells.forEach((text, i) => out.push(cell(ids[i]!, text)))
    const refund = ctx.derive(`o${order.id}refund`)
    if (order.status !== 'refunded') {
      out.push(
        { id: refund, component: 'Button', child: `${refund}~label`, weight: 1, action: { event: { name: 'refund', context: { orderId: order.id } } } },
        { id: `${refund}~label`, component: 'Text', text: 'Refund' }
      )
    } else {
      out.push(cell(refund, ''))
    }
    out.push({ id: row, component: 'Row', children: [...ids, refund] })
    return row
  })
  return [{ id: ctx.id, component: 'Column', children: [header, ...rows] }, ...out]
}

/**
 * `Sandbox` as a custom component of this app's A2UI catalog (the `/a2ui` page registers it): its
 * props flat, plus `incomplete` while the model is still writing it, so the page's renderer shows
 * the placeholder → preview → live states. Clients without the custom catalog never get it: the
 * AG-UI route leaves it unmapped, which draws its summary as text.
 */
export const sandboxToA2ui: A2uiMapper = (props, ctx) => [
  { ...props, id: ctx.id, component: 'Sandbox', ...(ctx.incomplete ? { incomplete: true } : {}) },
]
