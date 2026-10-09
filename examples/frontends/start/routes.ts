import router from '@adonisjs/core/services/router'
import app from '@adonisjs/core/services/app'

/**
 * Five pages, one agent. Each page is an Edge shell that mounts one React entry; the chat itself
 * talks to the routes the agent provider mounted under /agent — nothing is routed here for it.
 */
const pages = {
  '/': { entry: 'resources/js/pages/home.tsx', title: 'One agent, four frontends' },
  '/native': { entry: 'resources/js/pages/native.tsx', title: 'Native — @adonis-agora/agent/react' },
  '/copilotkit': { entry: 'resources/js/pages/copilotkit.tsx', title: 'CopilotKit over AG-UI' },
  '/openui': { entry: 'resources/js/pages/openui.tsx', title: 'OpenUI over AG-UI' },
  '/a2ui': { entry: 'resources/js/pages/a2ui.tsx', title: 'A2UI — the official React renderer' },
  '/whatsapp': { entry: 'resources/js/pages/whatsapp.tsx', title: 'The same agent on (simulated) WhatsApp' },
}

// SANDBOX_KIT=<name>: a local kit's page stylesheet too (vite.config.ts), so the page wears its theme.
const localCss = process.env.SANDBOX_KIT ? `local-kits/${process.env.SANDBOX_KIT}/page.css` : null

for (const [path, page] of Object.entries(pages)) {
  router.get(path, ({ view }) => view.render('page', { ...page, localCss }))
}

// Development only: put the demo orders back (tests/e2e/run.mjs calls it before each page).
if (!app.inProduction) {
  router.post('/demo/reset', async () => {
    const { resetOrders } = await import('#agent/orders')
    resetOrders()
    return { ok: true }
  })
}

/**
 * The simulated WhatsApp (/whatsapp): `channels.handle` over an adapter that records what it sends
 * (app/channels/whatsapp_sim.ts) — the real channel handler, the real genui channel rules. The page
 * posts what the person types (or the button they press) and reads back what the agent sent.
 */
const threads = new Map<string, string>()
const { channels } = await import('@adonis-agora/agent/channels')
const { whatsappSim, recordInbound, simMessages, resetSim } = await import('#channels/whatsapp_sim')
const whatsapp = channels.handle(whatsappSim, {
  actor: (message) => ({ id: `wa:${message.from}`, roles: [] }),
  thread: (_actor, message) => threads.get(message.conversation),
  onThreadCreated: (threadId, _actor, message) => {
    threads.set(message.conversation, threadId)
  },
  durable: false,
})
router.post('/sim/whatsapp', async (ctx) => {
  const body = ctx.request.body() as { conversation?: string; text?: string; label?: string }
  recordInbound(body.conversation ?? 'demo', body.label ?? body.text ?? '')
  return whatsapp(ctx)
})
router.get('/sim/whatsapp/messages', ({ request }) =>
  simMessages(String(request.input('conversation', 'demo')), Number(request.input('since', 0)))
)
router.post('/sim/whatsapp/reset', ({ request }) => {
  const conversation = String(request.input('conversation', 'demo'))
  resetSim(conversation)
  threads.delete(conversation)
  return { ok: true }
})
