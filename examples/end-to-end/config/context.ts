import { defineConfig } from '@adonis-agora/context'

/**
 * Configuration for @adonis-agora/context. Everything below is optional -- the
 * defaults read the W3C traceparent header (a random trace id is generated
 * when it is absent) and serialize a carrier of traceId + tenantId + userRef
 * across queue/durable process boundaries.
 *
 * IMPORTANT: if you augment ContextStore (via module augmentation) with a
 * custom field, it will NOT survive a queue job, durable execution, or any
 * other process boundary unless you list it in "carrier" below.
 */
export default defineConfig({
  // -- population: read by the HTTP middleware at the start of every request --

  /**
   * Header to read the incoming trace id from. Defaults to 'traceparent'.
   * When the header is absent or malformed, a fresh trace id is generated.
   */
  // traceHeader: 'traceparent',

  /**
   * Override how the trace id itself is produced for a request. When
   * provided, its return value wins over traceHeader / the random default.
   * It must always return a string -- fall back to randomTraceId() (also
   * exported by @adonis-agora/context) when your header is absent.
   */
  // traceId: (ctx) => ctx.request.header('x-request-id') ?? randomTraceId(),

  /**
   * Extra fields merged into the initial store at request start. Use this to
   * pre-populate tenantId or any custom (module-augmented) field. userRef
   * typically enters later, after authentication, via Context.set('userRef', value).
   */
  // initialize: (ctx) => ({ tenantId: ctx.request.header('x-tenant-id') }),

  /**
   * Eager enrichers run right after "initialize", to populate DERIVED store
   * fields (for example a displayName computed from tenantId). Each enricher
   * either returns a Partial<ContextStore> that is merged into the store, or
   * mutates the store in place and returns nothing -- both forms are supported.
   * A throwing enricher is isolated: it never breaks the request nor the other
   * enrichers. Prefer Context.lazy() for values that are cheaper to compute on
   * demand.
   *
   * The second argument is the caller's request object, typed as unknown
   * (enrichers also run outside HTTP, via Context.runEnrichers), so narrow it
   * before reading from it.
   */
  // enrichers: [
  //   (store) => ({ region: regionForTenant(store.tenantId) }),
  //   (store, req) => {
  //     const ctx = req as HttpContext | undefined
  //     const locale = ctx?.request.header('accept-language')
  //     if (locale) store.locale = locale
  //   },
  // ],

  // -- cross-boundary: queue jobs, durable execution, anything outside the request --

  /**
   * Which store fields Context.serialize() includes in the carrier. Defaults
   * to ['traceId', 'tenantId', 'userRef']. If you added a custom field to
   * ContextStore, list it here explicitly -- otherwise it is silently dropped
   * whenever the context crosses a process boundary (queue, durable, etc).
   */
  // carrier: ['traceId', 'tenantId', 'userRef'],

  /** Full override of how the store is serialized into a carrier. */
  // serialize: (store) => ({ traceId: store.traceId }),

  /** Full override of how a carrier is re-hydrated into a store. */
  // deserialize: (carrier) => ({ traceId: carrier.traceId }),

  /**
   * Baggage key mapping for Context.toBaggage() / Context.fromBaggage(), the
   * standards-compliant W3C baggage propagation option. Defaults to the field
   * names (tenantId, userRef); set a custom key to namespace it, or false to
   * never propagate that field over baggage. Independent of "carrier" above.
   */
  // baggage: {},
})