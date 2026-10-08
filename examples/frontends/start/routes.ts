import router from '@adonisjs/core/services/router'

/**
 * Four pages, one agent. Each page is an Edge shell that mounts one React entry; the chat itself
 * talks to the routes the agent provider mounted under /agent — nothing is routed here for it.
 */
const pages = {
  '/': { entry: 'resources/js/pages/home.tsx', title: 'One agent, three frontends' },
  '/native': { entry: 'resources/js/pages/native.tsx', title: 'Native — @adonis-agora/agent/react' },
  '/copilotkit': { entry: 'resources/js/pages/copilotkit.tsx', title: 'CopilotKit over AG-UI' },
  '/openui': { entry: 'resources/js/pages/openui.tsx', title: 'OpenUI over AG-UI' },
}

for (const [path, page] of Object.entries(pages)) {
  router.get(path, ({ view }) => view.render('page', page))
}
