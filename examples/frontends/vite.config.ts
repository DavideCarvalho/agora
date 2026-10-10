import { createServer } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

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
  //   VITE_HMR_PORT=24678         — the port Vite's HMR server listens on (another free one when
  //                                 two dev servers share a machine)
  //   VITE_HMR_LISTEN_HOST=127.0.0.1 — listen on this address only. Vite otherwise takes the port
  //                                 on every interface, which steals it from a proxy bound to the
  //                                 same port on another address (`tailscale serve --https=24678`).
  const listenHost = read('VITE_HMR_LISTEN_HOST')
  const hmrServer = listenHost ? createServer() : undefined
  hmrServer?.listen(Number(read('VITE_HMR_PORT') || 24678), listenHost)
  const hmr = {
    ...(hmrServer ? { server: hmrServer } : {}),
    ...(read('VITE_HMR_PROTOCOL') ? { protocol: read('VITE_HMR_PROTOCOL') } : {}),
    ...(read('VITE_HMR_CLIENT_PORT') ? { clientPort: Number(read('VITE_HMR_CLIENT_PORT')) } : {}),
    ...(read('VITE_HMR_HOST') ? { host: read('VITE_HMR_HOST') } : {}),
    ...(read('VITE_HMR_PORT') ? { port: Number(read('VITE_HMR_PORT')) } : {}),
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
        ],
        reload: ['resources/views/**/*.edge'],
      }),
    ],
    resolve: {
      alias: { '#genui': new URL('./app/genui', import.meta.url).pathname },
    },
    server: {
      ...(hosts.length > 0 ? { allowedHosts: hosts.includes('true') ? true : hosts } : {}),
      ...(Object.keys(hmr).length > 0 ? { hmr } : {}),
    },
  }
})
