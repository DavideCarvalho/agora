# Generative UI: native vs CopilotKit vs OpenUI vs A2UI

One AdonisJS 7 agent ([`@adonis-agora/agent`](https://www.npmjs.com/package/@adonis-agora/agent), with
its sandbox and A2UI support), four pages that drive it with four different frontends, and the same
generative-UI tasks on each:

| Page | Frontend | Talks to |
| --- | --- | --- |
| `/native` | `@adonis-agora/agent/react` (`AgentProvider`, `useAgentChat`, `<GenerativeUI>`) | the native stream, `POST /agent/chat` |
| `/copilotkit` | CopilotKit 1.77 (`@copilotkit/react-core/v2`, `CopilotChat`); `?renderer=a2ui` draws with CopilotKit's own A2UI renderer instead | `POST /agent/ag-ui` (`agUiAdapter({ a2ui })`) |
| `/openui` | OpenUI 0.17 (`@openuidev/react-ui`, `AgentInterface`) | `POST /agent/ag-ui` (`agUiAdapter({ a2ui })`) |
| `/a2ui` | [A2UI](https://a2ui.org) v0.9 with Google's official renderer (`@a2ui/react` 0.12 `A2uiSurface` + `@a2ui/web_core` `MessageProcessor`) | `POST /agent/a2ui` (`a2uiAdapter()`), JSON Lines of A2UI messages |
| `/` | the comparison matrix below | — |

The point is an honest comparison: every cell in the matrix comes from running these pages
(`pnpm e2e <page>` drives each in headless Chromium and writes the screenshots in
[`docs/screenshots/`](docs/screenshots)). Where CopilotKit, OpenUI or A2UI do better, the matrix says so.

No API key and no infrastructure: a scripted offline model, SQLite (`tmp/db.sqlite3`), in-process
streaming, and one anonymous actor per browser (the library's default — an HttpOnly cookie). Shield's
CSRF check stays on for every `POST`.

## Quickstart

```bash
pnpm install
pnpm rebuild                  # builds better-sqlite3's native binding
cp .env.example .env
node ace generate:key
node ace serve --watch        # http://localhost:3333
```

No migration step: the agent's Lucid store creates its own tables on boot. Open
<http://localhost:3333> for the matrix, then any of the four pages. The left column has the same
scenario buttons on every page.

To check the matrix yourself:

```bash
npx playwright install chromium
node ace serve --hmr &        # dev mode (the e2e run writes screenshots; --hmr does not restart on them)
pnpm e2e native               # one page per run (all of them in one process needs a lot of memory):
pnpm e2e copilotkit           #   native, copilotkit, openui, a2ui, copilotkit-a2ui, matrix
pnpm e2e openui               # BASE_URL=http://localhost:3333 by default. A failed check prints
pnpm e2e a2ui                 # `FAIL: …` and exits non-zero.
pnpm e2e copilotkit-a2ui
pnpm e2e matrix
node --import=@poppinss/ts-exec scripts/non_visual.tsx   # row 6: fallback text + server-rendered PNG
node scripts/text_clients.mjs                            # row 6: a text-only client, one that draws part of the tree
node --import=@poppinss/ts-exec scripts/token_cost.ts    # row 9: the dashboard as JSON vs OpenUI Lang
```

### A real model

```dotenv
AGENT_MODEL=openai:gpt-4.1-mini
OPENAI_API_KEY=sk-...
```

Any `openai:<model>` goes through `aiSdkModel()`; everything else keeps the scripted model
([`app/agent/scripted_model.ts`](app/agent/scripted_model.ts)).

## The scenario

One "orders & analytics assistant" ([`config/agent.ts`](config/agent.ts)) with three tools
([`app/agent/tools.ts`](app/agent/tools.ts)) and a catalog of eleven components
([`app/genui/catalog.ts`](app/genui/catalog.ts): the app's `OrderList`, nine library builtins and the
library's `Sandbox`):

1. **Tool-driven component, with its skeleton** — "Show my recent orders": `list_orders` pushes the
   table's loading state before its (deliberately slow) read, then the rows under the same `id`
   ([`app/agent/ui_slot.ts`](app/agent/ui_slot.ts)).
2. **Progressive render** — "Chart revenue by month": `revenue_by_month` pushes a chart with one month,
   then pushes it again under the same `id` as each month arrives. And the dashboard of scenario 3
   draws while the model writes it (`streaming: 'partial'`).
3. **Model-composed layout** — "Show a dashboard with a chart of revenue by month plus the top 3
   orders": the model composes KPI cards, a chart and a table.
4. **Interactive component** — each row of the orders table has a Refund button; it starts the next
   turn, whose `refund_order` (an `action` tool) waits for an approval. Approve one, reject another.
5. **Persistence** — reload the page, or reopen an older thread from the thread list.
6. **Non-visual surfaces** — a text-only client, and the same component rendered to a PNG on the server.
7. **Invalid props** — "Show order statuses as a pie chart": the builtin `Chart` has no `pie` type.
8. **Sandboxed generated UI** — "Split a $120 bill between 3 people with a 15% tip": no catalog
   component splits a bill, so the model writes one — HTML, CSS and JS in a `Sandbox` node of
   `ui__render` ([`app/agent/bill_splitter.ts`](app/agent/bill_splitter.ts)). The page runs it in an
   isolated iframe (`sandbox="allow-scripts"`, no network) that draws while the model writes it: a
   placeholder of `initialHeight` with the model's loading lines, then a preview of the styled
   markup (no code runs), then the live view. It validates its own input; its "Ask the assistant to
   settle it" button calls `agent.send({ text, total, people, tip, perPerson })`, which the host
   checks and sends as the next user turn (`[UI action "send" from interactive view …]` + the values
   as JSON) — and the assistant answers "Each of the 4 people pays $34.50 …".

**What differs per frontend, by design.** Native and CopilotKit get their UI from components the
tools push and from `ui__render` (the catalog in tree mode, the default). OpenUI does generative UI
differently: the model writes "OpenUI Lang" text, and the page renders it with an OpenUI component
library. So the OpenUI page sends `forwardedProps.pageContext.frontend = 'openui'`, the agent's
prompt builder appends the library's `prompt()` for those turns
([`app/agent/openui_prompt.ts`](app/agent/openui_prompt.ts)), and the scripted model answers in
OpenUI Lang there (the app's `OrderList` is registered in OpenUI too —
[`resources/js/shared/openui_library.tsx`](resources/js/shared/openui_library.tsx)). Native and
CopilotKit draw with the very same React renderers
([`resources/js/shared/renderers.tsx`](resources/js/shared/renderers.tsx)), so any difference you see
between those two is the integration, not the pixels.

**The A2UI page** draws none of that itself: the server converts every UI frame (tool pushes and
`ui__render` trees, previews included) into A2UI surfaces — the builtins onto A2UI's basic catalog,
`OrderList` through an app mapper ([`app/genui/a2ui.ts`](app/genui/a2ui.ts)) whose Refund buttons
raise the A2UI event `refund`, and the `Sandbox` as a custom component of the page's own A2UI catalog
— and Google's renderer draws them. Text and approvals are surfaces too (approvals with Approve /
Reject buttons). The same conversion also rides the AG-UI stream as `a2ui-surface` activities, which
CopilotKit's own A2UI renderer draws on `/copilotkit?renderer=a2ui`.

## The matrix (verified)

"Glue" is app code in this repo that bridges the frontend to this agent; the count is non-blank,
non-comment lines.

| # | Capability | Native | CopilotKit | OpenUI | A2UI |
| --- | --- | --- | --- | --- | --- |
| 1 | Tool-driven component | **Built in.** `list_orders` pushes `OrderList`'s skeleton before it reads, then the rows under the same `id`; an empty or failed read ends it, so none is left standing. `<GenerativeUI>` draws both from the registry; only the rows are stored. No skeleton for a client that did not declare `OrderList`. | **Built in.** `useRenderTool({ name: 'list_orders', render })` draws the tool call from its result (5 lines); until the result arrives, `render` draws the page's own loading line. | **Built in, differently.** No tool-driven UI: the model reads the result and writes `OrderList([...])` in OpenUI Lang, so the data passes through the model. | **Built in.** The same push as an A2UI surface: a 30-line server mapper draws `OrderList` with basic components (a row and a Refund `Button` per order). The page declares the catalog, so the skeleton comes first — as a line of text (A2UI has no skeleton) — and the rows replace it in place. |
| 2 | Progressive render | **Built in** for pushes: the same `id` replaces in place (a chart, then 5 updates). **Built in** for model-written layouts: with `streaming: 'partial'` the `ui__render` tree draws while the model writes it; nodes keep their place, renderers draw skeletons from `useGenuiNode().incomplete`, and the chart (`streaming: 'complete'`) is a placeholder until its props are whole. Only the final, validated tree is stored. | **Glue (20 lines)** for pushes: read the `agora.ui` events CopilotKit ignores. **Built in** for model-written layouts: `render` gets partially parsed arguments while they stream. | **Built in** for model-written UI: each statement renders as it arrives, with placeholders for the rest. Tool pushes: **not possible** (CUSTOM events are ignored). | **Built in.** One surface per UI frame `id`: a re-push under the same `id`, and every preview of a streamed `ui__render` tree, is an `updateComponents` on the same surface, which grows in place. The chart arrives as a table (the basic catalog has no chart). |
| 3 | Model-composed layout | **Built in.** `genui({ catalog })` (tree mode is the default): `ui__render` nests any catalog component, with an exact schema per component, validated node by node. The builtins are definitions only, so you write every renderer (9 here, 88 lines with their skeletons, plus 29 of shared skeleton pieces). | **Glue (20 lines)** to draw the `ui__render` tree with your renderers, including per-node error boundaries for partial arguments. CopilotKit's own route to model-composed UI is A2UI, which works against this server too (row 11). | **Built in, and the strongest.** 84 ready, styled components (charts, tables, forms, tabs, carousels…) the model composes freely; no renderer to write. | **Built in, on the basic catalog.** The library maps its builtins onto A2UI's basic components (Card, Column/Row, Text, Button…) and the official renderer styles them; no renderer to write. A `Chart` becomes a table of its points. |
| 4 | Interactive component → agent | **Built in.** Renderers are your React components; a 3-line context reaches `chat.sendMessage`. The approval card comes from the transcript (`call.approve.run()`). | **Built in.** `agent.addMessage` + `copilotkit.runAgent` (4 lines); `useInterrupt` answers the AG-UI interrupt with `resume`. Its default tool card says "Done" for a rejected call. | Clicks **built in** (`Button(..., Action([@ToAssistant(...)]))` in Lang, `useTriggerAction()` in a component). Approvals **glue (46 lines)**: OpenUI ignores interrupts, so the reply goes out as a synthetic "Approved." message that carries `resume`. | **Built in.** A `Button`'s action event (`refund` + `{ orderId }`) comes back through the processor's action handler and is posted as `{ action }`; the approval is a surface with Approve / Reject buttons (`agora.approve` / `agora.reject`). The page's whole action path is ~10 lines. |
| 5 | Persistence (reload, reopen) | **Built in.** `useAgentChat({ threadId })` + `useThreads()`; components redraw from the message's persisted `ui` list. | **Glue.** 13 lines (`connect` → `MESSAGES_SNAPSHOT`) + ~30 to convert stored messages + 26 for a thread list (CopilotKit's own needs its hosted platform). Redraws from the stored tool arguments and results. | **Glue.** A 15-line `ChatStorage` over the agent's thread routes (plus the same converter). The OpenUI Lang source is the message text, so it redraws exactly. | **No.** A2UI has no history message: the page keeps surfaces in memory and only the thread id across turns, so a reload starts empty (the thread is stored server-side; rebuilding its surfaces is not built). |
| 6 | Non-visual surfaces, fallback | **Built in.** Capability negotiation + server-generated `fallbackText`: a client that draws only `Card` and `KpiCards` received the whole dashboard as readable text (its previews withdrawn); a text-only client is not offered `ui__render` at all, and received the orders as a text list, never a skeleton. The same React renderer rendered to PNG on the server ([screenshot](docs/screenshots/server-render-order-list.png)). | **No.** Rendering is client-side only; a tool call without a renderer draws nothing (or the generic card). A text channel gets the prose. | **No.** The UI is the model's text: a text channel would receive OpenUI Lang source. No fallback text, no server render. | **Built in (server).** A component nothing maps travels as its `fallbackText` in a `Text` (CopilotKit's A2UI renderer got the sandbox that way). A2UI is renderer-agnostic JSON (Lit, Angular, Flutter, React renderers); only React was run here. |
| 7 | Typing, validation, versioning | **Built in.** A props schema per component, validated on the server before anything streams (and again on the client). The invalid pie chart was refused against `ui__render`'s exact schema, came back as a tool error, and the model retried with a bar chart. Per-component `version`. | **No.** The zod `parameters` type the renderer only: arguments reach `render` unvalidated (and partial while streaming). No component versioning. | **No.** zod props per component, but invalid arguments are dropped silently: the chart simply did not appear and the model is never told. No versioning. | **Built in (server).** The server validates before anything streams — the invalid pie chart was refused and retried, as on the native page — and the processor checks every message against A2UI v0.9's schema. The refusal itself is not drawn, only the model's words about it. |
| 8 | DX: one new component end to end | A 24-line definition in a file both sides import (schema, description, `fallbackText`, a loading state) + the React renderer + 1 registry key. The loading state shared by every component is 9 more lines. | The React renderer + a 5-line `useRenderTool`, all client-side; the component is bound to a tool, not to a catalog. | **Leanest:** one 17-line `defineComponent` (zod props + description + React component). The catch: the server imports that client module to build the prompt. | **Glue.** Per app component: a server-side mapper to basic components (`OrderList`: 30 lines), or a custom component in the page's A2UI catalog (the `Sandbox`: ~25 lines with `createBinderlessComponentImplementation`). |
| 9 | Targets, token cost | React; a framework-free client for anything else; HTML/PNG/PDF; text channels. `ui__render` over 9 components adds ~2.1k prompt tokens with its exact schema (~680 with `treeSchema: 'loose'`); the `Sandbox` adds ~2.2k characters more of description and schema (not re-measured with the tokenizer). The dashboard is 279 output tokens. | React, Vue, Angular and React Native packages (published; only React was run here). No prompt of its own. | React, Vue, Svelte, Angular and React Email renderers (published; only React was run here). The full chat-library prompt is ~14k tokens per turn (an 11-component library: ~1.3k); the dashboard is 198 output tokens, 29% fewer than the JSON. | React (run), Lit, Angular, Flutter (published). No prompt of its own: the model writes `ui__render` trees, the server converts them. |
| 10 | Sandboxed generated UI (scenario 8) | **Built in.** `Sandbox` in the shared catalog, `Sandbox: SandboxView` in the registry, `<GenuiActionProvider onAction={chat.sendUiAction}>` (1 line). The server trims what streams (never half-written CSS or JS), so the frame goes placeholder → preview → live while the model writes; `agent.send` becomes the next user message, shown with its JSON block (what the model reads). | **Glue (4 lines + the tree glue).** The tree glue draws the node with `SandboxView` inside `GenuiNodeScope` (incomplete until the call is complete: CopilotKit's partial arguments are raw, so the code waits for the whole call); the action goes out as `forwardedProps.uiAction`. All three phases shown. With CopilotKit's A2UI renderer: the summary text only. CopilotKit's own sandbox ("Open Generative UI", its own tool and activity) — **not tried** here. | **Glue (35 lines).** OpenUI Lang has no sandbox and OpenUI ignores `agora.ui` events: the stream adapter keeps the latest `Sandbox` frame (the server's trimmed previews), the page draws it in a panel beside the chat, and the action rides the next request as `forwardedProps.uiAction`. Gone after a reload. | **Glue (~25 lines).** A custom `Sandbox` component in the page's A2UI catalog wraps `SandboxView`; the server sends it flat with `incomplete` while it streams (a 3-line mapper), and `agent.send` is dispatched as an A2UI action. All three phases shown. |
| 11 | A2UI (v0.9) | **Built in (server).** `a2uiAdapter()` (`POST /agent/a2ui`: JSON Lines of A2UI messages; actions and approval decisions in) and `agUiAdapter({ a2ui })` (`a2ui-surface` activities on the AG-UI stream). The native page does not need it. | **Built in, one catch.** `/copilotkit?renderer=a2ui`: `renderActivityMessages={[createA2UIMessageRenderer(...)]}` draws the activities with no renderer of ours; the Refund button's action returns as `forwardedProps.a2uiAction`; the approval still comes through `useInterrupt`. Catch: CopilotKit 1.77 (on `@a2ui/web_core` 0.10) registers the basic catalog as `…/v0_9/basic_catalog.json`, not the current `…/v0_9/catalogs/basic/catalog.json`, so the AG-UI route sets that `catalogId`. | **No.** OpenUI renders OpenUI Lang only. | **Built in.** Google's official `@a2ui/react` renderer + `@a2ui/web_core` processor; the page (135 lines, composer and markdown included) POSTs, feeds each JSON line to the processor, draws every surface in order and posts actions back. |

Token counts: o200k tokenizer over the exact system prompt and tool definitions the model received
(`DEBUG_TOOLS=dump node ace serve` writes them to `tmp/turn-dump.json`) and over the two dashboard
outputs (`scripts/token_cost.ts`). `OrderList` is `internal` (only its tool pushes it), so
`ui__render` offered the 9 builtins when these were measured; it now offers the `Sandbox` too.

### Where each one wins

- **OpenUI** wins on model-composed layouts (row 3) and on per-component DX (row 8): a large, styled
  library the model composes freely, progressive rendering of what it writes, and one definition per
  component. It also emits fewer output tokens for the same UI. The price: a ~14k-token prompt per
  turn with its full library, UI that exists only as model text (no fallback, no text channels), and
  invalid output that fails silently.
- **CopilotKit** draws a layout while the model is still writing it out of the box (row 2), from
  the raw partial arguments, and ships native interrupt handling (`useInterrupt` speaks AG-UI
  `resume`) and more framework targets. Against this server it needs glue for history, thread lists
  and tool-pushed updates.
- **A2UI** wins on reach and on zero renderers: the same server output draws with Google's official
  renderer (and CopilotKit's) with no component code for the builtins, actions and approvals included,
  and Lit/Angular/Flutter renderers exist. It loses on looks and persistence: the basic catalog has
  no chart (a table instead) and no skeletons, app components need a mapper or a client-side custom
  component, and there is no history to reload from.
- **Native** wins where the server matters: validated, versioned components with a server-side
  source of truth (row 7), the same output on non-visual surfaces (row 6), and persistence and
  approvals with no glue (rows 4–5). It now draws a layout while the model writes it too (row 2),
  with stable nodes, an `incomplete` flag for skeletons and only the validated tree stored, and a
  tool can show its component's skeleton before it reads (row 1). It loses on composition breadth —
  the builtins have no visuals, so you write every renderer and its skeleton — and its exact
  `ui__render` schema costs ~2.1k prompt tokens over 9 components (row 9).

## Screenshots

| | Native | CopilotKit | OpenUI | A2UI |
| --- | --- | --- | --- | --- |
| 1 Orders table, while the tool reads | ![](docs/screenshots/native-1-orders-loading.png) | ![](docs/screenshots/copilotkit-1-orders-loading.png) | — | ![](docs/screenshots/a2ui-1-orders-loading.png) |
| 1 Orders table | ![](docs/screenshots/native-1-orders.png) | ![](docs/screenshots/copilotkit-1-orders.png) | ![](docs/screenshots/openui-1-orders.png) | ![](docs/screenshots/a2ui-1-orders.png) |
| 2 Progressive (mid-stream) | ![](docs/screenshots/native-2-progressive-mid.png) | ![](docs/screenshots/copilotkit-2-progressive-mid.png) | ![](docs/screenshots/openui-2-progressive-mid.png) | — |
| 3 Dashboard (mid-stream) | ![](docs/screenshots/native-3-dashboard-mid.png) | ![](docs/screenshots/copilotkit-3-dashboard-mid.png) | ![](docs/screenshots/openui-3-dashboard-mid.png) | ![](docs/screenshots/a2ui-3-dashboard-mid.png) |
| 3 Dashboard | ![](docs/screenshots/native-3-dashboard.png) | ![](docs/screenshots/copilotkit-3-dashboard.png) | ![](docs/screenshots/openui-3-dashboard.png) | ![](docs/screenshots/a2ui-3-dashboard.png) |
| 4 Approval from the Refund button | ![](docs/screenshots/native-4-approval.png) | ![](docs/screenshots/copilotkit-4-approval.png) | ![](docs/screenshots/openui-4-approval.png) | ![](docs/screenshots/a2ui-4-approval.png) |
| 4 Approved | ![](docs/screenshots/native-4-approved.png) | ![](docs/screenshots/copilotkit-4-approved.png) | ![](docs/screenshots/openui-4-approved.png) | ![](docs/screenshots/a2ui-4-approved.png) |
| 4 Approved, then rejected | ![](docs/screenshots/native-4-rejected.png) | ![](docs/screenshots/copilotkit-4-rejected.png) | ![](docs/screenshots/openui-4-rejected.png) | ![](docs/screenshots/a2ui-4-rejected.png) |
| 5 After a reload | ![](docs/screenshots/native-5-reloaded.png) | ![](docs/screenshots/copilotkit-5-reloaded.png) | ![](docs/screenshots/openui-5-reloaded.png) | — |
| 7 Invalid props | ![](docs/screenshots/native-7-invalid.png) | ![](docs/screenshots/copilotkit-7-invalid.png) | ![](docs/screenshots/openui-7-invalid.png) | — |
| 8 Sandbox: placeholder | ![](docs/screenshots/native-8-sandbox-placeholder.png) | ![](docs/screenshots/copilotkit-8-sandbox-placeholder.png) | ![](docs/screenshots/openui-8-sandbox-placeholder.png) | ![](docs/screenshots/a2ui-8-sandbox-placeholder.png) |
| 8 Sandbox: preview (markup, no code yet) | ![](docs/screenshots/native-8-sandbox-preview.png) | ![](docs/screenshots/copilotkit-8-sandbox-preview.png) | ![](docs/screenshots/openui-8-sandbox-preview.png) | ![](docs/screenshots/a2ui-8-sandbox-preview.png) |
| 8 Sandbox: live | ![](docs/screenshots/native-8-sandbox-live.png) | ![](docs/screenshots/copilotkit-8-sandbox-live.png) | ![](docs/screenshots/openui-8-sandbox-live.png) | ![](docs/screenshots/a2ui-8-sandbox-live.png) |
| 8 Sandbox: its button → the follow-up turn | ![](docs/screenshots/native-8-sandbox-followup.png) | ![](docs/screenshots/copilotkit-8-sandbox-followup.png) | ![](docs/screenshots/openui-8-sandbox-followup.png) | ![](docs/screenshots/a2ui-8-sandbox-followup.png) |

CopilotKit with its own A2UI renderer (`/copilotkit?renderer=a2ui`, `pnpm e2e copilotkit-a2ui`):
[dashboard](docs/screenshots/copilotkit-a2ui-3-dashboard.png),
[orders](docs/screenshots/copilotkit-a2ui-1-orders.png),
[approval](docs/screenshots/copilotkit-a2ui-4-approval.png),
[approved](docs/screenshots/copilotkit-a2ui-4-approved.png),
[the sandbox as text](docs/screenshots/copilotkit-a2ui-8-sandbox.png).

## The file tour

| Concern | File(s) |
| --- | --- |
| The agent: model choice, store, `genui` (tree mode, `streaming: 'partial'`), `agUiAdapter({ a2ui })`, `a2uiAdapter()`, the per-frontend prompt | `config/agent.ts` |
| The catalog (the app's `OrderList` with its loading state + builtins, the chart streaming `complete`, the `Sandbox`) | `app/genui/catalog.ts` |
| `OrderList` and `Sandbox` as A2UI (server-side mappers) | `app/genui/a2ui.ts` |
| What the model writes into the sandbox (scenario 8) | `app/agent/bill_splitter.ts` |
| Tools: a skeleton then the data, same-`id` pushes, an `action` tool | `app/agent/tools.ts`, `app/agent/ui_slot.ts` |
| The scripted model (offline, deterministic) | `app/agent/scripted_model.ts` |
| OpenUI's library prompt on the server | `app/agent/openui_prompt.ts`, `resources/js/shared/openui_library.tsx` |
| Native page | `resources/js/pages/native.tsx` |
| CopilotKit page and its glue (history, thread list, `agora.ui`, tree, sandbox actions, `?renderer=a2ui`) | `resources/js/pages/copilotkit.tsx`, `resources/js/shared/agora_rest.ts` |
| OpenUI page and its glue (storage, interrupts, the sandbox panel) | `resources/js/pages/openui.tsx`, `resources/js/shared/agora_rest.ts` |
| A2UI page (official renderer, JSONL reader, actions, the custom `Sandbox` component) | `resources/js/pages/a2ui.tsx` |
| Shared React renderers, with their skeletons (`useGenuiNode()`) | `resources/js/shared/renderers.tsx`, `resources/css/genui.css` |
| Session cookie + CSRF for the AG-UI clients | `resources/js/shared/csrf.ts`, `config/shield.ts` (`enableXsrfCookie`) |
| E2E driver, non-visual, text-client and token scripts | `tests/e2e/run.mjs`, `scripts/non_visual.tsx`, `scripts/text_clients.mjs`, `scripts/token_cost.ts` |

## Notes and caveats

- **CopilotKit without a runtime.** The page hands an `HttpAgent` straight to
  `<CopilotKitProvider agents__unsafe_dev_only>` — the least code, and the browser's session cookie
  and CSRF header ride the request with no server piece. CopilotKit names that prop dev-only; in
  production it expects a `CopilotRuntime` (`@copilotkit/runtime/v2`) in front of the agent, which
  then calls `/agent/ag-ui` server to server and has to be told to forward `cookie` and the CSRF
  header (`forwardHeaders`). Not built here.
- **OpenUI's `AgentInterface`** sizes itself to the whole viewport; `app.css` overrides that to fit the
  shared layout. In development OpenUI also mounts an Inspect widget, and CopilotKit an inspector;
  both are turned off here so the screenshots compare the chats.
- **The OpenUI page sends no `uiCapabilities`.** Tool pushes then travel as `agora.ui` events, which
  OpenUI ignores. Declaring `{ components: [] }` would stream their fallback text into the reply
  instead (not tried with OpenUI).
- **CopilotKit's console** shows a `404` when the history glue asks for a brand-new thread that does
  not exist yet (expected). The renderers default every prop, so half-streamed `ui__render`
  arguments no longer throw; the glue's per-node boundaries stay for renderers that do.
- **The skeletons are the native page's.** `list_orders` pushes one only to a client that declared
  `OrderList` in its UI capabilities: the AG-UI pages declare none, so they get the rows only, and a
  text channel would never see a "loading…" it cannot take back.
- **Install-time telemetry.** `pnpm-workspace.yaml` denies the install scripts of
  `@openuidev/lang-core` (a PostHog ping) and `@scarf/scarf` (a CopilotKit dependency).
- **The sandbox's way out.** The iframe has `sandbox="allow-scripts"` only (an opaque origin: no cookies,
  storage or page DOM) and a CSP with no network; `agent.send` is the only thing that leaves it, and the
  host checks the frame, its token, size, rate and count before it becomes a turn. On the native page
  the user's bubble shows the whole action text — the sentence, then `[UI action …]` and the JSON the
  model reads; CopilotKit and OpenUI show only the sentence (the action rides `forwardedProps.uiAction`
  and the server builds the turn).
- **The OpenUI sandbox panel** is the page's own: it shows the latest sandbox of the session and is
  not restored from a stored thread.
- **The A2UI page keeps no history.** A2UI has no "load the conversation" message; after a reload the
  page starts a new thread. An approval surface stays on screen, buttons and all, after its decision.
- **Two A2UI catalog ids.** `@a2ui/react` 0.12 and the library use the v0.9 basic catalog id
  `https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json`; CopilotKit 1.77's renderer still
  registers `https://a2ui.org/specification/v0_9/basic_catalog.json`, hence the `catalogId` on the
  AG-UI route. The `/a2ui` page creates its UI surfaces on its own catalog id (basic components +
  `Sandbox`); text and approval surfaces always use the basic catalog.
- **The scripted model** writes what a model would; it does not prove a real model writes valid
  OpenUI Lang or valid `ui__render` trees as reliably. Row 7 shows what each side does when it does not.
