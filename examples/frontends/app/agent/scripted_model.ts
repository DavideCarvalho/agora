import { randomUUID } from 'node:crypto'
import type {
  ModelMessage,
  ModelProvider,
  ModelTurnArgs,
  ModelTurnResult,
  ToolCallRequest,
} from '@adonis-agora/agent'
import { formatCents, listOrders, revenueByMonth, topOrders, type Order } from '#agent/orders'
import { OPENUI_PROMPT_MARKER } from '#agent/openui_prompt'

/**
 * A deterministic, offline model that plays the same "orders & analytics assistant" script for
 * every frontend. It implements the library's `ModelProvider` SPI directly (as
 * `@adonis-agora/agent/testing`'s `FakeModelProvider` does) because the demo needs what that fake
 * does not: word-by-word streaming, `reasoning` frames, and several tool steps per turn.
 *
 * Every decision is a pure function of the turn's messages, so a replay gives the same answer.
 * The one per-frontend branch is the system prompt: when it carries OpenUI's component-library
 * prompt (openui_prompt.ts), the model answers in OpenUI Lang — which is how OpenUI does generative
 * UI — instead of calling `ui__render`.
 */
export class ScriptedOrdersModel implements ModelProvider {
  async runTurn(args: ModelTurnArgs): Promise<ModelTurnResult> {
    if (process.env.DEBUG_TOOLS) dumpTools(args)
    const turn = readTurn(args.messages)
    const openui = args.system.includes(OPENUI_PROMPT_MARKER)
    const plan = openui ? openUiScript(turn) : nativeScript(turn)
    const delay = plan.wordDelayMs ?? 20

    if (plan.reasoning) {
      for (const chunk of words(plan.reasoning)) {
        await args.sink.write({ t: 'event', event: { kind: 'reasoning', text: chunk } })
        await sleep(delay)
      }
    }
    let text = ''
    for (const chunk of plan.lines ? lines(plan.text) : words(plan.text)) {
      await args.sink.write({ t: 'text', v: chunk })
      text += chunk
      await sleep(delay)
    }
    const toolCalls: ToolCallRequest[] = (plan.toolCalls ?? []).map((call, index) => ({
      // Unique across threads: the Lucid store keys tool calls by this id, as providers' ids are.
      id: `call_${randomUUID().slice(0, 8)}_${index}`,
      name: call.name,
      input: call.input,
    }))
    // Stream a composed layout's arguments the way `aiSdkModel` relays a real model's tool-input
    // deltas, so a client that draws from partial arguments can be compared with one that cannot.
    for (const call of toolCalls.filter((c) => c.name === 'ui__render' && plan.streamArgs)) {
      const json = JSON.stringify(call.input)
      await args.sink.write({ t: 'event', event: { kind: 'tool-input-start', id: call.id, name: call.name, toolKind: 'read' } })
      for (let at = 0; at < json.length; at += 60) {
        await args.sink.write({ t: 'event', event: { kind: 'tool-input-delta', id: call.id, delta: json.slice(at, at + 60) } })
        await sleep(120)
      }
      await args.sink.write({ t: 'event', event: { kind: 'tool-input-available', id: call.id, name: call.name, input: call.input, toolKind: 'read' } })
    }
    return {
      text,
      toolCalls,
      modelId: 'scripted-orders-model',
      usage: {
        inputTokens: Math.ceil(args.system.length / 4),
        outputTokens: Math.ceil(text.length / 4),
      },
    }
  }
}

interface Plan {
  text: string
  reasoning?: string
  toolCalls?: Array<{ name: string; input: unknown }>
  wordDelayMs?: number
  /** Stream line by line (OpenUI Lang statements) instead of word by word. */
  lines?: boolean
  /** Stream the `ui__render` arguments in chunks, as a real model's tool input arrives. */
  streamArgs?: boolean
}

interface Turn {
  userText: string
  results: NonNullable<ModelMessage['toolResults']>
  position: number
}

function readTurn(messages: ModelMessage[]): Turn {
  let index = messages.length - 1
  while (index >= 0 && !(messages[index]!.role === 'user' && messages[index]!.content.length > 0)) {
    index -= 1
  }
  return {
    userText: (messages[index]?.content ?? '').toLowerCase(),
    results: messages.slice(index + 1).flatMap((message) => message.toolResults ?? []),
    position: messages.length,
  }
}

const called = (turn: Turn, name: string) => turn.results.filter((r) => r.name === name)
const orderIdIn = (text: string) => /(\d{4})/.exec(text)?.[1] ?? '1002'

// ---------------------------------------------------------------------------------------------
// Native + CopilotKit: tool-pushed components, and `ui__render` for composed layouts.
// ---------------------------------------------------------------------------------------------

function nativeScript(turn: Turn): Plan {
  const text = turn.userText

  if (/refund/.test(text)) {
    const orderId = orderIdIn(text)
    const refund = called(turn, 'refund_order')[0]
    if (!refund) {
      return {
        text: `Refunding order #${orderId} — approve it below.`,
        toolCalls: [{ name: 'refund_order', input: { orderId } }],
      }
    }
    if (refund.denied || refund.error) return { text: `Order #${orderId} was **not** refunded.` }
    const amount = (refund.output as { amount: string }).amount
    return { text: `Done — order #${orderId} was refunded ${amount}.` }
  }

  if (/dashboard/.test(text)) {
    if (!called(turn, 'ui__render').length) {
      return {
        reasoning: 'A dashboard: a card with KPIs, the revenue chart and the top orders.',
        text: 'Here is your dashboard.',
        toolCalls: [{ name: 'ui__render', input: dashboardTree() }],
        streamArgs: true,
      }
    }
    return { text: 'Revenue is up 50% since January; Alan Turing’s order is the largest.' }
  }

  if (/pie/.test(text)) {
    const attempts = called(turn, 'ui__render')
    if (attempts.length === 0) {
      // Deliberately invalid: the builtin Chart has no `pie` type. The server refuses the push and
      // the model reads the validation error as a tool failure.
      return {
        text: 'Drawing a pie chart of order statuses.',
        toolCalls: [
          { name: 'ui__render', input: { type: 'Chart', props: { ...statusChart(), type: 'pie' } } },
        ],
      }
    }
    if (attempts.length === 1 && attempts[0]!.error) {
      return {
        text: 'Pie charts are not in the catalog — a bar chart instead.',
        toolCalls: [{ name: 'ui__render', input: { type: 'Chart', props: statusChart() } }],
      }
    }
    return { text: 'Two orders are paid, two shipped.' }
  }

  if (/revenue|chart/.test(text)) {
    if (!called(turn, 'revenue_by_month').length) {
      return { text: 'Fetching revenue…', toolCalls: [{ name: 'revenue_by_month', input: {} }] }
    }
    return { text: 'Revenue grew every month except March.' }
  }

  if (/order/.test(text)) {
    if (!called(turn, 'list_orders').length) {
      return {
        reasoning: 'The user wants their orders. I will call list_orders.',
        text: 'Let me look up your orders.',
        toolCalls: [{ name: 'list_orders', input: {} }],
      }
    }
    return { text: 'Use a row’s Refund button to refund one.' }
  }

  return {
    reasoning: 'A greeting. I should say what I can do.',
    text: 'Hi! I can list your orders, chart revenue, build a dashboard, and refund an order (after you approve it).',
  }
}

function dashboardTree() {
  const top = topOrders(3)
  const total = revenueByMonth.reduce((sum, m) => sum + m.revenue, 0)
  return {
    type: 'Card',
    props: { title: 'Sales dashboard', subtitle: 'January – June' },
    children: [
      {
        type: 'KpiCards',
        props: {
          items: [
            { label: 'Revenue', value: `$${(total / 1000).toFixed(1)}k`, delta: '+50%', trend: 'up' },
            { label: 'Orders', value: listOrders().length },
          ],
        },
      },
      {
        type: 'Chart',
        props: {
          type: 'bar',
          title: 'Revenue by month',
          xKey: 'month',
          series: [{ key: 'revenue', label: 'Revenue' }],
          data: revenueByMonth,
          unit: 'USD',
        },
      },
      {
        type: 'DataTable',
        props: {
          title: 'Top 3 orders',
          columns: [
            { key: 'id', label: 'Order' },
            { key: 'customer', label: 'Customer' },
            { key: 'total', label: 'Total', align: 'right' },
          ],
          rows: top.map((o) => ({
            id: `#${o.id}`,
            customer: o.customer,
            total: formatCents(o.totalCents),
          })),
        },
      },
    ],
  }
}

function statusChart() {
  const counts = new Map<string, number>()
  for (const order of listOrders()) counts.set(order.status, (counts.get(order.status) ?? 0) + 1)
  return {
    type: 'bar',
    title: 'Orders by status',
    xKey: 'status',
    series: [{ key: 'count', label: 'Orders' }],
    data: [...counts].map(([status, count]) => ({ status, count })),
  }
}

// ---------------------------------------------------------------------------------------------
// OpenUI: the same tasks, answered in OpenUI Lang (the vocabulary of `openuiChatLibrary`).
// OpenUI renders the WHOLE reply as OpenUI Lang — a prose-only reply is an empty bubble — so every
// final answer is Lang. Text before a tool call stays prose: OpenUI shows it in its tool timeline.
// ---------------------------------------------------------------------------------------------

function openUiScript(turn: Turn): Plan {
  const text = turn.userText

  if (/refund/.test(text)) {
    const orderId = orderIdIn(text)
    const refund = called(turn, 'refund_order')[0]
    if (!refund) {
      return {
        text: `Refunding order #${orderId}.`,
        toolCalls: [{ name: 'refund_order', input: { orderId } }],
      }
    }
    if (refund.denied || refund.error) {
      return lang([
        'root = Card([note])',
        `note = Callout("warning", "Not refunded", ${q(`Order #${orderId} was not refunded.`)})`,
      ])
    }
    const amount = (refund.output as { amount: string }).amount
    return lang([
      'root = Card([note])',
      `note = Callout("success", "Refunded", ${q(`Order #${orderId} was refunded ${amount}.`)})`,
    ])
  }

  if (/dashboard/.test(text)) {
    const top = topOrders(3)
    const total = revenueByMonth.reduce((sum, m) => sum + m.revenue, 0)
    return lang([
      'root = Card([header, kpis, chart, table])',
      'header = CardHeader("Sales dashboard", "January – June")',
      `kpis = TextContent(${q(`**Revenue** $${(total / 1000).toFixed(1)}k (+50%) · **Orders** ${listOrders().length}`)})`,
      'chart = BarChart(months, [revenue], "grouped", "Month", "USD")',
      `months = ${arr(revenueByMonth.map((m) => m.month))}`,
      `revenue = Series("Revenue", [${revenueByMonth.map((m) => m.revenue).join(', ')}])`,
      'table = Table([Col("Order", ids), Col("Customer", customers), Col("Total", totals)])',
      `ids = ${arr(top.map((o) => `#${o.id}`))}`,
      `customers = ${arr(top.map((o) => o.customer))}`,
      `totals = ${arr(top.map((o) => formatCents(o.totalCents)))}`,
    ])
  }

  if (/pie/.test(text)) {
    // The OpenUI counterpart of the invalid push: arguments of the wrong type.
    return lang([
      'root = Card([header, chart])',
      'header = CardHeader("Orders by status")',
      'chart = PieChart("paid, shipped", "two each")',
    ])
  }

  if (/revenue|chart/.test(text)) {
    if (!called(turn, 'revenue_by_month').length) {
      return { text: 'Fetching revenue…', toolCalls: [{ name: 'revenue_by_month', input: {} }] }
    }
    return {
      ...lang([
        'root = Card([header, chart])',
        'header = CardHeader("Revenue by month")',
        'chart = LineChart(months, [revenue])',
        `months = ${arr(revenueByMonth.map((m) => m.month))}`,
        `revenue = Series("Revenue", [${revenueByMonth.map((m) => m.revenue).join(', ')}])`,
      ]),
      wordDelayMs: 700, // one statement at a time, slowly, so the progressive render is visible
    }
  }

  if (/order/.test(text)) {
    const listed = called(turn, 'list_orders')[0]
    if (!listed) {
      return { text: 'Let me look up your orders.', toolCalls: [{ name: 'list_orders', input: {} }] }
    }
    // The app's own component (resources/js/shared/openui_library.tsx), with its Refund buttons.
    const orders = (listed.output as { orders: Order[] }).orders
    const rows = orders.map(
      (o) => `{id: ${q(o.id)}, customer: ${q(o.customer)}, totalCents: ${o.totalCents}, status: ${q(o.status)}}`
    )
    return lang([
      'root = Card([header, list])',
      `header = CardHeader("Your orders", "${orders.length} orders")`,
      `list = OrderList([${rows.join(', ')}])`,
    ])
  }

  return lang([
    'root = Card([body])',
    `body = TextContent(${q('Hi! I can list your orders, chart revenue, build a dashboard, and refund an order (after you approve it).')})`,
  ])
}

function lang(statements: string[]): Plan {
  return { text: statements.join('\n'), lines: true, wordDelayMs: 120 }
}

const q = (value: string) => JSON.stringify(value)
const arr = (values: string[]) => `[${values.map(q).join(', ')}]`

function words(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? []
}

function lines(text: string): string[] {
  return text.split(/(?<=\n)/)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** `DEBUG_TOOLS=1`: what this turn put in front of the model (used for the token-cost row). */
function dumpTools(args: ModelTurnArgs) {
  const tools = args.tools.map((tool) => {
    const standard = (tool.inputSchema as any)?.['~standard']
    const schema = standard?.jsonSchema?.input?.({ target: 'draft-2020-12' }) ?? null
    return { name: tool.name, description: tool.description, schema }
  })
  console.log(`[scripted] system=${args.system.length} chars tools=${JSON.stringify(tools).length} chars: ${tools.map((t) => t.name).join(',')}`)
  if (process.env.DEBUG_TOOLS === 'dump') {
    void import('node:fs').then((fs) => fs.writeFileSync('tmp/turn-dump.json', JSON.stringify({ system: args.system, tools }, null, 1)))
  }
}
