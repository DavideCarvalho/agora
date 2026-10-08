import { defineConfig } from '@adonisjs/shield'

const shieldConfig = defineConfig({
  csp: { enabled: false, directives: {}, reportOnly: false },
  csrf: {
    enabled: true,
    exceptRoutes: [],
    // The `XSRF-TOKEN` cookie is what every page's client reads and sends back as `X-XSRF-TOKEN`:
    // `<AgentProvider>` does it on its own; the CopilotKit and OpenUI pages do it in a few lines.
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },
  xFrame: { enabled: true, action: 'DENY' },
  hsts: { enabled: true, maxAge: '180 days' },
  contentTypeSniffing: { enabled: true },
})

export default shieldConfig
