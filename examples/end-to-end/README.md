# Agora end-to-end example

A minimal, genuinely runnable AdonisJS 7 app that wires five `@adonis-agora/*`
libraries together correctly, on SQLite, with zero external infrastructure.
Read this first if you're new to the ecosystem — it's the thing to look at
*before* reverse-engineering the wiring from a large production app.

What it demonstrates:

1. **Login** — [`@adonis-agora/authkit-server`](https://www.npmjs.com/package/@adonis-agora/authkit-server) (+ `@adonis-agora/authkit-client`), email/password, this app hosting its own OIDC provider and being its own client (topology A — "everything in one app").
2. **Permission checks** — [`@adonis-agora/authz`](https://www.npmjs.com/package/@adonis-agora/authz) gating a protected "documents" resource by role/ability.
3. **Tenant/user context propagation** — [`@adonis-agora/context`](https://www.npmjs.com/package/@adonis-agora/context)'s structural, `Symbol.for`-keyed store, read by authz's tenant resolver with zero explicit wiring per request.
4. **A protected file** — [`@adonis-agora/media`](https://www.npmjs.com/package/@adonis-agora/media), whose delivery handler has **no built-in authorization by design** — this example shows the correct way to close that gap with authz.
5. **Observability** — [`@adonis-agora/telescope`](https://www.npmjs.com/package/@adonis-agora/telescope) (+ `telescope-ui`), including its OTel bridge (0.19.0+), with an admin-only dashboard gated by authz.

## Quickstart

```bash
pnpm install
pnpm rebuild                  # builds better-sqlite3's native binding (see note below)
cp .env.example .env
node ace generate:key         # writes APP_KEY into .env for you
node ace migration:run
node ace authz:sync           # seeds the "member" / "ADMIN" roles from config/authz.ts
```

> **Why `pnpm rebuild`:** this app's `pnpm-workspace.yaml` allow-lists
> `better-sqlite3`'s build script (a native binding), but pnpm doesn't run an
> allow-listed script automatically on plain `install` — only on an explicit
> `rebuild`. Skip this and `node ace migration:run` fails with `Could not
> locate the bindings file`.

Create the OIDC client this app authenticates against itself with (no static
config, no redeploy — see [Registering the OIDC
client](#registering-the-oidc-client)):

```bash
node ace authkit:clients:create --client-id=demo-app \
  --redirect-uri=http://localhost:3333/auth/callback --json
```

Copy the printed `clientSecret` into `.env`:

```dotenv
AUTHKIT_CLIENT_ID=demo-app
AUTHKIT_CLIENT_SECRET=<paste here>
AUTHKIT_REDIRECT_URI=http://localhost:3333/auth/callback
```

Then run it:

```bash
node ace serve       # http://localhost:3333
node ace list:routes  # sanity check — should print every route below with no boot errors
```

Open <http://localhost:3333>, click **Log in**, sign up with any email —
you land back on the home page authenticated. From there:

- **/documents** — 403 until you grant yourself a role (below), then 200.
- **/telescope** — 401 while logged out, 403 once logged in without
  `ADMIN`, 200 after.

Grant yourself a role (find your id first — the home page shows your email,
or query `app_users`):

```bash
node ace authz:assign member <your-app-user-id>   # -> can view/create documents
node ace authz:assign ADMIN <your-app-user-id>    # -> + the Telescope dashboard
```

## Verifying it actually works

Two ways, both already run as part of building this example:

- **`./smoke-test.sh`** — a real end-to-end walkthrough over plain HTTP
  (curl), driving the *actual* OIDC authorization-code + PKCE flow (signup →
  consent → callback), then exercising every authorization boundary: anon →
  redirected/401, authenticated-wrong-role → 403, authenticated-right-role →
  200, upload + download your own file, a second user denied on someone
  else's file, and the ADMIN-gated Telescope dashboard. Run it against a
  booted dev server:

  ```bash
  node ace serve &
  ./smoke-test.sh   # BASE_URL=http://localhost:3333 by default
  ```

- **`node ace test`** — a small Japa unit suite
  (`tests/unit/authorization.spec.ts`) covering the authz *decisions*
  themselves (role → permission, wildcard grants, the ownership-OR-manage
  rule the file route uses) directly against the real `authz` service and
  the SQLite database, without needing the OIDC dance. The full login flow
  is deliberately left to `smoke-test.sh` — reimplementing PKCE + CSRF-token
  handling + interaction prompts inside a Japa test would just re-test the
  same authz decisions this file already isolates, for a lot of fragile
  extra plumbing.

`npx tsc --noEmit` typechecks clean.

## The file tour — which file shows which integration

| Concern | File(s) |
| --- | --- |
| Login / signup / consent (topology A, host is its own IdP+client) | `config/authkit.ts`, `config/authkit_client.ts`, `app/models/auth_user.ts`, `app/models/app_user.ts`, `app/controllers/oidc_session_controller.ts`, `start/routes.ts` |
| `ctx.auth` typed to this app's user | `types/authkit.ts` |
| Permission checks (role → permission, wildcards) | `config/authz.ts`, `app/controllers/documents_controller.ts` (`authz.can(user, 'documents.view')` etc.) |
| Tenant/user context propagation | `app/middleware/stamp_context_middleware.ts` (writes `Context.set('userRef'/'tenantId', ...)` after login) + `config/authz.ts`'s `resolveTenant: tenantFromContext` (reads it back, zero import of this app's auth layer) |
| Media upload + the ownership/authz-gated download | `app/controllers/documents_controller.ts` (`store`/`file` actions), `config/media.ts` |
| Admin-only Telescope dashboard | `config/telescope_ui.ts`, `config/media_dashboard.ts` (same `authorizeByRoles` pattern) |
| OTel export config surface (off by default — see below) | `config/telescope.ts` |
| CSRF exemption for the mounted OIDC surface | `config/shield.ts` |

## Registering the OIDC client

Authkit-server never declares clients statically — they're created at
runtime via the admin console (`/admin`, log in with an `ADMIN`-flagged
account), the Admin REST API, or the ace command used above. This means
adding/rotating a relying party never needs a redeploy.

## Observability: OTel export

`@adonis-agora/telescope`'s OTel bridge (0.19.0+) ships every diagnostics
event this app's other four libraries already emit as OTLP spans/logs to a
Collector, correlated by trace id — no per-lib code. It's **off by default**
here (`config/telescope.ts`) because this example runs on SQLite with zero
external infra, and enabling it with no Collector listening would make every
diagnostic entry wait out its export timeout before giving up.

To try it against a local Grafana stack, follow telescope's own OTel doc
guidance verbatim — this repo's synced copy is at
[`content/docs/telescope/packages/otel.mdx`](../../content/docs/telescope/packages/otel.mdx),
also published on this site under `/docs/telescope/packages/otel`. The
`pnpm add @opentelemetry/*` command, the `config/telescope.ts` shape, and a
minimal `otelcol` config are all there; this README doesn't reproduce it so
the two never drift.

## What's deliberately NOT here

- **Image conversions / `sharp`.** `config/media.ts` attaches uploads as-is
  with no `imageProcessor`. Resolving `MediaManager` imports whatever
  processor is configured at boot *unconditionally* (even if no conversion
  is ever requested), so declaring `processors.sharp()` without the `sharp`
  peer installed breaks every media call, not just conversions. This example
  never needs a thumbnail, so the key is omitted entirely rather than
  carrying a native-binary dependency for nothing.
- **Watchers, alerts, AI diagnosis, MCP, CPU profiling** (all opt-in
  telescope features) — enable them the same way production would
  (`node ace configure @adonis-agora/telescope`, pick the feature), not shown
  here to keep the example small.
- **durable, collaboration, payments, diagnostics, filter, agent, resilience**
  — genuinely out of scope for this example; each composes with the same
  `@adonis-agora/context` + `@adonis-agora/authz` patterns shown here (e.g.
  `agent`'s `authzToolAuthorizer` in `adonis-agent/packages/adonis/src/authz/`
  is close kin to this app's `documents_controller.ts` gating).
- **Multi-tenancy as a real feature.** `stamp_context_middleware.ts` sets a
  fixed `tenantId: 'demo'` for every user purely to demonstrate the
  propagation mechanism — a real multi-tenant app would derive it from the
  user's organization/workspace instead.

## What this example fixed upstream

Building this app surfaced five genuine gaps in the ecosystem. **All five are
fixed and released**, in the versions pinned in `package.json` above — nothing
below is a wall you will hit today. Kept as an index of what changed, and of
why a few files look the way they do:

1. **`node ace configure @adonis-agora/authkit-client` always crashed** — the
   published config stub had a literal backtick inside a comment and the stub
   codemod compiles stub content by wrapping it in a JS template literal.
   Fixed in
   [`authkit-client@0.18.3`](https://www.npmjs.com/package/@adonis-agora/authkit-client);
   `config/authkit_client.ts` here is now that codemod's real output, with
   `resolveUser` filled in.
2. **The built-in login/consent/signup screens crashed without a `branding`
   key**, which every doc treats as optional theming. `defineConfig` now
   resolves a default `BrandingConfig`
   ([`authkit-server@0.66.0`](https://www.npmjs.com/package/@adonis-agora/authkit-server)).
   `config/authkit.ts` still sets `branding`, but only as theming now — drop it
   and the screens work.
3. **The documented minimal `AuthUser` model produced broken accounts** — no
   `fullName` column for the signup screen's "Name" field, no `@beforeCreate`
   id hook, and no `static selfAssignPrimaryKey = true` (so Lucid overwrote the
   generated UUID with the raw INSERT result). The scaffolded stub and the docs
   now ship the complete model; `app/models/auth_user.ts` matches it.
4. **`configure` never scaffolded the `auth_users` migration**, so a host that
   followed getting-started verbatim hit `no such table: auth_users` on the
   first signup. It does now, and
   `database/migrations/*_create_auth_users_table.ts` here matches that stub.
5. **Mounting `registerAuthHost` behind shield's default CSRF broke the OIDC
   token exchange.** This one was never a code bug: the `authkitCsrfExceptions`
   helper already existed, it just was not mentioned anywhere you would look.
   The docs and the `authkit:doctor` hint now name it, and `config/shield.ts`
   uses it.

One rough edge this example *closed itself* rather than worked around:
telescope's dashboard guard used to infer 401-vs-403 from the request's shape,
which never sees the session cookie `authorizeByRoles` authenticates with. Since
[`telescope@0.20.0`](https://www.npmjs.com/package/@adonis-agora/telescope) an
`authorize` hook may return `{ allowed, reason }` instead of a bare boolean, and
`config/telescope_ui.ts` does — so a wrong-role denial is a 403 and only an
anonymous one is a 401 (asserted in `smoke-test.sh` step 10). `authz`'s
`authorizeByRoles` still returns a plain boolean, so this composition is worth
copying if you gate a dashboard the same way.
