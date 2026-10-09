import '../shared/no_openui_devtools.js'
import { StrictMode, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import {
  AgentInterface,
  agUIAdapter,
  fetchLLM,
  useThread,
  type AGUIEvent,
  type ChatStorage,
  type StreamProtocolAdapter,
} from '@openuidev/react-ui'
import '@openuidev/react-ui/styles/index.css'
import {
  GenuiActionProvider,
  GenuiNodeScope,
  SandboxView,
  type UiAction,
} from '@adonis-agora/agent/react/genui'
import type { SandboxProps } from '@adonis-agora/agent/genui'
import { Shell } from '../shared/shell.js'
import { onScenario } from '../shared/scenarios.js'
import { csrfFetch } from '../shared/csrf.js'
import { listThreads, threadMessages } from '../shared/agora_rest.js'
import { library } from '../shared/openui_library.js'

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
      watchSandbox(event)
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

// ---- GLUE (sandbox, 35 lines with its hooks in agentFetch and Bridge): OpenUI Lang has no sandbox,
// and OpenUI ignores the `agora.ui` events that carry one. Keep the latest `Sandbox` frame from the stream (the server's previews included)
// and draw it beside the chat with the library's renderer; its `agent.send(...)` goes out as the next
// turn, the action riding the request as `forwardedProps.uiAction`.
type SandboxFrame = { id: string; props: SandboxProps; incomplete: boolean }
let sandbox: SandboxFrame | null = null
let pendingUiAction: UiAction | null = null
let sendTurn: (content: string) => void = () => {}
const sendUiAction = (action: UiAction) => {
  pendingUiAction = action
  sendTurn(action.text ?? `[${action.name}]`)
}
const sandboxListeners = new Set<() => void>()
function watchSandbox(event: AGUIEvent) {
  const custom = event as AGUIEvent & { name?: string; value?: any }
  const root = custom.value?.props?.root
  if (event.type !== 'CUSTOM' || custom.name !== 'agora.ui' || root?.type !== 'Sandbox') return
  sandbox = { id: custom.value.id, props: root.props ?? {}, incomplete: root.incomplete === true }
  sandboxListeners.forEach((notify) => notify())
}
function SandboxPanel() {
  const frame = useSyncExternalStore((notify) => (sandboxListeners.add(notify), () => void sandboxListeners.delete(notify)), () => sandbox)
  if (!frame) return null
  return (
    <aside className="openui-sandbox" data-testid="openui-sandbox">
      <GenuiNodeScope node={{ id: 'root', type: 'Sandbox', incomplete: frame.incomplete, held: false, streamSafe: frame.incomplete }}>
        <GenuiActionProvider onAction={sendUiAction}>
          <SandboxView key={frame.id} {...frame.props} />
        </GenuiActionProvider>
      </GenuiNodeScope>
    </aside>
  )
}

const llm = fetchLLM({
  url: '/agent/ag-ui',
  fetch: agentFetch,
  streamAdapter: watchInterrupts(agUIAdapter()),
  body: { forwardedProps: { pageContext: { frontend: 'openui' } } },
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
        <AgentInterface llm={llm} storage={storage} componentLibrary={library} agentName="Orders assistant" theme={{ mode: 'light' }}>
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
      <SandboxPanel />
    </Shell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OpenUiPage />
  </StrictMode>
)
