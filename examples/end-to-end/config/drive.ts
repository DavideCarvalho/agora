import app from '@adonisjs/core/services/app'
import env from '#start/env'
import { defineConfig, services } from '@adonisjs/drive'

/**
 * A single local-filesystem disk — this example is a teaching app, not a
 * production scaffold, so it deliberately skips S3/GCS/R2. Media's own docs
 * cover swapping in a cloud disk later; the wiring in this example (delivery
 * modes, dashboard, uploads) works identically either way.
 */
const driveConfig = defineConfig({
  default: env.get('DRIVE_DISK'),

  services: {
    fs: services.fs({
      location: app.makePath('storage'),
      serveFiles: true,
      routeBasePath: '/uploads',
      visibility: 'private',
    }),
  },
})

export default driveConfig

declare module '@adonisjs/drive/types' {
  export interface DriveDisks extends InferDriveDisks<typeof driveConfig> {}
}
