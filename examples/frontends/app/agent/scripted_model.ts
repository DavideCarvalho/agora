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
import {
  billSplitterBootstrapTree,
  billSplitterJsxTree,
  billSplitterMuiTree,
  billSplitterTree,
  readBill,
  settle,
} from '#agent/bill_splitter'

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
    // What this turn was offered: a web page gets `ui__render` (and a sandbox that takes JSX with
    // the app's kit); WhatsApp gets one `ui__show_*` tool per component it can draw (config/agent.ts).
    const offered: Offered = {
      tools: new Set(args.tools.map((tool) => tool.name)),
      kit: kitOf(args.tools.find((tool) => tool.name === 'ui__render')?.description ?? ''),
    }
    const plan = openui ? openUiScript(turn) : offered.tools.has('ui__render') ? nativeScript(turn, offered) : messagingScript(turn, offered)
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
    const pace = plan.streamArgs === true ? { chunk: 60, delayMs: 120, slowFirst: 0 } : plan.streamArgs
    for (const call of toolCalls.filter((c) => c.name === 'ui__render')) {
      if (!pace) break
      const json = JSON.stringify(call.input)
      await args.sink.write({ t: 'event', event: { kind: 'tool-input-start', id: call.id, name: call.name, toolKind: 'read' } })
      for (let at = 0; at < json.length; at += pace.chunk) {
        await args.sink.write({ t: 'event', event: { kind: 'tool-input-delta', id: call.id, delta: json.slice(at, at + pace.chunk) } })
        // The sandbox's first fields (its placeholder) arrive slowly, so each state can be seen.
        await sleep(at < (pace.slowFirst ?? 0) ? pace.delayMs * 4 : pace.delayMs)
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
  streamArgs?: boolean | { chunk: number; delayMs: number; slowFirst?: number }
}

interface Offered {
  tools: Set<string>
  /**
   * What the sandbox's description says the app's kit is (as a model would read it): JSX with its
   * components (`jsx`; MUI's when it lists `<TextField>`), or HTML with its stylesheet's classes.
   */
  kit: 'jsx' | 'mui' | 'classes' | null
}

function kitOf(description: string): Offered['kit'] {
  // The sandbox says which: "no component kit here … never jsx" (a stylesheet only), or the JSX
  // rules ("Write the view as JSX in `jsx`") with the kit's components listed.
  if (description.includes('never jsx')) return 'classes'
  if (description.includes('Write the view as JSX')) return description.includes('<TextField>') ? 'mui' : 'jsx'
  return null
}

interface Turn {
  userText: string
  /** A UI action this turn stands for (a sandbox's `agent.send`, an A2UI button), if any. */
  action?: { name: string; context: Record<string, unknown> }
  results: NonNullable<ModelMessage['toolResults']>
  position: number
}

function readTurn(messages: ModelMessage[]): Turn {
  let index = messages.length - 1
  while (index >= 0 && !(messages[index]!.role === 'user' && messages[index]!.content.length > 0)) {
    index -= 1
  }
  const raw = messages[index]?.content ?? ''
  const action = readUiAction(raw)
  return {
    userText: raw.toLowerCase(),
    ...(action ? { action } : {}),
    results: messages.slice(index + 1).flatMap((message) => message.toolResults ?? []),
    position: messages.length,
  }
}

/**
 * A UI action arrives as a user message (the library's `uiActionText`): what the user said, then
 * `[UI action "<name>" from …]` and its values as a JSON block. A model reads both; so does this one.
 */
function readUiAction(text: string): Turn['action'] {
  const name = /\[UI action "([^"]+)" from [^\]]*\]/.exec(text)?.[1]
  if (!name) return undefined
  const json = /```json\n([\s\S]*?)\n```/.exec(text)?.[1]
  try {
    return { name, context: json ? JSON.parse(json) : {} }
  } catch {
    return { name, context: {} }
  }
}

const called = (turn: Turn, name: string) => turn.results.filter((r) => r.name === name)
const orderIdIn = (turn: Turn) =>
  (typeof turn.action?.context.orderId === 'string' ? turn.action.context.orderId : undefined) ??
  /(\d{4})/.exec(turn.userText)?.[1] ??
  '1002'

/** The bill splitter's "Ask the assistant to settle it": the values it sent, settled in a sentence. */
function settledBill(turn: Turn): string | undefined {
  const values = turn.action?.context ?? {}
  const total = Number(values.total)
  const people = Number(values.people)
  const tip = Number(values.tip)
  if (!(total > 0 && people >= 1 && tip >= 0)) return undefined
  const { tipAmount, grand, perPerson } = settle({ total, people, tip })
  return (
    `Each of the ${people} people pays ${formatCents(Math.round(perPerson * 100))}: ` +
    `${formatCents(Math.round(total * 100))} plus a ${tip}% tip (${formatCents(Math.round(tipAmount * 100))}) ` +
    `is ${formatCents(Math.round(grand * 100))}.`
  )
}

const SANDBOX_STREAM = { chunk: 48, delayMs: 70, slowFirst: 260 }

// ---------------------------------------------------------------------------------------------
// Native + CopilotKit: tool-pushed components, and `ui__render` for composed layouts.
// ---------------------------------------------------------------------------------------------

function nativeScript(turn: Turn, offered: Offered): Plan {
  const text = turn.userText

  // 8. The bill splitter's button: the values came back as this turn.
  if (turn.action && turn.action.name !== 'refund') {
    const answer = settledBill(turn)
    return { text: answer ?? `Got it — "${turn.action.name}" with ${JSON.stringify(turn.action.context)}.` }
  }

  if (/refund/.test(text)) {
    const orderId = orderIdIn(turn)
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

  // 9. The same, with the app's kit: JSX with its components, in its theme.
  if (/app components|kit/.test(text) && offered.kit !== null) {
    if (!called(turn, 'ui__render').length) {
      const bill = readBill(text)
      const input =
        offered.kit === 'mui' ? billSplitterMuiTree(bill) : offered.kit === 'classes' ? billSplitterBootstrapTree(bill) : billSplitterJsxTree(bill)
      return {
        reasoning: 'A bill splitter in the Sandbox, in the app’s own design system so it looks like the app.',
        text: 'Here is a bill splitter, built with the app components.',
        toolCalls: [{ name: 'ui__render', input }],
        streamArgs: SANDBOX_STREAM,
      }
    }
    return { text: 'Move the slider or pick a tip, then press “Ask the assistant to settle it”.' }
  }

  // 8. No component fits a bill splitter: the model writes one into the Sandbox.
  if (/split|bill/.test(text)) {
    if (!called(turn, 'ui__render').length) {
      return {
        reasoning: 'No catalog component splits a bill. A small interactive view in the Sandbox.',
        text: 'Here is a bill splitter.',
        toolCalls: [{ name: 'ui__render', input: billSplitterTree(readBill(text)) }],
        streamArgs: SANDBOX_STREAM,
      }
    }
    return { text: 'Change any number, then press “Ask the assistant to settle it”.' }
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
    text: 'Hi! I can list your orders, chart revenue, build a dashboard, refund an order (after you approve it) and split a bill.',
  }
}

// ---------------------------------------------------------------------------------------------
// WhatsApp (and any channel in `per-component` mode): one `ui__show_*` tool per component that
// channel can draw — no trees, no sandbox. The same prompts, answered with what it can show.
// ---------------------------------------------------------------------------------------------

function messagingScript(turn: Turn, offered: Offered): Plan {
  const text = turn.userText
  const shown = (name: string) => called(turn, name).length > 0
  // A pick from the orders list (OrderList's WhatsApp conversion): that order, in words.
  if (turn.action?.name === 'details') {
    const order = listOrders().find((o) => o.id === turn.action?.context.orderId)
    return {
      text: order
        ? `*Order #${order.id}* — ${order.customer}, ${formatCents(order.totalCents)}, ${order.status}. Say “refund ${order.id}” to refund it.`
        : 'I could not find that order.',
    }
  }
  if (turn.action && turn.action.name !== 'refund') {
    return { text: settledBill(turn) ?? `Got it — "${turn.action.name}".` }
  }
  if (/refund/.test(text)) {
    const orderId = orderIdIn(turn)
    const refund = called(turn, 'refund_order')[0]
    if (!refund) {
      return { text: `Refunding order #${orderId}.`, toolCalls: [{ name: 'refund_order', input: { orderId } }] }
    }
    if (refund.denied || refund.error) return { text: `Order #${orderId} was *not* refunded.` }
    return { text: `Done — order #${orderId} was refunded ${(refund.output as { amount: string }).amount}.` }
  }
  if (/split|bill/.test(text)) {
    // No sandbox here: the arithmetic, in words.
    const bill = readBill(text)
    const { tipAmount, grand, perPerson } = settle(bill)
    return {
      text:
        `Each of the ${bill.people} people pays *${formatCents(Math.round(perPerson * 100))}* ` +
        `(${formatCents(Math.round(bill.total * 100))} + ${bill.tip}% tip ${formatCents(Math.round(tipAmount * 100))} = ${formatCents(Math.round(grand * 100))}).`,
    }
  }
  if (/dashboard/.test(text)) {
    if (!shown('ui__show_kpi_cards') && offered.tools.has('ui__show_kpi_cards')) {
      const tree = dashboardTree()
      return {
        text: 'Here is your dashboard.',
        toolCalls: tree.children
          .map((child) => ({ name: `ui__show_${child.type === 'KpiCards' ? 'kpi_cards' : child.type === 'Chart' ? 'chart' : 'data_table'}`, input: child.props }))
          .filter((call) => offered.tools.has(call.name)),
      }
    }
    return { text: 'Revenue is up 50% since January.' }
  }
  if (/pie|status/.test(text)) {
    if (!shown('ui__show_chart') && offered.tools.has('ui__show_chart')) {
      return { text: 'Pie charts are not in the catalog — a bar chart instead.', toolCalls: [{ name: 'ui__show_chart', input: statusChart() }] }
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
      return { text: 'Let me look up your orders.', toolCalls: [{ name: 'list_orders', input: {} }] }
    }
    return { text: 'Pick an order to refund it.' }
  }
  return { text: 'Hi! I can list your orders, chart revenue, build a dashboard, refund an order and split a bill.' }
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

  if (turn.action && turn.action.name !== 'refund') {
    const answer = settledBill(turn) ?? `Got "${turn.action.name}".`
    return lang(['root = Card([note])', `note = Callout("success", "Settled", ${q(answer)})`])
  }

  // 8. OpenUI Lang has no sandbox: the model calls `ui__render` with one, as on the other pages, and
  // the page draws that tool call inline with an OpenUI artifact renderer (resources/js/pages/openui.tsx).
  if (/split|bill/.test(text)) {
    if (!called(turn, 'ui__render').length) {
      return {
        text: 'Building a bill splitter.',
        toolCalls: [{ name: 'ui__render', input: billSplitterTree(readBill(text)) }],
        streamArgs: SANDBOX_STREAM,
      }
    }
    return lang([
      'root = Card([body])',
      `body = TextContent(${q('Your bill splitter is ready: change any number, then press “Ask the assistant to settle it”.')})`,
    ])
  }

  if (/refund/.test(text)) {
    const orderId = orderIdIn(turn)
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
    `body = TextContent(${q('Hi! I can list your orders, chart revenue, build a dashboard, refund an order (after you approve it) and split a bill.')})`,
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
