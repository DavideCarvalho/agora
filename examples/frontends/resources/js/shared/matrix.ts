/**
 * The comparison, as verified by running this app (tests/e2e/run.mjs, scripts/*). Line counts are
 * non-blank, non-comment lines of the glue in this repo. Keep in sync with the README.
 */
export type Status = 'built-in' | 'glue' | 'no' | 'unverified'

export interface Cell {
  status: Status
  note: string
}

export interface Row {
  id: string
  capability: string
  native: Cell
  copilotkit: Cell
  openui: Cell
  a2ui: Cell
}

export const rows: Row[] = [
  {
    id: '1',
    capability: 'Tool-driven component',
    native: { status: 'built-in', note: '`list_orders` pushes `OrderList`’s skeleton before it reads, then the rows under the same `id` (an empty or failed read ends it, so none is left standing); `<GenerativeUI>` draws both from the registry. Only the rows are stored.' },
    copilotkit: { status: 'built-in', note: '`useRenderTool({ name: "list_orders", render })` draws the tool call from its result (5 lines); until the result, `render` draws the page’s own loading line.' },
    openui: { status: 'built-in', note: 'No tool-driven UI: the model reads the result and writes `OrderList([...])` in OpenUI Lang — the data passes through the model.' },
    a2ui: { status: 'built-in', note: 'The same push, as an A2UI surface: a 30-line server mapper draws `OrderList` with basic components (rows, a Refund `Button` per row). The page declares the catalog, so the skeleton comes first — as a line of text (A2UI has no skeleton), replaced in place by the rows.' },
  },
  {
    id: '2',
    capability: 'Progressive render',
    native: { status: 'built-in', note: 'Pushes: the same `id` replaces in place (a chart, then 5 updates). Model-written layouts: `streaming: "partial"` draws the `ui__render` tree while the model writes it — nodes keep their place, renderers draw skeletons from `useGenuiNode().incomplete`, and the chart (`streaming: "complete"`) is a placeholder until its props are whole. Only the final, validated tree is stored.' },
    copilotkit: { status: 'glue', note: 'Tool pushes: 20 lines to read the `agora.ui` events CopilotKit ignores. Model-written layouts: built in — render gets partially parsed arguments while they stream.' },
    openui: { status: 'built-in', note: 'Each OpenUI Lang statement renders as it arrives, with placeholders for what is not written yet. Tool pushes: not possible (CUSTOM events ignored).' },
    a2ui: { status: 'built-in', note: 'One surface per UI frame id: a re-push under the same `id` and every preview of a streamed `ui__render` tree is an `updateComponents` on the same surface, which grows in place. The chart arrives as a table (the basic catalog has none).' },
  },
  {
    id: '3',
    capability: 'Model-composed layout',
    native: { status: 'built-in', note: '`genui({ catalog })` (tree mode is the default): `ui__render` nests any catalog component, with an exact schema per component, validated node by node. Builtins are definitions only — you write every renderer (9 here, 88 lines with their skeletons, + 29 of shared skeleton pieces).' },
    copilotkit: { status: 'glue', note: '20 lines to draw the `ui__render` tree with your renderers (+ error boundaries for partial args). CopilotKit’s own answer is A2UI — which works against this server too (row 11).' },
    openui: { status: 'built-in', note: 'Strongest: 84 styled components (charts, tables, forms, tabs…) the model composes freely, with no renderer to write.' },
    a2ui: { status: 'built-in', note: 'The library maps its builtins onto A2UI’s basic catalog (Card, Column/Row, Text, Button…); the official renderer styles them. No chart in the basic catalog: a `Chart` becomes a table of its points.' },
  },
  {
    id: '4',
    capability: 'Interactive component → agent',
    native: { status: 'built-in', note: 'Renderers are your React components; a 3-line context reaches `chat.sendMessage`. The approval card comes from the transcript (`call.approve.run()`).' },
    copilotkit: { status: 'built-in', note: '`agent.addMessage` + `copilotkit.runAgent` (4 lines). `useInterrupt` answers the AG-UI interrupt with `resume`. Its default card shows “Done” for a rejected call.' },
    openui: { status: 'glue', note: 'Clicks are built in (`Action([@ToAssistant(...)])`, `useTriggerAction`). Approvals: 46 lines — OpenUI ignores interrupts; the reply is sent as a synthetic “Approved.” message carrying `resume`.' },
    a2ui: { status: 'built-in', note: 'A `Button` action event (`refund` + `{ orderId }`) comes back from the processor’s action handler and is posted as `{ action }`; the approval is a surface with Approve / Reject buttons (`agora.approve` / `agora.reject`). The page’s whole action path is ~10 lines.' },
  },
  {
    id: '5',
    capability: 'Persistence (reload, reopen)',
    native: { status: 'built-in', note: '`useAgentChat({ threadId })` + `useThreads()`; components redraw from the message’s persisted `ui` list.' },
    copilotkit: { status: 'glue', note: '13 lines (`connect` → `MESSAGES_SNAPSHOT`) + ~30 to convert stored messages + 26 for a thread list (CopilotKit’s needs its hosted platform). Redraws from stored tool args/results.' },
    openui: { status: 'glue', note: '15-line `ChatStorage` over the agent’s thread routes (+ the shared converter) + 6 lines to keep the thread in the URL. The OpenUI Lang source is the message text, so it redraws exactly; the sandbox redraws from its stored call.' },
    a2ui: { status: 'glue', note: '12 lines. A2UI has no history message: the thread id rides the URL, and `GET /agent/a2ui/threads/:id` answers the stored thread as user lines + each step’s surfaces (under their live ids), fed to the processor. An approval still waiting is not redrawn.' },
  },
  {
    id: '6',
    capability: 'Non-visual surfaces, fallback',
    native: { status: 'built-in', note: 'Capability negotiation + server-generated `fallbackText`: a client that draws only `Card` and `KpiCards` got the whole dashboard as text (its previews withdrawn); a text-only one is not offered `ui__render` and got the orders as a text list, never a skeleton. Same React renderer server-rendered to PNG/PDF.' },
    copilotkit: { status: 'no', note: 'Rendering is client-side only; a tool call without a renderer draws nothing (or the generic card). A text channel gets the prose.' },
    openui: { status: 'no', note: 'The UI is the model’s text: a text channel would receive OpenUI Lang source. No fallback text, no server render.' },
    a2ui: { status: 'built-in', note: 'Same server: a component nothing maps is sent as its `fallbackText` in a `Text` (CopilotKit’s A2UI renderer got the sandbox that way). A2UI itself is renderer-agnostic JSON — Lit, Angular, Flutter and React renderers exist; only React was run here.' },
  },
  {
    id: '7',
    capability: 'Typing, validation, versioning',
    native: { status: 'built-in', note: 'Props schema per component, validated on the server before streaming (and on the client). The invalid pie chart was refused against `ui__render`’s exact schema as a tool error; the model retried. Per-component `version`.' },
    copilotkit: { status: 'no', note: 'The zod `parameters` type the renderer only: arguments reach `render` unvalidated (and partial while streaming). No component versioning.' },
    openui: { status: 'no', note: 'zod props per component, but invalid arguments are dropped silently — the chart just did not appear; the model is never told. No versioning.' },
    a2ui: { status: 'built-in', note: 'The server validates before anything streams (the invalid pie chart was refused and retried, as on the native page); the A2UI processor checks each message against the v0.9 schema. The refusal itself is not drawn — only the model’s words about it.' },
  },
  {
    id: '8',
    capability: 'DX: one new component end to end',
    native: { status: 'built-in', note: 'Definition 24 lines in a file both sides import (schema, description, fallbackText, a loading state) + React renderer + 1 registry key. A skeleton state shared by every component: 9 more lines.' },
    copilotkit: { status: 'built-in', note: 'React renderer + a 5-line `useRenderTool`, all client-side; the component is bound to a tool, not a catalog.' },
    openui: { status: 'built-in', note: 'One 17-line `defineComponent` (zod props + description + React component) — but the server must import that client module to build the prompt.' },
    a2ui: { status: 'glue', note: 'Per app component: a server-side mapper to basic components (`OrderList`: 30 lines), or a custom component registered in the page’s A2UI catalog (the `Sandbox`: ~25 lines, `createBinderlessComponentImplementation`).' },
  },
  {
    id: '9',
    capability: 'Targets, token cost',
    native: { status: 'built-in', note: 'React; framework-free client for anything else; HTML/PNG/PDF; text channels. `ui__render` over 9 components: ~2.1k prompt tokens with its exact schema (~680 with `treeSchema: "loose"`); the `Sandbox` adds ~2.2k characters more (description + schema; not re-measured). Dashboard 279 output tokens.' },
    copilotkit: { status: 'built-in', note: 'React, Vue, Angular, React Native packages (published; only React run here). No prompt of its own.' },
    openui: { status: 'built-in', note: 'React, Vue, Svelte, Angular, React Email (published; only React run here). Full chat-library prompt ~14k tokens per turn (an 11-component library: ~1.3k); dashboard 198 output tokens (−29%).' },
    a2ui: { status: 'built-in', note: 'No prompt of its own here (the agent writes `ui__render` trees; the server converts them). Renderers: React (run), Lit, Angular, Flutter (published).' },
  },
  {
    id: '10',
    capability: 'Sandboxed generated UI (scenario 8)',
    native: { status: 'built-in', note: '`Sandbox` in the shared catalog + `Sandbox: SandboxView` in the registry + `GenuiActionProvider onAction={chat.sendUiAction}` (1 line). The server trims what streams (no half-written CSS or JS), so it goes placeholder → preview → live while the model writes; `agent.send` becomes the next user message; its JSON block is for the model, the bubble is a chip (“Settle it for 4 people · total: 120, …”: `block.uiAction` → `<UiActionChip>`, 3 lines).' },
    copilotkit: { status: 'glue', note: 'The tree glue draws it with `SandboxView`, wrapped in `GenuiNodeScope` (incomplete until the call is complete: CopilotKit’s partial arguments are raw, so the code waits); the action goes out as `forwardedProps.uiAction` once the running turn ends, shown as one line (`uiActionSummary`). All three phases shown. With CopilotKit’s A2UI renderer: its summary text only. CopilotKit’s own sandbox (“Open Generative UI”, its own tool and activity) — not tried here.' },
    openui: { status: 'glue', note: '30 lines: OpenUI Lang has no sandbox, but OpenUI draws tool calls with “artifact renderers”: one for `ui__render` draws the `Sandbox` node with `SandboxView` inline in the thread, while the call streams and from the stored call after a reload. The page declares only `Sandbox`, so `ui__render` offers nothing else; the action rides the next request as `forwardedProps.uiAction`.' },
    a2ui: { status: 'glue', note: 'A custom `Sandbox` component in the page’s A2UI catalog (~25 lines around `SandboxView`); the server sends it flat with `incomplete` while it streams (a 3-line mapper), and `agent.send` is dispatched as an A2UI action. All three phases shown.' },
  },
  {
    id: '11',
    capability: 'A2UI (v0.9)',
    native: { status: 'built-in', note: 'The library serves it: `a2uiAdapter()` (`POST /agent/a2ui`, JSON Lines of A2UI messages, actions and approvals in) and `agUiAdapter({ a2ui })` (`a2ui-surface` activities on the AG-UI stream). The native page does not need it.' },
    copilotkit: { status: 'built-in', note: '`/copilotkit?renderer=a2ui`: `renderActivityMessages={[createA2UIMessageRenderer(...)]}` draws the activities; the Refund button’s action goes back as `forwardedProps.a2uiAction`. CopilotKit 1.77 knows the basic catalog by an earlier id; the server sends that id over AG-UI unless a client advertises another — no configuration.' },
    openui: { status: 'no', note: 'OpenUI renders OpenUI Lang only; it has no A2UI renderer.' },
    a2ui: { status: 'built-in', note: 'Google’s official `@a2ui/react` renderer + `@a2ui/web_core` processor. The page (135 lines, composer included) POSTs, feeds each JSON line to the processor, draws every surface in order and posts actions back.' },
  },
]
