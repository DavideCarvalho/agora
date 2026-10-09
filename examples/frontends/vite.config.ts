import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
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
})
