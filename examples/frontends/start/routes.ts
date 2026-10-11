import router from '@adonisjs/core/services/router'
import type { HttpContext } from '@adonisjs/core/http'
import { existsSync } from 'node:fs'
import app from '@adonisjs/core/services/app'
import { actorIdOf, clientConfigFor, defaultKit, kitNames, knownKit, rememberKit } from '#genui/kits'

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

/**
 * The visitor's sandbox kit (scenario 9): a `sandbox_kit` cookie (`?kit=` or the switcher sets it),
 * else SANDBOX_KIT, else shadcn. Each page view also tells the agent which kit this visitor's actor
 * draws with (app/genui/kits.ts), so a restart forgets nothing the cookie remembers.
 */
const visitorKit = (ctx: HttpContext): string => {
  const kit = knownKit(ctx.request.plainCookie('sandbox_kit', { encoded: false })) ?? defaultKit()
  rememberKit(actorIdOf(ctx), kit)
  return kit
}

for (const [path, page] of Object.entries(pages)) {
  router.get(path, (ctx) => {
    // A local kit (local-kits/<name>/page.css, gitignored) dresses the page in its theme too.
    const name = visitorKit(ctx)
    const localCss = existsSync(new URL(`../local-kits/${name}/page.css`, import.meta.url))
      ? `local-kits/${name}/page.css`
      : null
    return ctx.view.render('page', { ...page, localCss })
  })
}

/**
 * The kit switcher (`?kit=bootstrap|mui|shadcn|…` on any page): which kit this visitor's sandbox
 * draws with. Per visitor — every kit is built (vite.config.ts), so switching rebuilds nothing and
 * two visitors on two kits never fight: it sets the cookie and the visitor's actor's kit.
 */
router.get('/demo/kit', (ctx) => ({ kit: visitorKit(ctx), kits: kitNames() }))
router.post('/demo/kit', (ctx) => {
  const kit = knownKit(ctx.request.input('kit'))
  if (kit === undefined) return ctx.response.badRequest({ error: `unknown kit "${String(ctx.request.input('kit'))}"` })
  ctx.response.plainCookie('sandbox_kit', kit, { encode: false, httpOnly: true, sameSite: 'lax', maxAge: '30d' })
  rememberKit(actorIdOf(ctx), kit)
  return { kit }
})
/** Where this visitor's kit assets are — what the page's sandbox renderers draw with. */
router.get('/demo/kit/config', async (ctx) => clientConfigFor(visitorKit(ctx)))

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
