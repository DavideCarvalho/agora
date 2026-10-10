import { defineConfig, stores, type PromptContext } from '@adonis-agora/agent'
import { agUiAdapter } from '@adonis-agora/agent/ag-ui'
import { a2uiAdapter } from '@adonis-agora/agent/a2ui'
import { genui } from '@adonis-agora/agent/genui'
import env from '#start/env'
import { A2UI_CATALOG_ID, catalog } from '#genui/catalog'
import { orderListToA2ui, sandboxToA2ui } from '#genui/a2ui'
import { listOrdersTool, refundOrderTool, revenueTool } from '#agent/tools'
import { openUiPrompt } from '#agent/openui_prompt'

const basePrompt = [
  'You are the orders and analytics assistant of a small shop. Tool results carry money formatted ' +
    '(`total: "$129.99"`): quote that; `totalCents` is the same amount in cents, only for components ' +
    'that take cents (OrderList).',
  'Tools: list_orders (recent orders), revenue_by_month (revenue per month), refund_order (refunds ' +
    'one order — the user approves it in the app first; call it, never ask for confirmation in text), ' +
    'ui__render (compose a layout from the catalog components), ui__sandbox (one Sandbox, its props directly).',
  'For a one-off interactive tool no component fits (a calculator, a bill splitter, a converter), ' +
    'render a Sandbox with ui__sandbox — always for a request to split a bill or to calculate something, ' +
    'even when you could answer in text: the user adjusts the numbers there. Pre-fill it with their ' +
    'numbers; it must validate its own input, compute live as the user types, ' +
    'and have a button that calls agent.send({ text, ...values }) — `text` a short sentence of what the ' +
    'user asks for ("Settle it for 4 people"). A message that comes from such a button carries those ' +
    'values as JSON: answer with the numbers it carries, in a sentence or two.',
].join('\n')

/** What the native, CopilotKit and A2UI pages add: a tool's own UI is already on screen. */
const componentPrompt =
  'list_orders and revenue_by_month draw their own table and chart for the user (the orders with a ' +
  'Refund button per row; the chart as it loads). Do not draw them again with ui__render and do not ' +
  'repeat their rows as text or a markdown table: say one or two sentences about them. Use ui__render ' +
  'for what no tool draws — a dashboard that combines several things (KpiCards, a Chart, a DataTable ' +
  'in a Stack or Card); a Sandbox on its own goes through ui__sandbox. To build a dashboard, read the data with `show: false` so the ' +
  'dashboard is the only thing drawn.'

/** What the OpenUI page adds: it draws no tool UI of its own, so results are written in OpenUI Lang. */
const openUiNote =
  'On this page the tools draw nothing: show their results yourself in openui-lang (the orders with ' +
  'the OrderList component). The Sandbox is the exception: render it with ui__sandbox, and the page ' +
  'draws it in the thread. Every reply is openui-lang, even a one-sentence one — after a ui__sandbox ' +
  'call, or answering a sandbox button: root = Card([body]) with body = TextContent("…"). Plain prose ' +
  'is not shown on this page.'

/**
 * One agent, four frontends. The only per-frontend difference is the prompt: the OpenUI page sends
 * `pageContext: { frontend: 'openui' }`, and OpenUI draws UI from text the model writes in its own
 * language ("OpenUI Lang"), so that turn's system prompt carries OpenUI's component-library prompt.
 * The native, CopilotKit and A2UI pages get their UI from components the tools push and from
 * `ui__render`.
 */
async function systemPrompt(ctx: PromptContext): Promise<string> {
  if (ctx.pageContext?.frontend === 'openui') return `${await openUiPrompt()}\n\n${basePrompt}\n\n${openUiNote}`
  return `${basePrompt}\n\n${componentPrompt}`
}

export default defineConfig({
  /**
   * A real model, or the scripted, offline one (`app/agent/scripted_model.ts`):
   *  - `AGENT_MODEL=openai:<model>` (+ `OPENAI_API_KEY`), e.g. `openai:gpt-4.1-mini`;
   *  - `AGENT_MODEL=openrouter:<model>` (+ `OPENROUTER_API_KEY`), e.g. `openrouter:openai/gpt-4.1-mini`
   *    or `openrouter:anthropic/claude-sonnet-4.5` — OpenRouter's OpenAI-compatible API, through the
   *    same `@ai-sdk/openai` provider;
   *  - anything else: scripted.
   * Lazy, so the AI SDK provider is only imported when one is selected.
   */
  model: async () => {
    const choice = env.get('AGENT_MODEL', 'scripted')
    const [provider, ...rest] = choice.split(':')
    const id = rest.join(':')
    if ((provider === 'openai' || provider === 'openrouter') && id.length > 0) {
      const [{ aiSdkModel }, { createOpenAI }] = await Promise.all([
        import('@adonis-agora/agent/ai-sdk'),
        import('@ai-sdk/openai'),
      ])
      const openai =
        provider === 'openrouter'
          ? createOpenAI({
              baseURL: 'https://openrouter.ai/api/v1',
              apiKey: env.get('OPENROUTER_API_KEY'),
              headers: { 'X-Title': 'Agora frontends example' },
            })
          : createOpenAI({ apiKey: env.get('OPENAI_API_KEY') })
      // OpenRouter speaks Chat Completions, not the Responses API `openai(id)` defaults to.
      return aiSdkModel(provider === 'openrouter' ? openai.chat(id) : openai(id))
    }
    const { ScriptedOrdersModel } = await import('#agent/scripted_model')
    return new ScriptedOrdersModel()
  },

  // Threads, messages and runs in SQLite (tmp/db.sqlite3) — the Lucid store creates its own tables.
  store: 'lucid',
  stores: { memory: stores.memory(), lucid: stores.lucid() },

  // No `actorResolver`: every browser is its own anonymous actor (an HttpOnly `agent_anon` cookie).
  // Shield still checks CSRF on every POST — see config/shield.ts.

  // Tree mode (the default): besides the components tools push, the model composes the catalog's
  // components, nested, through one `ui__render` tool — validated node by node against the catalog.
  // `streaming: 'partial'` draws the tree while the model writes it: the page's renderers draw
  // skeletons for nodes still being written (`useGenuiNode()`), and the chart, which streams
  // `complete` (app/genui/catalog.ts), is a placeholder until its props are whole. The catalog's
  // `Sandbox` streams too: a placeholder, then its styled markup, then the live view.
  // `componentTools: ['Sandbox']`: the sandbox also has a flat tool, `ui__sandbox`, whose input IS its
  // props. Nested in `ui__render`, a real model (claude-haiku-5.5) left out the `{ type, props }`
  // envelope on 11 of 16 bill-splitter runs (the user saw a refused call before the sandbox); with
  // `ui__sandbox`, on 0 of 16.
  genui: genui({ catalog, streaming: 'partial', componentTools: ['Sandbox'] }),
  adapters: [
    // POST /agent/ag-ui — what the CopilotKit and OpenUI pages talk to. `a2ui`: every UI frame is
    // also an `a2ui-surface` activity (A2UI's AG-UI binding) on A2UI's basic catalog, which
    // CopilotKit's own A2UI renderer draws (/copilotkit?renderer=a2ui) — under the catalog id the
    // client advertises, else the one AG-UI's binding and CopilotKit use. The `Sandbox` has no basic
    // component, so it travels there as its summary text.
    agUiAdapter({ a2ui: { components: { OrderList: orderListToA2ui } } }),
    // POST /agent/a2ui — JSON Lines of A2UI v0.9 messages, for the /a2ui page (the official
    // `@a2ui/react` renderer). Its catalog is the basic one plus a `Sandbox` component of its own.
    a2uiAdapter({
      catalogId: A2UI_CATALOG_ID,
      components: { OrderList: orderListToA2ui, Sandbox: sandboxToA2ui },
    }),
  ],

  tools: [listOrdersTool, revenueTool, refundOrderTool],
  defaultAgent: { systemPrompt },
})
