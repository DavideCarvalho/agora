import type { AiToolCtx } from '@adonis-agora/agent'

/**
 * Does this turn's client draw `component` live? Only when it DECLARED it in its UI capabilities
 * (the native page does; the AG-UI pages send none) and the turn is not a text channel. Anywhere
 * else a skeleton would arrive as text that nothing can replace.
 */
function drawsLive(ctx: AiToolCtx, component: string): boolean {
  if (ctx.pageContext?.channel) return false
  return ctx.uiCapabilities?.components.some((c) => c.name === component) ?? false
}

/**
 * A component's place in the reply: a skeleton now, then the data (`show`) or the end without data
 * (`settle`) under the SAME `id`, which replaces it in place, live and on the stored message.
 * Without a skeleton, `show` pushes as usual and `settle` pushes nothing.
 */
export async function openSlot(ctx: AiToolCtx, component: string, title?: string) {
  let id: string | undefined
  let settled = false
  if (drawsLive(ctx, component)) {
    ;({ id } = await ctx.emitUi(component, { state: 'loading', ...(title ? { title } : {}) }))
  }
  return {
    async show(props: Record<string, unknown>) {
      await ctx.emitUi(component, props, id === undefined ? {} : { id })
      settled = true
    },
    async settle(state: 'empty' | 'error') {
      if (settled || id === undefined) return
      settled = true
      await ctx.emitUi(component, { state, ...(title ? { title } : {}) }, { id })
    },
  }
}
