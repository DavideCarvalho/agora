# Generative UI: native vs CopilotKit vs OpenUI

One AdonisJS 7 agent ([`@adonis-agora/agent`](https://www.npmjs.com/package/@adonis-agora/agent) 0.66.1),
three pages that drive it with three different frontends, and the same generative-UI tasks on each:

| Page | Frontend | Talks to |
| --- | --- | --- |
| `/native` | `@adonis-agora/agent/react` (`AgentProvider`, `useAgentChat`, `<GenerativeUI>`) | the native stream, `POST /agent/chat` |
| `/copilotkit` | CopilotKit 1.77 (`@copilotkit/react-core/v2`, `CopilotChat`) | `POST /agent/ag-ui` (`agUiAdapter()`) |
| `/openui` | OpenUI 0.17 (`@openuidev/react-ui`, `AgentInterface`) | `POST /agent/ag-ui` (`agUiAdapter()`) |
| `/` | the comparison matrix below | — |

The point is an honest comparison: every cell in the matrix comes from running these pages
(`pnpm e2e` drives all of them in headless Chromium and writes the screenshots in
[`docs/screenshots/`](docs/screenshots)). Where CopilotKit or OpenUI do better, the matrix says so.

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
<http://localhost:3333> for the matrix, then any of the three pages. The left column has the same
scenario buttons on every page.

To check the matrix yourself:

```bash
npx playwright install chromium
node ace serve &              # without --watch: the run writes screenshots, which would restart it
pnpm e2e                      # BASE_URL=http://localhost:3333 by default; `pnpm e2e openui` for one page
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
([`app/agent/tools.ts`](app/agent/tools.ts)) and a catalog of ten components
([`app/genui/catalog.ts`](app/genui/catalog.ts): the app's `OrderList` plus nine library builtins):

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

## The matrix (verified)

"Glue" is app code in this repo that bridges the frontend to this agent; the count is non-blank,
non-comment lines.

| # | Capability | Native | CopilotKit | OpenUI |
| --- | --- | --- | --- | --- |
| 1 | Tool-driven component | **Built in.** `list_orders` pushes `OrderList`'s skeleton before it reads, then the rows under the same `id`; an empty or failed read ends it, so none is left standing. `<GenerativeUI>` draws both from the registry; only the rows are stored. No skeleton for a client that did not declare `OrderList`. | **Built in.** `useRenderTool({ name: 'list_orders', render })` draws the tool call from its result (5 lines); until the result arrives, `render` draws the page's own loading line. | **Built in, differently.** No tool-driven UI: the model reads the result and writes `OrderList([...])` in OpenUI Lang, so the data passes through the model. |
| 2 | Progressive render | **Built in** for pushes: the same `id` replaces in place (a chart, then 5 updates). **Built in** for model-written layouts: with `streaming: 'partial'` the `ui__render` tree draws while the model writes it; nodes keep their place, renderers draw skeletons from `useGenuiNode().incomplete`, and the chart (`streaming: 'complete'`) is a placeholder until its props are whole. Only the final, validated tree is stored. | **Glue (20 lines)** for pushes: read the `agora.ui` events CopilotKit ignores. **Built in** for model-written layouts: `render` gets partially parsed arguments while they stream. | **Built in** for model-written UI: each statement renders as it arrives, with placeholders for the rest. Tool pushes: **not possible** (CUSTOM events are ignored). |
| 3 | Model-composed layout | **Built in.** `genui({ catalog })` (tree mode is the default): `ui__render` nests any catalog component, with an exact schema per component, validated node by node. The builtins are definitions only, so you write every renderer (9 here, 88 lines with their skeletons, plus 29 of shared skeleton pieces). | **Glue (20 lines)** to draw the `ui__render` tree with your renderers, including per-node error boundaries for partial arguments. CopilotKit's own route to model-composed UI is A2UI; **not tried** against this server. | **Built in, and the strongest.** 84 ready, styled components (charts, tables, forms, tabs, carousels…) the model composes freely; no renderer to write. |
| 4 | Interactive component → agent | **Built in.** Renderers are your React components; a 3-line context reaches `chat.sendMessage`. The approval card comes from the transcript (`call.approve.run()`). | **Built in.** `agent.addMessage` + `copilotkit.runAgent` (4 lines); `useInterrupt` answers the AG-UI interrupt with `resume`. Its default tool card says "Done" for a rejected call. | Clicks **built in** (`Button(..., Action([@ToAssistant(...)]))` in Lang, `useTriggerAction()` in a component). Approvals **glue (46 lines)**: OpenUI ignores interrupts, so the reply goes out as a synthetic "Approved." message that carries `resume`. |
| 5 | Persistence (reload, reopen) | **Built in.** `useAgentChat({ threadId })` + `useThreads()`; components redraw from the message's persisted `ui` list. | **Glue.** 13 lines (`connect` → `MESSAGES_SNAPSHOT`) + ~30 to convert stored messages + 26 for a thread list (CopilotKit's own needs its hosted platform). Redraws from the stored tool arguments and results. | **Glue.** A 15-line `ChatStorage` over the agent's thread routes (plus the same converter). The OpenUI Lang source is the message text, so it redraws exactly. |
| 6 | Non-visual surfaces, fallback | **Built in.** Capability negotiation + server-generated `fallbackText`: a client that draws only `Card` and `KpiCards` received the whole dashboard as readable text (its previews withdrawn); a text-only client is not offered `ui__render` at all, and received the orders as a text list, never a skeleton. The same React renderer rendered to PNG on the server ([screenshot](docs/screenshots/server-render-order-list.png)). | **No.** Rendering is client-side only; a tool call without a renderer draws nothing (or the generic card). A text channel gets the prose. | **No.** The UI is the model's text: a text channel would receive OpenUI Lang source. No fallback text, no server render. |
| 7 | Typing, validation, versioning | **Built in.** A props schema per component, validated on the server before anything streams (and again on the client). The invalid pie chart was refused against `ui__render`'s exact schema, came back as a tool error, and the model retried with a bar chart. Per-component `version`. | **No.** The zod `parameters` type the renderer only: arguments reach `render` unvalidated (and partial while streaming). No component versioning. | **No.** zod props per component, but invalid arguments are dropped silently: the chart simply did not appear and the model is never told. No versioning. |
| 8 | DX: one new component end to end | A 24-line definition in a file both sides import (schema, description, `fallbackText`, a loading state) + the React renderer + 1 registry key. The loading state shared by every component is 9 more lines. | The React renderer + a 5-line `useRenderTool`, all client-side; the component is bound to a tool, not to a catalog. | **Leanest:** one 17-line `defineComponent` (zod props + description + React component). The catch: the server imports that client module to build the prompt. |
| 9 | Targets, token cost | React; a framework-free client for anything else; HTML/PNG/PDF; text channels. `ui__render` over 9 components adds ~2.1k prompt tokens with its exact schema (~680 with `treeSchema: 'loose'`); the dashboard is 279 output tokens. | React, Vue, Angular and React Native packages (published; only React was run here). No prompt of its own. | React, Vue, Svelte, Angular and React Email renderers (published; only React was run here). The full chat-library prompt is ~14k tokens per turn (an 11-component library: ~1.3k); the dashboard is 198 output tokens, 29% fewer than the JSON. |

Token counts: o200k tokenizer over the exact system prompt and tool definitions the model received
(`DEBUG_TOOLS=dump node ace serve` writes them to `tmp/turn-dump.json`) and over the two dashboard
outputs (`scripts/token_cost.ts`). `OrderList` is `internal` (only its tool pushes it), so
`ui__render` offers the 9 builtins.

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
- **Native** wins where the server matters: validated, versioned components with a server-side
  source of truth (row 7), the same output on non-visual surfaces (row 6), and persistence and
  approvals with no glue (rows 4–5). It now draws a layout while the model writes it too (row 2),
  with stable nodes, an `incomplete` flag for skeletons and only the validated tree stored, and a
  tool can show its component's skeleton before it reads (row 1). It loses on composition breadth —
  the builtins have no visuals, so you write every renderer and its skeleton — and its exact
  `ui__render` schema costs ~2.1k prompt tokens over 9 components (row 9).

## Screenshots

| | Native | CopilotKit | OpenUI |
| --- | --- | --- | --- |
| 1 Orders table, while the tool reads | ![](docs/screenshots/native-1-orders-loading.png) | ![](docs/screenshots/copilotkit-1-orders-loading.png) | — |
| 1 Orders table | ![](docs/screenshots/native-1-orders.png) | ![](docs/screenshots/copilotkit-1-orders.png) | ![](docs/screenshots/openui-1-orders.png) |
| 2 Progressive (mid-stream) | ![](docs/screenshots/native-2-progressive-mid.png) | ![](docs/screenshots/copilotkit-2-progressive-mid.png) | ![](docs/screenshots/openui-2-progressive-mid.png) |
| 3 Dashboard (mid-stream) | ![](docs/screenshots/native-3-dashboard-mid.png) | ![](docs/screenshots/copilotkit-3-dashboard-mid.png) | ![](docs/screenshots/openui-3-dashboard-mid.png) |
| 3 Dashboard | ![](docs/screenshots/native-3-dashboard.png) | ![](docs/screenshots/copilotkit-3-dashboard.png) | ![](docs/screenshots/openui-3-dashboard.png) |
| 4 Approval from the Refund button | ![](docs/screenshots/native-4-approval.png) | ![](docs/screenshots/copilotkit-4-approval.png) | ![](docs/screenshots/openui-4-approval.png) |
| 4 Approved, then rejected | ![](docs/screenshots/native-4-rejected.png) | ![](docs/screenshots/copilotkit-4-rejected.png) | ![](docs/screenshots/openui-4-rejected.png) |
| 5 After a reload | ![](docs/screenshots/native-5-reloaded.png) | ![](docs/screenshots/copilotkit-5-reloaded.png) | ![](docs/screenshots/openui-5-reloaded.png) |
| 7 Invalid props | ![](docs/screenshots/native-7-invalid.png) | ![](docs/screenshots/copilotkit-7-invalid.png) | ![](docs/screenshots/openui-7-invalid.png) |

## The file tour

| Concern | File(s) |
| --- | --- |
| The agent: model choice, store, `genui` (tree mode, `streaming: 'partial'`), `agUiAdapter()`, the per-frontend prompt | `config/agent.ts` |
| The catalog (the app's `OrderList` with its loading state + builtins, the chart streaming `complete`) | `app/genui/catalog.ts` |
| Tools: a skeleton then the data, same-`id` pushes, an `action` tool | `app/agent/tools.ts`, `app/agent/ui_slot.ts` |
| The scripted model (offline, deterministic) | `app/agent/scripted_model.ts` |
| OpenUI's library prompt on the server | `app/agent/openui_prompt.ts`, `resources/js/shared/openui_library.tsx` |
| Native page | `resources/js/pages/native.tsx` |
| CopilotKit page and its glue (history, thread list, `agora.ui`, tree) | `resources/js/pages/copilotkit.tsx`, `resources/js/shared/agora_rest.ts` |
| OpenUI page and its glue (storage, interrupts) | `resources/js/pages/openui.tsx`, `resources/js/shared/agora_rest.ts` |
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
- **The scripted model** writes what a model would; it does not prove a real model writes valid
  OpenUI Lang or valid `ui__render` trees as reliably. Row 7 shows what each side does when it does not.
