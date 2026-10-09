import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig(({ mode }) => {
  // `VITE_ALLOWED_HOSTS` (.env): hosts the dev server answers besides localhost, comma-separated —
  // `.ts.net` for a Tailscale tailnet, `true` for any. Vite refuses other Host headers (DNS rebinding).
  const hosts = (process.env.VITE_ALLOWED_HOSTS ?? loadEnv(mode, process.cwd(), '').VITE_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
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
    server: hosts.length > 0 ? { allowedHosts: hosts.includes('true') ? true : hosts } : {},
  }
})
