import { defineConfig, stores, type PromptContext } from '@adonis-agora/agent'
import { agUiAdapter } from '@adonis-agora/agent/ag-ui'
import { a2uiAdapter } from '@adonis-agora/agent/a2ui'
import { genui } from '@adonis-agora/agent/genui'
import env from '#start/env'
import { A2UI_CATALOG_ID, catalog } from '#genui/catalog'
import { orderListToA2ui, sandboxToA2ui } from '#genui/a2ui'
import { listOrdersTool, refundOrderTool, revenueTool } from '#agent/tools'
import { openUiPrompt } from '#agent/openui_prompt'

const basePrompt =
  'You are the orders and analytics assistant of a small shop. Use list_orders to look orders up, ' +
  'revenue_by_month for revenue, ui__render to compose a dashboard, refund_order to refund. ' +
  'For a one-off interactive tool no component fits (a calculator, a bill splitter), render a Sandbox.'

/**
 * One agent, four frontends. The only per-frontend difference is the prompt: the OpenUI page sends
 * `pageContext: { frontend: 'openui' }`, and OpenUI draws UI from text the model writes in its own
 * language ("OpenUI Lang"), so that turn's system prompt carries OpenUI's component-library prompt.
 * The native, CopilotKit and A2UI pages get their UI from components the tools push and from
 * `ui__render`.
 */
async function systemPrompt(ctx: PromptContext): Promise<string> {
  if (ctx.pageContext?.frontend === 'openui') return `${await openUiPrompt()}\n\n${basePrompt}`
  return basePrompt
}

export default defineConfig({
  /**
   * `AGENT_MODEL=openai:gpt-4.1-mini` (+ `OPENAI_API_KEY`) runs a real model; anything else runs the
   * scripted, offline one (`app/agent/scripted_model.ts`). Both are lazy, so the AI SDK provider is
   * only imported when it is selected.
   */
  model: async () => {
    const choice = env.get('AGENT_MODEL', 'scripted')
    if (choice.startsWith('openai:')) {
      const [{ aiSdkModel }, { openai }] = await Promise.all([
        import('@adonis-agora/agent/ai-sdk'),
        import('@ai-sdk/openai'),
      ])
      return aiSdkModel(openai(choice.slice('openai:'.length)))
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
  genui: genui({ catalog, streaming: 'partial' }),
  adapters: [
    // POST /agent/ag-ui — what the CopilotKit and OpenUI pages talk to. `a2ui`: every UI frame is
    // also an `a2ui-surface` activity (A2UI's AG-UI binding) on A2UI's basic catalog, which
    // CopilotKit's own A2UI renderer draws (/copilotkit?renderer=a2ui); the `Sandbox` has no basic
    // component, so it travels there as its summary text. `catalogId`: CopilotKit 1.77's renderer
    // (on @a2ui/web_core 0.10) registers the basic catalog under its older id, not the current
    // `.../v0_9/catalogs/basic/catalog.json` the library (and @a2ui/react 0.12) default to.
    agUiAdapter({
      a2ui: {
        catalogId: 'https://a2ui.org/specification/v0_9/basic_catalog.json',
        components: { OrderList: orderListToA2ui },
      },
    }),
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
