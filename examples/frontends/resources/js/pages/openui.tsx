import '../shared/no_openui_devtools'
import { StrictMode, useEffect, useState } from 'react'
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
import { openuiChatLibrary } from '@openuidev/react-ui/genui-lib'
import '@openuidev/react-ui/styles/index.css'
import { Shell } from '../shared/shell'
import { onScenario } from '../shared/scenarios'
import { csrfFetch } from '../shared/csrf'
import { listThreads, threadMessages } from '../shared/agora_rest'

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
  if (pendingResume && typeof init.body === 'string') {
    init = { ...init, body: JSON.stringify({ ...JSON.parse(init.body), resume: pendingResume }) }
    pendingResume = null
  }
  return csrfFetch(input, init) // the session cookie, and shield's CSRF header
}
// ---- end glue

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

/** Inside the provider: the shell's scenario buttons, and the approval card of the glue above. */
function Bridge() {
  const { processMessage } = useThread()
  const [interrupt, setInterrupt] = useState<Interrupt | null>(null)
  useEffect(() => onScenario((prompt) => void processMessage({ role: 'user', content: prompt })), [processMessage])
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
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <AgentInterface llm={llm} storage={storage} componentLibrary={openuiChatLibrary} agentName="Orders assistant" theme={{ mode: 'light' }}>
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
