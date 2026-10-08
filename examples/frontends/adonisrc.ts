import { indexEntities } from '@adonisjs/core'
import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  experimental: {},
  commands: [() => import('@adonisjs/core/commands'), () => import('@adonisjs/lucid/commands')],
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    { file: () => import('@adonisjs/core/providers/repl_provider'), environment: ['repl', 'test'] },
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/core/providers/edge_provider'),
    () => import('@adonisjs/session/session_provider'),
    () => import('@adonisjs/vite/vite_provider'),
    () => import('@adonisjs/shield/shield_provider'),
    () => import('@adonisjs/static/static_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    // Mounts the agent's routes under /agent (and /agent/ag-ui, from `adapters` in config/agent.ts).
    () => import('@adonis-agora/agent/agent_provider'),
  ],
  preloads: [() => import('#start/routes'), () => import('#start/kernel')],
  metaFiles: [
    { pattern: 'resources/views/**/*.edge', reloadServer: false },
    { pattern: 'public/**', reloadServer: false },
  ],
  hooks: {
    init: [indexEntities()],
    buildStarting: [() => import('@adonisjs/vite/build_hook')],
  },
})
