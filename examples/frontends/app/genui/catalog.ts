import { createComponent, defineCatalog, defineComponent } from '@adonis-agora/agent/genui'
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
 * A component's state while its data is not there: `loading` is the skeleton a tool pushes before
 * it reads (the same `id` then receives the data), `empty` and `error` end it without data. Strict,
 * so a placeholder never passes for data, and the data keeps its own schema.
 */
export const placeholderSchema = z
  .object({
    state: z.enum(['loading', 'empty', 'error']),
    title: z.string().max(200).optional(),
  })
  .strict()
export type Placeholder = z.infer<typeof placeholderSchema>
export const isPlaceholder = (props: unknown): props is Placeholder =>
  placeholderSchema.safeParse(props).success

const orderListSchema = z.object({
  orders: z.array(
    z.object({
      id: z.string(),
      customer: z.string(),
      totalCents: z.number().int(),
      status: z.enum(['paid', 'shipped', 'refunded']),
    })
  ),
})

const PLACEHOLDER_TEXT = { loading: 'loading…', empty: 'no orders yet.', error: 'could not load.' }

/**
 * The app's own component: the orders, or their placeholder while `list_orders` reads them. Plain
 * data: the browser bundle imports this file too, so the native page validates props against the
 * same schema before drawing. `internal`: only the tool pushes it, so the model is never shown the
 * placeholder variant (it composes layouts from the builtins).
 */
export const OrderList = createComponent({
  name: 'OrderList',
  title: 'Order list',
  description: 'The customer’s orders as a table, each row with a Refund button.',
  version: 1,
  internal: true,
  props: z.union([placeholderSchema, orderListSchema]),
  // A placeholder's text is a sentence, never the JSON of its props.
  fallbackText: (props) =>
    isPlaceholder(props)
      ? `${props.title ?? 'Orders'}: ${PLACEHOLDER_TEXT[props.state]}`
      : props.orders
          .map((o) => `• #${o.id} ${o.customer} — $${(o.totalCents / 100).toFixed(2)} (${o.status})`)
          .join('\n'),
})

/**
 * `OrderList` plus the library's builtin definitions (no visuals: the page renders them). The model
 * composes the builtins, nested, through `ui__render` (tree mode, the default — config/agent.ts).
 * The chart streams `complete`: a chart cannot draw half its points, so while the model writes it
 * the page draws a placeholder, and the chart appears once its props are whole and valid.
 */
export const catalog = defineCatalog([
  OrderList.definition,
  DataTable,
  defineComponent({ ...Chart, streaming: 'complete' }),
  KpiCards,
  Callout,
  Stack,
  Card,
  Heading,
  Text,
  Badge,
])
