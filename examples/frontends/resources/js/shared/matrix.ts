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
}

export const rows: Row[] = [
  {
    id: '1',
    capability: 'Tool-driven component',
    native: { status: 'built-in', note: 'The tool’s `present` pushes `OrderList`; `<GenerativeUI>` draws it from the registry.' },
    copilotkit: { status: 'built-in', note: '`useRenderTool({ name: "list_orders", render })` draws the tool call from its result (5 lines).' },
    openui: { status: 'built-in', note: 'No tool-driven UI: the model reads the result and writes `OrderList([...])` in OpenUI Lang — the data passes through the model.' },
  },
  {
    id: '2',
    capability: 'Progressive render',
    native: { status: 'built-in', note: 'A push under the same `id` replaces in place (placeholder → 6 updates). A `ui__render` layout appears only once the call ran — nothing is drawn while the model writes it.' },
    copilotkit: { status: 'glue', note: 'Tool pushes: 20 lines to read the `agora.ui` events CopilotKit ignores. Model-written layouts: built in — render gets partially parsed arguments while they stream.' },
    openui: { status: 'built-in', note: 'Each OpenUI Lang statement renders as it arrives, with placeholders for what is not written yet. Tool pushes: not possible (CUSTOM events ignored).' },
  },
  {
    id: '3',
    capability: 'Model-composed layout',
    native: { status: 'built-in', note: '`genui({ mode: "tree" })`: `ui__render` nests any catalog component, validated node by node. Builtins are definitions only — you write every renderer (9 here, 65 lines).' },
    copilotkit: { status: 'glue', note: '20 lines to draw the `ui__render` tree with your renderers (+ error boundaries for partial args). CopilotKit’s own answer is A2UI — not tried against this server.' },
    openui: { status: 'built-in', note: 'Strongest: 84 styled components (charts, tables, forms, tabs…) the model composes freely, with no renderer to write.' },
  },
  {
    id: '4',
    capability: 'Interactive component → agent',
    native: { status: 'built-in', note: 'Renderers are your React components; a 3-line context reaches `chat.sendMessage`. The approval card comes from the transcript (`call.approve.run()`).' },
    copilotkit: { status: 'built-in', note: '`agent.addMessage` + `copilotkit.runAgent` (4 lines). `useInterrupt` answers the AG-UI interrupt with `resume`. Its default card shows “Done” for a rejected call.' },
    openui: { status: 'glue', note: 'Clicks are built in (`Action([@ToAssistant(...)])`, `useTriggerAction`). Approvals: 46 lines — OpenUI ignores interrupts; the reply is sent as a synthetic “Approved.” message carrying `resume`.' },
  },
  {
    id: '5',
    capability: 'Persistence (reload, reopen)',
    native: { status: 'built-in', note: '`useAgentChat({ threadId })` + `useThreads()`; components redraw from the message’s persisted `ui` list.' },
    copilotkit: { status: 'glue', note: '13 lines (`connect` → `MESSAGES_SNAPSHOT`) + ~30 to convert stored messages + 26 for a thread list (CopilotKit’s needs its hosted platform). Redraws from stored tool args/results.' },
    openui: { status: 'glue', note: '15-line `ChatStorage` over the agent’s thread routes (+ the shared converter). The OpenUI Lang source is the message text, so it redraws exactly.' },
  },
  {
    id: '6',
    capability: 'Non-visual surfaces, fallback',
    native: { status: 'built-in', note: 'Capability negotiation + server-generated `fallbackText`: a text-only client got the whole dashboard as text. Same React renderer server-rendered to PNG/PDF.' },
    copilotkit: { status: 'no', note: 'Rendering is client-side only; a tool call without a renderer draws nothing (or the generic card). A text channel gets the prose.' },
    openui: { status: 'no', note: 'The UI is the model’s text: a text channel would receive OpenUI Lang source. No fallback text, no server render.' },
  },
  {
    id: '7',
    capability: 'Typing, validation, versioning',
    native: { status: 'built-in', note: 'Props schema per component, validated on the server before streaming (and on the client). The invalid pie chart was a tool error; the model retried. Per-component `version`.' },
    copilotkit: { status: 'no', note: 'The zod `parameters` type the renderer only: arguments reach `render` unvalidated (and partial while streaming). No component versioning.' },
    openui: { status: 'no', note: 'zod props per component, but invalid arguments are dropped silently — the chart just did not appear; the model is never told. No versioning.' },
  },
  {
    id: '8',
    capability: 'DX: one new component end to end',
    native: { status: 'built-in', note: 'Definition 20 lines in a file both sides import (schema, description, fallbackText) + React renderer + 1 registry key.' },
    copilotkit: { status: 'built-in', note: 'React renderer + a 5-line `useRenderTool`, all client-side; the component is bound to a tool, not a catalog.' },
    openui: { status: 'built-in', note: 'One 17-line `defineComponent` (zod props + description + React component) — but the server must import that client module to build the prompt.' },
  },
  {
    id: '9',
    capability: 'Targets, token cost',
    native: { status: 'built-in', note: 'React; framework-free client for anything else; HTML/PNG/PDF; text channels. ~740 prompt tokens for `ui__render` over 10 components; dashboard 279 output tokens.' },
    copilotkit: { status: 'built-in', note: 'React, Vue, Angular, React Native packages (published; only React run here). No prompt of its own.' },
    openui: { status: 'built-in', note: 'React, Vue, Svelte, Angular, React Email (published; only React run here). Full chat-library prompt ~14k tokens per turn (an 11-component library: ~1.3k); dashboard 198 output tokens (−29%).' },
  },
]
