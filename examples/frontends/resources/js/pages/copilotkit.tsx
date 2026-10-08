import { StrictMode, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  CopilotChat,
  CopilotKitProvider,
  HttpAgent,
  useAgent,
  useCopilotKit,
  useDefaultRenderTool,
  useInterrupt,
  useRenderTool,
} from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { Observable } from 'rxjs'
import { z } from 'zod'
import { Shell } from '../shared/shell'
import { OrderList, type OrderRow } from '../shared/order_list'
import { onScenario } from '../shared/scenarios'
import { csrfFetch } from '../shared/csrf'
import { cancelRun, listThreads, threadMessages, type ThreadSummary } from '../shared/agora_rest'

/**
 * GLUE (threads): `HttpAgent.connect` is not implemented, so a CopilotChat opened on an existing
 * `threadId` shows nothing. Load the thread over the REST route and replay it as a snapshot.
 */
class AgoraHttpAgent extends HttpAgent {
  protected connect(input: Parameters<HttpAgent['run']>[0]): Observable<any> {
    const { threadId, runId } = input
    return new Observable((subscriber) => {
      threadMessages(threadId).then((messages) => {
        subscriber.next({ type: 'RUN_STARTED', threadId, runId })
        subscriber.next({ type: 'MESSAGES_SNAPSHOT', messages })
        subscriber.next({ type: 'RUN_FINISHED', threadId, runId })
        subscriber.complete()
      }, (error) => subscriber.error(error))
    })
  }
}

function CopilotKitPage() {
  const [threadId, setThreadId] = useState(() => new URLSearchParams(location.search).get('thread') ?? crypto.randomUUID())
  // `fetch` override: the session cookie rides by default; the CSRF header has to be added.
  const agent = useMemo(() => new AgoraHttpAgent({ url: '/agent/ag-ui', fetch: csrfFetch }), [])
  const open = (id: string) => {
    history.replaceState(null, '', `?thread=${id}`)
    setThreadId(id)
  }
  useEffect(() => history.replaceState(null, '', `?thread=${threadId}`), [threadId])

  return (
    <Shell current="/copilotkit" subtitle="CopilotKit 1.77 (v2 API) → POST /agent/ag-ui">
      <CopilotKitProvider agents__unsafe_dev_only={{ default: agent }} enableInspector={false}>
        <Threads current={threadId} onOpen={open} />
        <Renderers />
        <div className="copilot-chat" style={{ flex: 1, minWidth: 0 }}>
          <CopilotChat threadId={threadId} attachments={{ enabled: true, accept: 'image/*,application/pdf,text/plain' }} />
        </div>
      </CopilotKitProvider>
    </Shell>
  )
}

/** GLUE (threads): CopilotKit's own thread list needs its hosted Intelligence platform. */
function Threads(props: { current: string; onOpen: (id: string) => void }) {
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const { agent } = useAgent()
  useEffect(() => {
    void listThreads().then(setThreads)
    const sub = agent.subscribe({ onRunFinalized: () => void listThreads().then(setThreads) })
    return () => sub.unsubscribe()
  }, [agent])
  return (
    <nav className="threads" aria-label="Threads">
      <button type="button" className="new" onClick={() => props.onOpen(crypto.randomUUID())}>+ New chat</button>
      {threads.map((thread) => (
        <button key={thread.id} type="button" aria-current={thread.id === props.current} onClick={() => props.onOpen(thread.id)}>
          {thread.title || 'New chat'}
        </button>
      ))}
    </nav>
  )
}

function Renderers() {
  const { agent } = useAgent()
  const { copilotkit } = useCopilotKit()

  // Generative UI the CopilotKit way: render the tool CALL from its result.
  useRenderTool({
    name: 'list_orders',
    parameters: z.object({}),
    render: ({ result }) =>
      result ? <OrderList orders={(JSON.parse(String(result)) as { orders: OrderRow[] }).orders} /> : <p>Looking up orders…</p>,
  })
  useDefaultRenderTool() // every other tool call: CopilotKit's built-in card

  // Approvals and questions: the server ends the run with an AG-UI interrupt; `resolve` resumes it.
  useInterrupt({
    render: ({ interrupt, resolve, cancel }) => {
      if (!interrupt) return <></>
      if (interrupt.reason === 'tool_approval') {
        return (
          <div className="card" data-testid="approval">
            <strong>{interrupt.message ?? 'Approve?'}</strong>
            <p>{JSON.stringify(interrupt.metadata?.['agora.input'])}</p>
            <button type="button" className="primary" onClick={() => resolve({ approved: true }, interrupt.id)}>Approve</button>
            <button type="button" onClick={() => resolve({ approved: false }, interrupt.id)}>Reject</button>
          </div>
        )
      }
      // `input_required`: the question set. The options are in the interrupt's JSON Schema.
      const schema = interrupt.responseSchema as any
      const questions = Object.entries<any>(schema?.properties?.answers?.properties ?? {})
      return (
        <div className="card" data-testid="elicitation">
          {questions.map(([id, question]) => (
            <div key={id}>
              <strong>{question.title}</strong>
              <div>
                {(question.items?.enum ?? []).map((value: string) => (
                  <button key={value} type="button" className="option" onClick={() => resolve({ answers: { [id]: [value] } }, interrupt.id)}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={() => cancel(interrupt.id)}>Skip</button>
        </div>
      )
    },
  })

  // GLUE (cancel): Stop only aborts the fetch. Remember the server's run id (the `agora.run`
  // custom event) and cancel it through the native route when the run is aborted.
  useEffect(() => {
    let runId: string | null = null
    const sub = agent.subscribe({
      onCustomEvent: ({ event }) => {
        if (event.name === 'agora.run') runId = (event.value as { runId: string }).runId
      },
      onRunFailed: () => void (runId && cancelRun(runId)),
      onRunFinalized: () => void (runId = null),
    })
    const abort = agent.abortRun.bind(agent)
    agent.abortRun = () => {
      if (runId) void cancelRun(runId)
      abort()
    }
    return () => {
      sub.unsubscribe()
      agent.abortRun = abort
    }
  }, [agent])

  // The shell's scenario buttons.
  useEffect(
    () =>
      onScenario((prompt) => {
        agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: prompt })
        void copilotkit.runAgent({ agent })
      }),
    [agent, copilotkit]
  )
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopilotKitPage />
  </StrictMode>
)
