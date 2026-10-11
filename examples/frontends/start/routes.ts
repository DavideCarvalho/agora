import router from '@adonisjs/core/services/router'
import { existsSync } from 'node:fs'
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

/** The sandbox kit in use (vite.config.ts keeps it on `globalThis`, which the dev server shares). */
const kits = globalThis as { __sandboxKit?: string; __sandboxKits?: string[] }
const currentKit = () => kits.__sandboxKit ?? process.env.SANDBOX_KIT ?? 'shadcn'

for (const [path, page] of Object.entries(pages)) {
  router.get(path, ({ view }) => {
    // A local kit (local-kits/<name>/page.css, gitignored) dresses the page in its theme too.
    const name = currentKit()
    const localCss = existsSync(new URL(`../local-kits/${name}/page.css`, import.meta.url))
      ? `local-kits/${name}/page.css`
      : null
    return view.render('page', { ...page, localCss })
  })
}

/**
 * The kit switcher (`?kit=bootstrap|mui|shadcn|…` on any page): which kit the sandbox draws with.
 * Process-wide — a demo convenience, so one server shows every variant: the Vite plugin's options
 * read the current kit (vite.config.ts), and a rebuild is asked for by telling its watcher a style
 * file changed. Answers once the new kit is built.
 */
router.get('/demo/kit', () => ({ kit: currentKit(), kits: kits.__sandboxKits ?? [currentKit()] }))
router.post('/demo/kit', async ({ request, response }) => {
  const kit = String(request.input('kit', ''))
  if (!(kits.__sandboxKits ?? []).includes(kit)) return response.badRequest({ error: `unknown kit "${kit}"` })
  const vite = (await app.container.make('vite')) as {
    getDevServer?(): { watcher: { emit(event: string, file: string): void }; config: { plugins: readonly { name: string; api?: unknown }[] } } | undefined
  }
  const server = vite.getDevServer?.()
  if (server === undefined) return response.badRequest({ error: 'the kit switches in development only' })
  const plugin = server.config.plugins.find((each) => each.name === 'genui-sandbox-kit')?.api as
    | { descriptor(): { guide?: string } | null }
    | undefined
  // A second request for the kit being built (a page's effect running twice) waits for it too.
  if (kit !== currentKit()) {
    kits.__sandboxKit = kit
    server.watcher.emit('change', app.makePath('resources/css/kits/shadcn.css'))
  }
  // Built when the descriptor carries the new kit's notes (`stylesDocs` ends with `(kit: <name>)`).
  const deadline = Date.now() + 120_000
  while (plugin !== undefined && !plugin.descriptor()?.guide?.includes(`(kit: ${kit})`) && Date.now() < deadline)
    await new Promise((resolve) => setTimeout(resolve, 200))
  return { kit }
})

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
