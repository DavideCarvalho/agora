import { defineTool } from '@adonis-agora/agent'
import { z } from 'zod'
import { OrderList } from '#genui/catalog'
import { formatCents, listOrders, refundOrder, revenueByMonth } from '#agent/orders'

/**
 * 1. A tool-driven component. `present` turns the result into `OrderList` — drawn by a client that
 * can, sent as its `fallbackText` to one that cannot.
 */
export const listOrdersTool = defineTool({
  name: 'list_orders',
  kind: 'read',
  description: 'List the customer’s recent orders.',
  input: z.object({}),
  execute: async () => ({ orders: listOrders() }),
  present: ({ orders }) => OrderList({ orders }),
})

/**
 * 2. Progressive render: one `Chart` pushed at once as a placeholder, then pushed again under the
 * same `id` as each month "arrives" — the client replaces it in place.
 */
export const revenueTool = defineTool({
  name: 'revenue_by_month',
  kind: 'read',
  description: 'Revenue per month this year, as a line chart.',
  input: z.object({}),
  execute: async (_input, ctx) => {
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
