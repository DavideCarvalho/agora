import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'
import { genuiSandboxKit, type GenuiSandboxKitOptions } from '@adonis-agora/agent/vite'

/**
 * The sandbox kit: the same bill splitter in three design systems, one generic option shape —
 *
 *   shadcn     Tailwind v4 + shadcn-style components (resources/js/kit); the model writes JSX.
 *   bootstrap  Bootstrap 5 through a .scss with overrides, CSS only; the model writes HTML with
 *              Bootstrap's classes (the kit tells it which exist).
 *   mui        MUI with a customized theme and two styled components; `wrapper` gives the model's
 *              App the ThemeProvider + CssBaseline.
 *
 * `SANDBOX_KIT=<name>` picks the one the server starts with (default `shadcn`); the page's kit
 * switcher (`?kit=<name>`) changes it while it runs — a demo convenience (POST /demo/kit in
 * start/routes.ts): the options below read the current kit, and a rebuild picks it up.
 *
 * A local kit in `local-kits/<name>/vite.config.ts` (gitignored: for trying a private design system
 * on the demo) joins the list. That file exports `{ kit, css?, alias?, plugins? }`.
 */
interface LocalKit {
  kit: GenuiSandboxKitOptions
  css?: string
  alias?: Record<string, string>
  plugins?: PluginOption[]
}
// `stylesDocs`: the app's own notes for the model — each ends with `(kit: <name>)`, which is also how
// the kit switcher (start/routes.ts) knows the new kit is the one built.
const KITS: Record<string, GenuiSandboxKitOptions> = {
  shadcn: {
    styles: 'resources/css/kits/shadcn.css',
    components: 'resources/js/kit',
    plugins: [tailwindcss()],
    stylesDocs: 'Surfaces are a Card; the main action is the default Button, the others variant="outline". (kit: shadcn)',
  },
  bootstrap: {
    styles: 'resources/css/kits/bootstrap.scss',
    stylesDocs: 'Wrap the view in a .card with a .card-body; .btn-primary for the main action, .btn-outline-primary for choices; Bootstrap spacing utilities (mb-3, gap-2) for layout. (kit: bootstrap)',
  },
  mui: {
    components: 'resources/js/kits/mui/components.tsx',
    wrapper: 'resources/js/kits/mui/wrapper.tsx',
    stylesDocs: 'A Card with a CardHeader; Stack for layout; the main action is a contained Button; PriceTag for an amount. Use sx for one-off spacing, never CSS. (kit: mui)',
  },
}
const LOCAL_KITS = ['lastro']
const locals: Record<string, LocalKit> = {}
for (const name of new Set([...LOCAL_KITS, process.env.SANDBOX_KIT ?? ''])) {
  const path = new URL(`./local-kits/${name}/vite.config.ts`, import.meta.url)
  if (name === '' || !existsSync(path)) continue
  locals[name] = ((await import(/* @vite-ignore */ path.href)) as { default: LocalKit }).default
  const kit = locals[name].kit
  KITS[name] = { ...kit, stylesDocs: `${kit.stylesDocs ?? 'A local design system.'} (kit: ${name})` }
}

/** The kit in use: the server process's (start/routes.ts switches it), else SANDBOX_KIT, else shadcn. */
const state = globalThis as { __sandboxKit?: string; __sandboxKits?: string[] }
state.__sandboxKits = Object.keys(KITS)
state.__sandboxKit ??= KITS[process.env.SANDBOX_KIT ?? ''] ? (process.env.SANDBOX_KIT as string) : 'shadcn'
const current = () => KITS[state.__sandboxKit ?? 'shadcn'] ?? KITS.shadcn
/** Options that read the current kit each time the plugin builds. */
const kitOptions = {
  get styles() { return current().styles },
  get components() { return current().components },
  get wrapper() { return current().wrapper },
  get stylesDocs() { return current().stylesDocs },
  get tsconfig() { return current().tsconfig },
  get plugins() { return current().plugins },
} as GenuiSandboxKitOptions

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const read = (name: string) => process.env[name] ?? fileEnv[name] ?? ''
  // `VITE_ALLOWED_HOSTS` (.env): hosts the dev server answers besides localhost, comma-separated —
  // `.ts.net` for a Tailscale tailnet, `true` for any. Vite refuses other Host headers (DNS rebinding).
  const hosts = read('VITE_ALLOWED_HOSTS')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
  // HMR behind a proxy (.env, all optional). Vite's HMR websocket listens on its own port (24678)
  // and the page connects to it at the page's host, so a proxy that only forwards the app's port
  // (`tailscale serve --https=3341 http://127.0.0.1:3340`) leaves the page logging "WebSocket closed
  // without opened". Forward that port too and tell the client where it is:
  //   VITE_HMR_PROTOCOL=wss       — `ws` or `wss` (behind an HTTPS proxy: wss)
  //   VITE_HMR_CLIENT_PORT=24678  — the port the BROWSER connects to (the proxy's)
  //   VITE_HMR_HOST=…             — the host the browser connects to; default: the page's host.
  //                                 Vite also listens on it, so leave it unset behind a proxy.
  //   VITE_HMR_LISTEN_HOST=127.0.0.1 — Vite's HMR server listens there only, on
  //   VITE_HMR_LISTEN_PORT=24678     (default 24678). Without it `node ace serve` picks a free port
  //                                 per start (it sets VITE_HMR_PORT itself) on every interface,
  //                                 which a proxy cannot target and which steals the port from a
  //                                 proxy bound to it on another address (`tailscale serve`).
  const listenHost = read('VITE_HMR_LISTEN_HOST')
  const hmrServer = listenHost ? createServer() : undefined
  hmrServer?.on('error', (error) => console.error(`[vite.config] HMR server: ${error.message}`))
  hmrServer?.listen(Number(read('VITE_HMR_LISTEN_PORT') || 24678), listenHost)
  const hmr = {
    ...(hmrServer ? { server: hmrServer } : {}),
    ...(read('VITE_HMR_PROTOCOL') ? { protocol: read('VITE_HMR_PROTOCOL') } : {}),
    ...(read('VITE_HMR_CLIENT_PORT') ? { clientPort: Number(read('VITE_HMR_CLIENT_PORT')) } : {}),
    ...(read('VITE_HMR_HOST') ? { host: read('VITE_HMR_HOST') } : {}),
  }
  return {
    plugins: [
      react(),
      adonisjs({
        entrypoints: [
          'resources/css/app.css',
          'resources/js/pages/home.tsx',
          'resources/js/pages/native.tsx',
          'resources/js/pages/copilotkit.tsx',
          'resources/js/pages/openui.tsx',
          'resources/js/pages/a2ui.tsx',
          'resources/js/pages/whatsapp.tsx',
          ...Object.values(locals).flatMap((local) => (local.css ? [local.css] : [])),
        ],
        reload: ['resources/views/**/*.edge'],
      }),
      // The app's design system in the sandbox: compiles its styles, bundles its components and
      // wrapper (served in dev, hashed assets in the build), writes their docs, and reloads open
      // sandboxes when one changes. app/genui/catalog.ts turns it on: defineSandbox({ kit: true }).
      genuiSandboxKit(kitOptions),
      ...Object.values(locals).flatMap((local) => local.plugins ?? []),
    ],
    resolve: {
      alias: {
        '#genui': new URL('./app/genui', import.meta.url).pathname,
        ...Object.assign({}, ...Object.values(locals).map((local) => local.alias ?? {})),
      },
    },
    server: {
      ...(hosts.length > 0 ? { allowedHosts: hosts.includes('true') ? true : hosts } : {}),
      ...(Object.keys(hmr).length > 0 ? { hmr } : {}),
    },
  }
})
