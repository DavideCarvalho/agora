import { StrictMode, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
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
import { AgentActions, Chart, OrderList, registry, type OrderRow } from '../shared/renderers'
import { onScenario } from '../shared/scenarios'
import { csrfFetch } from '../shared/csrf'
import { listThreads, threadMessages, type ThreadSummary } from '../shared/agora_rest'

/**
 * GLUE (persistence, 13 lines): `HttpAgent.connect` is not implemented, so a CopilotChat opened on
 * an existing `threadId` shows nothing. Load the thread over the REST route and replay it.
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
  const [threadId, setThreadId] = useState(
    () => new URLSearchParams(location.search).get('thread') ?? crypto.randomUUID()
  )
  // `fetch` override: the session cookie rides by default; shield's CSRF header has to be added.
  const agent = useMemo(() => new AgoraHttpAgent({ url: '/agent/ag-ui', fetch: csrfFetch }), [])
  useEffect(() => history.replaceState(null, '', `?thread=${threadId}`), [threadId])

  return (
    <Shell current="/copilotkit" subtitle="CopilotKit 1.77 (v2 API) → POST /agent/ag-ui">
      <CopilotKitProvider agents__unsafe_dev_only={{ default: agent }} enableInspector={false}>
        <Threads current={threadId} onOpen={setThreadId} />
        <Renderers />
        <ActionsBridge>
          <div className="copilot-chat" style={{ flex: 1, minWidth: 0 }}>
            <CopilotChat threadId={threadId} />
          </div>
        </ActionsBridge>
      </CopilotKitProvider>
    </Shell>
  )
}

/** GLUE (thread list): CopilotKit's own thread list needs its hosted Intelligence platform. */
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
      <button type="button" className="new" onClick={() => props.onOpen(crypto.randomUUID())}>
        + New chat
      </button>
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          aria-current={thread.id === props.current}
          onClick={() => props.onOpen(thread.id)}
        >
          {thread.title || 'New chat'}
        </button>
      ))}
    </nav>
  )
}

/** A component's buttons send the next user turn: CopilotKit's agent API, wrapped for the renderers. */
function ActionsBridge({ children }: { children: ReactNode }) {
  const { agent } = useAgent()
  const { copilotkit } = useCopilotKit()
  const send = (text: string) => {
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    void copilotkit.runAgent({ agent })
  }
  useEffect(() => onScenario(send), [agent, copilotkit])
  return <AgentActions.Provider value={{ send }}>{children}</AgentActions.Provider>
}

/**
 * GLUE (progressive render, 16 lines): the server's `agora.ui` custom events carry every push of a
 * component, keyed by the tool call that made it. CopilotKit ignores them: keep the latest per call
 * in a store, and read it from inside the tool renderer.
 */
const pushes = new Map<string, { component: string; props: any }>()
const subscribers = new Set<() => void>()
function useLivePush(toolCallId: string) {
  return useSyncExternalStore(
    (notify) => (subscribers.add(notify), () => void subscribers.delete(notify)),
    () => pushes.get(toolCallId)
  )
}
function usePushCollector() {
  const { agent } = useAgent()
  useEffect(() => {
    const sub = agent.subscribe({
      onCustomEvent: ({ event }) => {
        const push = event.value as { toolCallId?: string; component: string; props: unknown }
        if (event.name !== 'agora.ui' || !push.toolCallId) return
        pushes.set(push.toolCallId, push)
        subscribers.forEach((notify) => notify())
      },
    })
    return () => sub.unsubscribe()
  }, [agent])
}

function RevenueChart({ toolCallId, result }: { toolCallId: string; result: unknown }) {
  const live = useLivePush(toolCallId)
  if (live) return <Chart {...live.props} />
  if (!result) return <p>Loading revenue…</p>
  const { months } = parse(result) as { months: Array<{ month: string; revenue: number }> }
  return <Chart type="line" title="Revenue by month" xKey="month" series={[{ key: 'revenue' }]} data={months} />
}

/**
 * GLUE (composed layouts, 9 lines): `ui__render`'s input is the library's `{ type, props, children }`
 * tree. CopilotKit renders a tool call, not a tree, so walk it with the same renderers. No client
 * validation here — the server already validated it (an invalid tree is a failed call).
 */
function Tree({ node }: { node: any }): ReactNode {
  const Component = (registry as Record<string, (props: any) => ReactNode>)[node?.type]
  if (!Component) return null
  return (
    <Component {...node.props}>
      {(node.children ?? []).map((child: any, i: number) => <Tree key={i} node={child} />)}
    </Component>
  )
}

const parse = (result: unknown) => (typeof result === 'string' ? JSON.parse(result) : result)

function Renderers() {
  usePushCollector()

  // Generative UI the CopilotKit way: render a tool CALL — from its arguments while it runs, from
  // its result once it lands (which is also what a reloaded thread has).
  useRenderTool({
    name: 'list_orders',
    parameters: z.object({}),
    render: ({ result }) =>
      result ? <OrderList orders={(parse(result) as { orders: OrderRow[] }).orders} /> : <p>Looking up orders…</p>,
  })
  useRenderTool({
    name: 'revenue_by_month',
    parameters: z.object({}),
    render: ({ toolCallId, result }) => <RevenueChart toolCallId={toolCallId} result={result} />,
  })
  useRenderTool({
    name: 'ui__render',
    parameters: z.any(),
    render: ({ parameters, result, status }) => {
      if (status === 'complete' && typeof result === 'string' && /error|invalid/i.test(result) && !result.startsWith('{"ok'))
        return <p className="error">ui__render refused: {result.slice(0, 160)}</p>
      return <Tree node={parameters} />
    },
  })
  useDefaultRenderTool() // every other tool call: CopilotKit's built-in card

  // The refund approval: the server ends the run with an AG-UI interrupt; `resolve` resumes it.
  useInterrupt({
    render: ({ interrupt, resolve }) =>
      interrupt ? (
        <div className="card" data-testid="approval">
          <strong>{interrupt.message ?? 'Approve?'}</strong>
          <p>
            <button type="button" className="primary" onClick={() => resolve({ approved: true }, interrupt.id)}>
              Approve
            </button>
            <button type="button" onClick={() => resolve({ approved: false }, interrupt.id)}>
              Reject
            </button>
          </p>
        </div>
      ) : (
        <></>
      ),
  })
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CopilotKitPage />
  </StrictMode>
)
