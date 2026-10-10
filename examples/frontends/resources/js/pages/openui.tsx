import '../shared/no_openui_devtools.js'
import { StrictMode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  AgentInterface,
  agUIAdapter,
  defineArtifactRenderer,
  fetchLLM,
  partialJSONParse,
  useThread,
  useThreadList,
  type AGUIEvent,
  type ChatStorage,
  type StreamProtocolAdapter,
} from '@openuidev/react-ui'
import '@openuidev/react-ui/styles/index.css'
import {
  GenuiActionProvider,
  GenuiNodeScope,
  SandboxView,
  uiActionSummary,
  type UiAction,
} from '@adonis-agora/agent/react/genui'
import { normalizeTreeInput, type SandboxProps } from '@adonis-agora/agent/genui'
import { Shell } from '../shared/shell.js'
import { onScenario } from '../shared/scenarios.js'
import { csrfFetch } from '../shared/csrf.js'
import { listThreads, threadMessages } from '../shared/agora_rest.js'
import { library } from '../shared/openui_library.js'
import { catalog } from '#genui/catalog'

/**
 * OpenUI over `POST /agent/ag-ui`. Generative UI here is text: the server adds the library's
 * `prompt()` to the system prompt (config/agent.ts), the model answers in OpenUI Lang, and
 * `componentLibrary` renders it. `pageContext.frontend` is how the server knows to do that.
 */

// ---- GLUE (approvals, 25 lines): OpenUI ignores RUN_FINISHED interrupts. Catch them, show a card,
// and answer by sending the next turn with AG-UI `resume` added to the request body.
type Interrupt = { id: string; reason: string; message?: string }
let pendingResume: Array<{ interruptId: string; status: 'resolved'; payload: unknown }> | null = null
const listeners = new Set<(interrupt: Interrupt | null) => void>()

const watchInterrupts = (inner: StreamProtocolAdapter): StreamProtocolAdapter => ({
  async *parse(response) {
    for await (const event of inner.parse(response)) {
      const outcome = (event as AGUIEvent & { outcome?: { type: string; interrupts: Interrupt[] } }).outcome
      if (event.type === 'RUN_FINISHED' && outcome?.type === 'interrupt') {
        listeners.forEach((notify) => notify(outcome.interrupts[0] ?? null))
      }
      yield event
    }
  },
})

const agentFetch: typeof fetch = (input, init = {}) => {
  if ((pendingResume || pendingUiAction) && typeof init.body === 'string') {
    const body = JSON.parse(init.body)
    if (pendingResume) body.resume = pendingResume
    if (pendingUiAction) body.forwardedProps = { ...body.forwardedProps, uiAction: pendingUiAction }
    init = { ...init, body: JSON.stringify(body) }
    pendingResume = null
    pendingUiAction = null
  }
  return csrfFetch(input, init) // the session cookie, and shield's CSRF header
}
// ---- end glue

// ---- GLUE (sandbox, 40 lines with its hooks in agentFetch and Bridge): OpenUI Lang has no sandbox.
// The model writes one with `ui__sandbox` (or inside a `ui__render` tree) — a tool call — and OpenUI
// draws a tool call inline with an "artifact renderer" matched by tool name — from the call's
// arguments while they stream, and from the stored call after a reload. Draw the props (or the
// `Sandbox` node of the tree) with the library's
// renderer: `incomplete` while the call streams (the arguments are raw, so the preview runs no code
// until they are whole). Its `agent.send(...)` goes out as the next turn, the action riding the
// request as `forwardedProps.uiAction`; the chat shows the action's one line.
let pendingUiAction: UiAction | null = null
let sendTurn: (content: string) => void = () => {}
const sendUiAction = (action: UiAction) => {
  pendingUiAction = action
  sendTurn(uiActionSummary(action))
}
type Node = { type?: string; props?: Record<string, unknown>; children?: Node[] }
const findSandbox = (node: Node | undefined): Node | undefined =>
  node?.type === 'Sandbox' ? node : (node?.children ?? []).map(findSandbox).find(Boolean)
const drawSandbox = ({ props, streaming }: { props: SandboxProps; streaming: boolean }) => (
  <div className="openui-sandbox" data-testid="openui-sandbox">
    <GenuiNodeScope node={{ id: 'root', type: 'Sandbox', incomplete: streaming, held: false }}>
      <GenuiActionProvider onAction={sendUiAction}>
        <SandboxView {...props} />
      </GenuiActionProvider>
    </GenuiNodeScope>
  </div>
)
const readArgs = (args: unknown) => (typeof args === 'string' ? partialJSONParse(args) : args)
// `ui__sandbox` (`componentTools: ['Sandbox']` in config/agent.ts): its arguments ARE the props.
const sandboxRenderer = defineArtifactRenderer<{ props: SandboxProps; streaming: boolean }>({
  type: 'agora_sandbox',
  toolName: 'ui__sandbox',
  parser: ({ args }, { isStreaming }) => {
    const props = readArgs(args) as SandboxProps | undefined
    return props && typeof props === 'object' ? { props: { props, streaming: isStreaming }, meta: null } : null
  },
  preview: drawSandbox,
  actual: () => null,
})
// A Sandbox inside a `ui__render` tree. `normalizeTreeInput` reads the arguments the way the server
// does (a stringified tree, a dropped `{ type, props }` envelope), so what it accepted is drawn.
const treeSandboxRenderer = defineArtifactRenderer<{ props: SandboxProps; streaming: boolean }>({
  type: 'agora_tree_sandbox',
  toolName: 'ui__render',
  parser: ({ args }, { isStreaming }) => {
    const node = findSandbox(normalizeTreeInput(catalog, readArgs(args)) as Node)
    return node?.props ? { props: { props: node.props as SandboxProps, streaming: isStreaming }, meta: null } : null
  },
  preview: drawSandbox,
  actual: () => null,
})

const sandboxOnly = catalog.components
  .filter((component) => component.name === 'Sandbox')
  .map((component) => ({ name: component.name, version: component.version ?? 1 }))

const llm = fetchLLM({
  url: '/agent/ag-ui',
  fetch: agentFetch,
  streamAdapter: watchInterrupts(agUIAdapter()),
  // `uiCapabilities`: this page draws one catalog component, the `Sandbox` — so `ui__render` offers
  // the model only that, and everything else is written in OpenUI Lang.
  body: { forwardedProps: { pageContext: { frontend: 'openui' }, uiCapabilities: { components: sandboxOnly } } },
})

/**
 * GLUE (persistence, 14 lines): OpenUI keeps threads in memory unless given a `ChatStorage`, and
 * its `restStorage()` expects its own REST shape. Map it onto the agent's thread routes. A new
 * thread needs no request: the AG-UI route creates a thread under the id it is sent.
 */
const storage: ChatStorage = {
  thread: {
    listThreads: async () => ({
      threads: (await listThreads()).map((t) => ({ id: t.id, title: t.title, createdAt: t.createdAt })),
    }),
    createThread: async (first) => ({
      id: crypto.randomUUID(),
      title: typeof first.content === 'string' ? first.content.slice(0, 40) : 'New chat',
      createdAt: Date.now(),
    }),
    getMessages: (threadId) => threadMessages(threadId) as any,
    updateThread: async (thread) => thread,
    deleteThread: async (id) => void (await csrfFetch(`/agent/threads/${id}`, { method: 'DELETE' })),
  },
}

/** Inside the provider: the shell's scenario buttons, the approval card, and the sandbox's way out. */
function Bridge() {
  const { processMessage } = useThread()
  // GLUE (persistence, 6 lines): keep the open thread in the URL, so a reload reopens it.
  const { selectedThreadId, selectThread } = useThreadList()
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('thread')
    if (id) selectThread(id)
  }, [])
  useEffect(() => history.replaceState(null, '', selectedThreadId ? `?thread=${selectedThreadId}` : location.pathname), [selectedThreadId])
  const [interrupt, setInterrupt] = useState<Interrupt | null>(null)
  useEffect(() => onScenario((prompt) => void processMessage({ role: 'user', content: prompt })), [processMessage])
  useEffect(() => void (sendTurn = (content) => void processMessage({ role: 'user', content })), [processMessage])
  useEffect(() => {
    listeners.add(setInterrupt)
    return () => void listeners.delete(setInterrupt)
  }, [])
  const decide = (approved: boolean) => {
    pendingResume = [{ interruptId: interrupt!.id, status: 'resolved', payload: { approved } }]
    setInterrupt(null)
    void processMessage({ role: 'user', content: approved ? 'Approved.' : 'Rejected.' })
  }
  const overlay = document.getElementById('openui-overlay')
  return interrupt && overlay
    ? createPortal(
        <div className="card" data-testid="approval">
          <strong>{interrupt.message ?? 'Approve?'}</strong>
          <p>
            <button type="button" className="primary" onClick={() => decide(true)}>Approve</button>
            <button type="button" onClick={() => decide(false)}>Reject</button>
          </p>
        </div>,
        overlay
      )
    : null
}

function OpenUiPage() {
  return (
    <Shell current="/openui" subtitle="OpenUI 0.17 AgentInterface → POST /agent/ag-ui">
      <div className="openui-frame" style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <AgentInterface
          llm={llm}
          storage={storage}
          componentLibrary={library}
          artifactRenderers={[sandboxRenderer, treeSandboxRenderer]}
          agentName="Orders assistant"
          theme={{ mode: 'light' }}
        >
          <AgentInterface.Sidebar>
            <AgentInterface.SidebarHeader />
            <AgentInterface.NewChatButton />
            <AgentInterface.SidebarContent>
              <AgentInterface.ThreadList />
            </AgentInterface.SidebarContent>
            <Bridge />
          </AgentInterface.Sidebar>
        </AgentInterface>
        <div id="openui-overlay" style={{ position: 'absolute', right: 24, bottom: 90, zIndex: 10, width: 320 }} />
      </div>
    </Shell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OpenUiPage />
  </StrictMode>
)
