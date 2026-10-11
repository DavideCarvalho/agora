import { createComponent, defineCatalog, defineComponent, defineSandbox } from '@adonis-agora/agent/genui'
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
  // On WhatsApp: the orders as a message with a list to pick one from (reply buttons up to three);
  // a pick comes back as the next turn — a UI action, like a button in the web page's table.
  // `describe` is what the model is told OrderList is on WhatsApp (its channel prompt), so it does
  // not talk about the web page's table and Refund buttons there.
  channels: {
    whatsapp: {
      describe:
        'a message listing the orders, with a pick-list ("Order details") of them. There is no table and there are no Refund buttons: to refund, the user picks an order from the list or names it in a reply.',
      convert: (props) =>
        isPlaceholder(props)
          ? null
          : {
              text: `*Your orders*\n${props.orders
                .map((o) => `#${o.id} ${o.customer} — $${(o.totalCents / 100).toFixed(2)} (${o.status})`)
                .join('\n')}`,
              list: {
                button: 'Order details',
                items: props.orders.map((o) => ({
                  label: `Order #${o.id}`,
                  description: `${o.customer} — $${(o.totalCents / 100).toFixed(2)}`,
                  action: 'details',
                  value: { orderId: o.id },
                })),
              },
            },
    },
  },
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
 *
 * `Sandbox` is the last resort for an answer no component fits (scenario 8, the bill splitter): the
 * model writes HTML, CSS and JS that the page runs in an isolated iframe — no network (its default
 * policy), and `agent.send(values)` as its only way out. Here, not in `genui({ sandbox: true })`, so
 * the browser's renderer reads the same definition (and policy) as the server.
 *
 * `kit` (scenario 9): it is drawn in the app's design system — whatever `genuiSandboxKit()` built in
 * vite.config.ts: its styles (Tailwind, Bootstrap…), its components (the model then writes JSX) and
 * its wrapper (MUI's theme). The server finds the kit's docs and assets through Vite; the browser,
 * through `GET /agent/config`.
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
  defineSandbox({ kit: true }),
])

/**
 * The A2UI catalog the `/a2ui` page registers: A2UI's basic components plus a `Sandbox` of its own
 * (resources/js/pages/a2ui.tsx). The server names it on every surface it creates (config/agent.ts).
 */
export const A2UI_CATALOG_ID = 'https://frontends.example/a2ui/catalog.json'
