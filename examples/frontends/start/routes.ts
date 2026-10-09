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
}

for (const [path, page] of Object.entries(pages)) {
  router.get(path, ({ view }) => view.render('page', page))
}

// Development only: put the demo orders back (tests/e2e/run.mjs calls it before each page).
if (!app.inProduction) {
  router.post('/demo/reset', async () => {
    const { resetOrders } = await import('#agent/orders')
    resetOrders()
    return { ok: true }
  })
}
