import { defineConfig, stores } from '@adonis-agora/media'

/**
 * Configuration for @adonis-agora/media. Storage is delegated to @adonisjs/drive — 'disk' names a disk
 * from your config/drive.ts (omit to use Drive's default). Pick a 'store' by name from the map below;
 * each driver's peer dependency is imported lazily, only when selected. The default store is the
 * in-process 'memory' store (single-process, non-durable). For production select 'lucid' and run
 * 'node ace migration:run'.
 *
 * No `imageProcessor` here (the published stub's default is
 * `processors.sharp()`) — this example never generates a conversion (see
 * app/controllers/documents_controller.ts, which attaches whatever file was
 * uploaded as-is), and `sharp` is a native-binary peer dependency this
 * teaching example has no reason to carry. Resolving `MediaManager` imports
 * the configured processor at boot regardless of whether a conversion is
 * ever requested, so leaving `processors.sharp()` in place without `sharp`
 * installed breaks EVERY media call, not just conversions — omit the key
 * entirely rather than installing an unused native dependency.
 */
export default defineConfig({
  // disk: 's3', // omit to use Drive's default disk

  store: 'memory',
  stores: {
    memory: stores.memory(),
    lucid: stores.lucid(),
  },

  // The one collection this example uses — see documents_controller.ts's
  // `store`/`file` actions. No conversions, so no image processor is needed.
  collections: [{ name: 'attachment', single: true }],

  // How stored media is served back — the read-side counterpart to 'uploads.mode'.
  // 'public' redirects to the disk's raw URL, 'signed' to a time-limited signed URL, and 'proxy'
  // streams the bytes through the app (for a private bucket the internet cannot reach). The default
  // 'auto' asks the disk for the object's visibility: public => 'public', otherwise => 'signed'.
  // No route is mounted for this: serving a record is an authorization decision, so mount your own
  // route with your own middleware and delegate to MediaDeliveryHandler (or library.deliver).
  // delivery: { mode: 'proxy', signedTtlSeconds: 300 },

  // Resumable (TUS) uploads — opt-in. Mounts the TUS protocol under 'routes.prefix' and persists
  // upload sessions so a dropped connection resumes. Select 'lucid' and run 'node ace migration:run'
  // for durable, multi-process sessions; the default in-memory store is single-process only.
  // uploads: {
  //   resumable: {
  //     store: 'lucid',
  //     stores: {
  //       memory: uploadSessions.memory(),
  //       lucid: uploadSessions.lucid(),
  //     },
  //     sessionTtlSeconds: 24 * 60 * 60,
  //     routes: { enabled: true, prefix: '/media/uploads/tus' },
  //   },
  //
  //   // Session-backed direct uploads — the browser PUTs multipart parts straight to S3 through
  //   // presigned URLs (bytes never pass through the app), and the session (uploadId, part size,
  //   // confirmed ETags) persists server-side so an interrupted upload resumes after a page
  //   // reload. Needs a multipart-capable disk (disks.s3()); shares the session tables above.
  //   direct: {
  //     store: 'lucid',
  //     stores: { lucid: uploadSessions.lucid() },
  //     partSize: 20 * 1024 * 1024,
  //     sessionTtlSeconds: 24 * 60 * 60,
  //     routes: { enabled: true, prefix: '/media/uploads/direct/sessions', collection: 'videos' },
  //   },
  // },
})