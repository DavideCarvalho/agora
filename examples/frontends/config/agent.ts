import { defineConfig, stores, type PromptContext } from '@adonis-agora/agent'
import { agUiAdapter } from '@adonis-agora/agent/ag-ui'
import { genui } from '@adonis-agora/agent/genui'
import env from '#start/env'
import { catalog } from '#genui/catalog'
import { listOrdersTool, refundOrderTool, revenueTool } from '#agent/tools'
import { openUiPrompt } from '#agent/openui_prompt'

const basePrompt =
  'You are the orders and analytics assistant of a small shop. Use list_orders to look orders up, ' +
  'revenue_by_month for revenue, ui__render to compose a dashboard, refund_order to refund.'

/**
 * One agent, three frontends. The only per-frontend difference is the prompt: the OpenUI page sends
 * `pageContext: { frontend: 'openui' }`, and OpenUI draws UI from text the model writes in its own
 * language ("OpenUI Lang"), so that turn's system prompt carries OpenUI's component-library prompt.
 * The native and CopilotKit pages get their UI from components the tools push and from `ui__render`.
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

  // Tree mode: besides the components tools push, the model can compose any catalog component,
  // nested, through one `ui__render` tool — validated node by node against the catalog.
  genui: genui({ catalog, mode: 'tree' }),
  adapters: [agUiAdapter()], // POST /agent/ag-ui — what the CopilotKit and OpenUI pages talk to

  tools: [listOrdersTool, revenueTool, refundOrderTool],
  defaultAgent: { systemPrompt },
})
