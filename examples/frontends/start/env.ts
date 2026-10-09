import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /** `scripted` (default, offline), `openai:<model id>` or `openrouter:<model id>`. */
  AGENT_MODEL: Env.schema.string.optional(),
  OPENAI_API_KEY: Env.schema.string.optional(),
  OPENROUTER_API_KEY: Env.schema.string.optional(),

  /** Extra hosts Vite's dev server answers (comma-separated; `.ts.net` = any tailnet name). */
  VITE_ALLOWED_HOSTS: Env.schema.string.optional(),
})
