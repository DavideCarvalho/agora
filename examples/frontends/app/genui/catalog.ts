import { createComponent, defineCatalog } from '@adonis-agora/agent/genui'
import {
  Badge,
  Callout,
  Card,
  Chart,
  DataTable,
  Heading,
  KpiCards,
  Stack,
  Text,
} from '@adonis-agora/agent/genui/builtins'
import { z } from 'zod'

/**
 * The app's own component. Plain data: the browser bundle imports this file too, so the native
 * page validates props against the same schema before drawing.
 */
export const OrderList = createComponent({
  name: 'OrderList',
  title: 'Order list',
  description: 'The customer’s orders as a table, each row with a Refund button.',
  version: 1,
  props: z.object({
    orders: z.array(
      z.object({
        id: z.string(),
        customer: z.string(),
        totalCents: z.number().int(),
        status: z.enum(['paid', 'shipped', 'refunded']),
      })
    ),
  }),
  fallbackText: ({ orders }) =>
    orders
      .map((o) => `• #${o.id} ${o.customer} — $${(o.totalCents / 100).toFixed(2)} (${o.status})`)
      .join('\n'),
})

/**
 * `OrderList` plus the library's builtin definitions (no visuals: the page renders them). In
 * `mode: 'tree'` (config/agent.ts) the model composes any of these, nested, through `ui__render`.
 */
export const catalog = defineCatalog([
  OrderList.definition,
  DataTable,
  Chart,
  KpiCards,
  Callout,
  Stack,
  Card,
  Heading,
  Text,
  Badge,
])
