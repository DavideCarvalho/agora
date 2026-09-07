/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for configuring session package
  |----------------------------------------------------------
  */
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory'] as const),

  /*
  |----------------------------------------------------------
  | Variables for configuring @adonisjs/drive
  |----------------------------------------------------------
  */
  DRIVE_DISK: Env.schema.enum(['fs'] as const),

  /*
  |----------------------------------------------------------
  | Variables for @adonis-agora/authkit-server (the Authorization Server)
  |----------------------------------------------------------
  */
  AUTHKIT_ISSUER: Env.schema.string({ format: 'url', tld: false }),
  AUTHKIT_ADMIN_API_KEY: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Variables for @adonis-agora/authkit-client (the OIDC relying party —
  | added by hand, see config/authkit_client.ts for why)
  |----------------------------------------------------------
  */
  AUTHKIT_CLIENT_ID: Env.schema.string(),
  AUTHKIT_CLIENT_SECRET: Env.schema.string.optional(),
  AUTHKIT_REDIRECT_URI: Env.schema.string({ format: 'url', tld: false }),
})
