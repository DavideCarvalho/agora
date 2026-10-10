import { defineTool } from '@adonis-agora/agent'
import { z } from 'zod'
import { formatCents, listOrders, type Order, refundOrder, revenueByMonth } from '#agent/orders'
import { openSlot } from '#agent/ui_slot'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A real model composing a dashboard reads the data first: `show: false` gets the data without the
 * tool's own table or chart, so the dashboard is the only thing drawn.
 */
const showInput = z.object({
  show: z
    .boolean()
    .optional()
    .describe('false when you only need the data (e.g. for a dashboard you compose with ui__render). Default true.'),
})

/**
 * What the model reads: each order's money already formatted (`total: "$129.99"`) beside the cents a
 * component takes. A model handed only `totalCents: 12999` sometimes says "$12,999" — the units fix
 * belongs in the data, not in a prompt line it may skip.
 */
const forModel = (orders: Order[]) =>
  orders.map(({ id, customer, totalCents, status }) => ({
    id,
    customer,
    total: formatCents(totalCents),
    totalCents,
    status,
  }))

/**
 * 1. A tool-driven component, with its skeleton. The tool knows it will show `OrderList` before it
 * reads, so it pushes the list's loading state at once and the rows under the same `id` when the
 * (deliberately slow) read returns — drawn by a client that declared `OrderList`, sent as its
 * `fallbackText` to one that did not. No orders ends the skeleton as `empty`, a failed read as
 * `error`: a skeleton is never left standing.
 */
export const listOrdersTool = defineTool({
  name: 'list_orders',
  kind: 'read',
  description:
    'List the customer’s recent orders: `total` is the formatted amount ("$129.99") — quote it as is; ' +
    '`totalCents` is the same amount in cents, for components that take cents. Also shows them to the ' +
    'user as a table with a Refund button per row.',
  input: showInput,
  execute: async ({ show }, ctx) => {
    if (show === false) return { orders: forModel(listOrders()) }
    const slot = await openSlot(ctx, 'OrderList', 'Your orders')
    try {
      await sleep(1500) // a slow query, so the skeleton is visible
      const orders = listOrders()
      if (orders.length === 0) await slot.settle('empty')
      else await slot.show({ orders })
      return { orders: forModel(orders) }
    } catch (error) {
      await slot.settle('error').catch(() => {})
      throw error
    }
  },
})

/**
 * 2. Progressive render: one `Chart` pushed at once as a placeholder, then pushed again under the
 * same `id` as each month "arrives" — the client replaces it in place.
 */
export const revenueTool = defineTool({
  name: 'revenue_by_month',
  kind: 'read',
  description:
    'Revenue per month this year, in USD. Also shows it to the user as a line chart that fills in as ' +
    'the months load.',
  input: showInput,
  execute: async ({ show }, ctx) => {
    if (show === false) return { months: revenueByMonth }
    const chart = (points: typeof revenueByMonth, loading: boolean) => ({
      type: 'line' as const,
      title: loading ? `Revenue by month (loading ${points.length}/6…)` : 'Revenue by month',
      xKey: 'month',
      series: [{ key: 'revenue', label: 'Revenue' }],
      data: points,
      unit: 'USD',
    })
    const { id } = await ctx.emitUi('Chart', chart(revenueByMonth.slice(0, 1), true))
    for (let count = 2; count <= revenueByMonth.length; count += 1) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await ctx.emitUi('Chart', chart(revenueByMonth.slice(0, count), count < 6), { id })
    }
    return { months: revenueByMonth }
  },
})

/** 4. The action a component's Refund button leads to: the run parks until someone approves. */
export const refundOrderTool = defineTool({
  name: 'refund_order',
  kind: 'action',
  description: 'Refund one order. Needs the customer’s approval.',
  input: z.object({ orderId: z.string() }),
  presentation: {
    label: 'Refund',
    running: 'Refunding order #{orderId}',
    done: 'Refunded order #{orderId}',
    tone: 'destructive',
    confirm: { title: 'Refund order #{orderId}?', verb: 'Refund' },
  },
  execute: async ({ orderId }) => {
    const order = refundOrder(orderId)
    return { refunded: order.id, amount: formatCents(order.totalCents) }
  },
})
