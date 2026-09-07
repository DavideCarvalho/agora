import { defineConfig, storage } from '@adonis-agora/telescope'

/**
 * Configuration for '@adonis-agora/telescope'. Everything is optional — the defaults
 * use the in-memory store with the 'request' and 'diagnostics' watchers enabled and
 * a 1000-entry cap.
 */
export default defineConfig({
  /**
   * Master switch. Set to false to disable all recording (zero overhead).
   */
  // enabled: true,

  /**
   * Which named store backs telescope. The active driver is selected by 'store'
   * and built from the 'stores' map below.
   */
  store: 'memory',

  /**
   * Named store drivers, built with the 'storage' factory. Each is a lazy thunk —
   * its peer dependency is only imported when that driver is the active one.
   *
   * To persist entries across restarts, install '@adonisjs/lucid', run the
   * migration this package publishes (or pass autoCreateTable: true), switch
   * 'store' to 'lucid', and uncomment the lucid driver:
   */
  stores: {
    memory: storage.memory({ limit: 1000 }),
    // lucid: storage.lucid({ connection: 'pg' }),
  },

  /**
   * Active watchers. Omit one to disable it.
   *  - 'request'     — records each HTTP request (method, url, status, duration).
   *  - 'diagnostics' — records every diagnostics-bus publish from a sibling Agora lib.
   *  - 'logs'        — tees the AdonisJS logger and records each line as a 'log' entry.
   *
   * Note: '@adonis-agora/telescope/watchers' can also start a logs watcher. Enable
   * 'logs' in ONE place only — whichever provider boots first owns the tap, and the
   * other one is ignored (with a warning) so nothing is recorded twice.
   */
  // watchers: ['request', 'diagnostics'],

  /**
   * Fine-tunes the 'diagnostics' watcher.
   *  - exclude       — 'lib:event' keys to skip recording, e.g. 'media:upload.progress'.
   *                    The events stay live on the bus for other subscribers.
   *  - recordClaimed — also record events a lib-specific watcher already claimed
   *                    (and therefore already recorded as a typed entry). Default false.
   */
  // diagnostics: {
  //   exclude: ['media:upload.progress'],
  //   recordClaimed: false,
  // },

  /**
   * Fine-tunes the 'logs' watcher.
   *  - minLevel — only record at/above this level ('trace' | 'debug' | 'info' |
   *               'warn' | 'error' | 'fatal'). Default 'trace' (record everything).
   *  - tags     — extra tags appended to every recorded log entry.
   */
  // logs: {
  //   minLevel: 'info',
  //   tags: ['app'],
  // },

  /**
   * Request BODY capture. OFF by default — request entries carry no 'body' field
   * until this block is present. Supplying an empty object turns it on with the
   * safe defaults below; each gate runs BEFORE the synchronous redaction pass, so a
   * huge or binary body is never walked (a gated-out body becomes a marker string).
   *  - maxBodyBytes         — skip bodies over this size, measured in O(1) from
   *                           content-length or a string/Buffer length. Default
   *                           131072 (128 KiB); false disables the size gate.
   *  - skipBodyContentTypes — content types never captured. A string matches as a
   *                           case-insensitive prefix, a RegExp is tested. Defaults
   *                           to application/octet-stream, application/offset+octet-stream
   *                           and multipart/form-data.
   *  - skipBody             — your own predicate; return true to skip this body.
   */
  // requestCapture: {
  //   maxBodyBytes: 131_072,
  //   skipBodyContentTypes: ['application/octet-stream', 'multipart/form-data'],
  //   skipBody: (request) => request.url.startsWith('/webhooks/'),
  // },

  /**
   * Enrich every request entry with what only your app knows. Return 'tags' for
   * anything you want to FILTER by in the dashboard, 'context' for detail you only
   * want to read, and 'user' when neither ctx.auth.user nor the
   * @adonis-agora/context userRef() applies.
   *
   * The classic use: have the front end send its current screen in a header, and
   * tag the entry with it — then the dashboard answers "which requests came from
   * the writing screen?" with its normal tag filter.
   *
   * SYNCHRONOUS: it runs on the recording path of every request, so read what is
   * already on the ctx (headers, route, resolved guard state) rather than doing
   * I/O. A throw is swallowed — enrichment never costs you the entry.
   */
  // requestEnrichment: (ctx) => {
  //   // header() is optional on the framework-agnostic ctx type — hence the ?. call
  //   const screen = ctx.request.header?.('x-screen')
  //   return typeof screen === 'string' ? { tags: ['screen:' + screen] } : undefined
  // },

  /**
   * Sensitive-data redaction. Every entry's content is scrubbed before it is
   * persisted — a built-in set of sensitive keys ('authorization', 'cookie',
   * 'password', 'token', 'api_key', 'secret', 'set-cookie', …) is masked with
   * '[REDACTED]', case-insensitively, at any depth. ENABLED by default.
   *
   * 'perType' overrides the NUMERIC bounds for one entry type — useful to give
   * exception stacks a bigger byte budget than high-volume request entries. Masking
   * stays global.
   */
  // redact: {
  //   enabled: true,
  //   keys: ['ssn', 'credit_card'],
  //   perType: {
  //     exception: { maxContentBytes: 64_000, maxStringLength: 8_000 },
  //   },
  // },

  /**
   * Tail-sampling on the WRITE path — a dropped entry is never persisted. Accepts
   * a bare number (a uniform keep-rate for every type) or a per-type map whose
   * reserved 'default' key covers the rest. A rule object keeps a fraction of the
   * noise while always retaining what matters.
   */
  // sampling: {
  //   default: 1,
  //   query: { rate: 0.1, keepErrors: true, keepSlowMs: 500 },
  // },

  /**
   * N+1 query-loop detection over stored entries (read-only analysis).
   * 'threshold' is the minimum repetitions of one query template within a trace.
   */
  // nPlusOne: {
  //   enabled: true,
  //   threshold: 3,
  // },

  /**
   * Pulse — the aggregated 'at a glance' health rollup computed on demand from
   * stored entries. ENABLED by default over a trailing 1h window with every card.
   */
  // pulse: {
  //   enabled: true,
  //   windowMs: 3_600_000,
  //   topN: 5,
  //   buckets: 60,
  //   slowRouteMs: 1000,
  //   // cards: ['counts', 'slowest'],
  // },

  /**
   * Live SSE streaming of new entries to the dashboard. ENABLED by default and
   * zero-overhead while no dashboard is connected. Set enabled: false to turn
   * the <telescope>/api/stream endpoint off entirely.
   */
  // stream: {
  //   enabled: true,
  // },

  /**
   * Background retention. A pruner deletes stale entries on a timer so the store
   * never grows without bound. OFF unless this block is present — supply it to
   * delete entries older than 'after', optionally capping by count with 'keepLast'.
   *  - after      — age cutoff: a ms number or '<int><ms|s|m|h|d>' (default '24h').
   *  - keepLast   — keep at most the newest N of the entries a cycle would delete.
   *  - intervalMs — how often a scheduled cycle runs (default 60000).
   */
  // prune: {
  //   after: '24h',
  //   // keepLast: 10000,
  //   // intervalMs: 60_000,
  // },

  /**
   * Overload protection. A guard samples the event-loop delay and PAUSES ingestion
   * when the p99 lag crosses maxEventLoopLagMs, resuming once it recovers — so
   * telescope can never amplify an incident. ENABLED by default at 200ms.
   */
  // overload: {
  //   enabled: true,
  //   maxEventLoopLagMs: 200,
  //   startupGraceMs: 5_000,
  // },

  /**
   * Public front-end error ingestion: a POST endpoint browsers report client-side
   * errors to, recorded as 'client_exception' entries. DISABLED by default — while
   * off no route is registered at all, so a probe cannot tell it is wired.
   *  - path         — where the endpoint mounts. Default '/telescope/client-errors'.
   *  - maxBodyBytes — hard cap on the accepted body, checked before validation.
   *                   Default 32768 (32 KB).
   *  - rateLimit    — per-IP token bucket, per process. Default 60 requests/minute.
   *  - authorize    — runs first; return false to reject with 403.
   */
  // clientErrors: {
  //   enabled: true,
  //   path: '/telescope/client-errors',
  //   maxBodyBytes: 32_768,
  //   rateLimit: { perMinute: 60 },
  //   // authorize: (ctx) => ctx.request.header('x-app-key') === env.get('APP_KEY'),
  // },

  /**
   * OTel export (goal #5, telescope 0.19.0+) — ships every already-captured
   * `diagnostic` entry (i.e. every `agora:<lib>:<event>` this example's
   * authkit/authz/context/media libs emit) as OTLP spans/logs to a Collector,
   * so the whole stack shows up correlated by trace id in Grafana. Left OFF
   * here on purpose: this example runs on SQLite with zero external infra,
   * and turning this on with no Collector listening would make every
   * diagnostic entry wait out `timeoutMs` before giving up. Flip it on once
   * you have one running — see this repo's README ("Observability: OTel
   * export") for the exact `pnpm add` command and a minimal `otelcol` config;
   * it is copied from telescope's own docs/packages/otel.mdx, not reinvented.
   */
  // otel: {
  //   enabled: true,
  //   endpoint: 'http://localhost:4318',
  //   serviceName: 'end-to-end-example',
  // },
})