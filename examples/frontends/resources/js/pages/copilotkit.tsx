import { Component, StrictMode, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  a2uiDefaultTheme,
  CopilotChat,
  CopilotKitProvider,
  createA2UIMessageRenderer,
  HttpAgent,
  useAgent,
  useCopilotKit,
  useDefaultRenderTool,
  useInterrupt,
  useRenderTool,
  UseAgentUpdate,
} from '@copilotkit/react-core/v2'
import '@copilotkit/react-core/v2/styles.css'
import { Observable } from 'rxjs'
import { z } from 'zod'
import { GenuiActionProvider, GenuiNodeScope, uiActionSummary, type UiAction } from '@adonis-agora/agent/react/genui'
import { normalizeTreeInput } from '@adonis-agora/agent/genui'
import { catalog } from '#genui/catalog'
import { Shell } from '../shared/shell.js'
import { AgentActions, Chart, OrderList, registry, type OrderRow } from '../shared/renderers.js'
import { onScenario } from '../shared/scenarios.js'
import { csrfFetch } from '../shared/csrf.js'
import { listThreads, markNewThread, threadMessages, threadStored, type ThreadSummary } from '../shared/agora_rest.js'

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

/**
 * Two ways to draw the agent's UI here. Default: this page's glue draws the `ui__render` tree (and
 * the tools' pushes) with the shared React renderers. `?renderer=a2ui`: CopilotKit's own A2UI
 * renderer draws the `a2ui-surface` activities the server adds (`agUiAdapter({ a2ui })`), on A2UI's
 * basic catalog — no renderer of ours at all.
 */
const a2uiMode = new URLSearchParams(location.search).get('renderer') === 'a2ui'
const activityRenderers = a2uiMode ? [createA2UIMessageRenderer({ theme: a2uiDefaultTheme })] : []

function CopilotKitPage() {
  const [threadId, setThreadId] = useState(
    () => new URLSearchParams(location.search).get('thread') ?? markNewThread(crypto.randomUUID())
  )
  // `fetch` override: the session cookie rides by default; shield's CSRF header has to be added.
  const agent = useMemo(() => new AgoraHttpAgent({ url: '/agent/ag-ui', fetch: csrfFetch }), [])
  useEffect(() => history.replaceState(null, '', `?${a2uiMode ? 'renderer=a2ui&' : ''}thread=${threadId}`), [threadId])

  return (
    <Shell
      current="/copilotkit"
      subtitle={
        <>
          CopilotKit 1.77 (v2 API) → POST /agent/ag-ui ·{' '}
          {a2uiMode ? <a href="/copilotkit">draw with our renderers</a> : <a href="/copilotkit?renderer=a2ui">draw with CopilotKit’s A2UI renderer</a>}
        </>
      }
    >
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        enableInspector={false}
        renderActivityMessages={activityRenderers}
      >
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
    const sub = agent.subscribe({
      onRunFinalized: () => {
        threadStored(props.current)
        void listThreads().then(setThreads)
      },
    })
    return () => sub.unsubscribe()
  }, [agent, props.current])
  return (
    <nav className="threads" aria-label="Threads">
      <button type="button" className="new" onClick={() => props.onOpen(markNewThread(crypto.randomUUID()))}>
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

/**
 * A component's buttons send the next user turn: CopilotKit's agent API, wrapped for the renderers.
 * GLUE (sandbox actions, 4 lines): a sandbox's `agent.send(...)` goes out the same way, its values as
 * `forwardedProps.uiAction` — the server makes the turn from them (`uiActionText`), the chat shows
 * one line: what the user said and a few values (`uiActionSummary`).
 */
function ActionsBridge({ children }: { children: ReactNode }) {
  const { agent } = useAgent()
  const { copilotkit } = useCopilotKit()
  // A component can be clicked while the turn that drew it is still running (the model is still
  // writing its answer): the server refuses a second turn on a busy thread (409 run_active), so
  // wait for this one to end first.
  // (Polled: a subscriber added mid-run is not told when that run ends.)
  const idle = async () => {
    while (agent.isRunning) await new Promise((resolve) => setTimeout(resolve, 200))
  }
  const send = async (text: string) => {
    await idle()
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text })
    void copilotkit.runAgent({ agent })
  }
  const sendUiAction = async (action: UiAction) => {
    await idle()
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: uiActionSummary(action) })
    void copilotkit.runAgent({ agent, forwardedProps: { uiAction: action } })
  }
  useEffect(() => onScenario((text) => void send(text)), [agent, copilotkit])
  return (
    <AgentActions.Provider value={{ send: (text) => void send(text) }}>
      <GenuiActionProvider onAction={(action) => void sendUiAction(action)}>{children}</GenuiActionProvider>
    </AgentActions.Provider>
  )
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
 * GLUE (composed layouts, 25 lines): `ui__render`'s input is the library's `{ type, props, children }`
 * tree. CopilotKit renders a tool call, not a tree, so walk it with the same renderers. While the
 * model is still writing it, CopilotKit passes the partially parsed arguments: a half-written node
 * can throw, so each node gets an error boundary (reset when the node changes — never remounted, so
 * a sandbox's frame survives the stream), and `GenuiNodeScope` tells the renderers the call is still
 * streaming (skeletons; a sandbox shows its preview and runs no code until the call is complete).
 * No client-side validation here — the server validates the finished tree (an invalid one is a
 * failed call).
 */
class NodeBoundary extends Component<{ reset: string; children: ReactNode }, { failed: boolean; reset: string }> {
  state = { failed: false, reset: this.props.reset }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  static getDerivedStateFromProps(props: { reset: string }, state: { reset: string }) {
    return props.reset === state.reset ? null : { failed: false, reset: props.reset }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
function Tree({ node, id = 'root', incomplete }: { node: any; id?: string; incomplete: boolean }): ReactNode {
  const Render = (registry as Record<string, (props: any) => ReactNode>)[node?.type]
  if (!Render) return null
  return (
    <NodeBoundary reset={JSON.stringify(node)}>
      <GenuiNodeScope node={{ id, type: node.type, incomplete, held: false }}>
        <Render {...node.props}>
          {(node.children ?? []).map((child: any, i: number) => <Tree key={i} id={`${id}.${i}`} node={child} incomplete={incomplete} />)}
        </Render>
      </GenuiNodeScope>
    </NodeBoundary>
  )
}

const parse = (result: unknown) => (typeof result === 'string' ? JSON.parse(result) : result)

const refused = (status: string, result: unknown) =>
  status === 'complete' && typeof result === 'string' && /error|invalid/i.test(result) && !result.startsWith('{"ok')

/**
 * GLUE (retried calls, 12 lines): a call the server refused, which the model then retried with the
 * same tool, draws nothing — the person sees the view the retry drew, not the refusal before it.
 * (`@adonis-agora/agent/react`'s transcript does this itself: `retriedCallIds`.)
 */
function Refused({ toolCallId, name, result }: { toolCallId: string; name: string; result: string }) {
  const { agent } = useAgent({ updates: [UseAgentUpdate.OnMessagesChanged] })
  const calls = agent.messages.flatMap((message) =>
    message.role === 'assistant' ? (message.toolCalls ?? []) : []
  )
  const next = calls[calls.findIndex((call) => call.id === toolCallId) + 1]
  if (next?.function.name === name) return null
  return <p className="error">{name} refused: {result.slice(0, 160)}</p>
}

function Renderers() {
  usePushCollector()

  // Generative UI the CopilotKit way: render a tool CALL — from its arguments while it runs, from
  // its result once it lands (which is also what a reloaded thread has).
  // With CopilotKit's A2UI renderer, the UI arrives as `a2ui-surface` activities instead.
  // `show: false`: the model only wanted the data (for a dashboard it composes) — draw nothing.
  const shows = z.object({ show: z.boolean().optional() })
  useRenderTool({
    name: 'list_orders',
    parameters: shows,
    render: ({ parameters, result }) =>
      a2uiMode || parameters?.show === false ? <></> : result ? <OrderList orders={(parse(result) as { orders: OrderRow[] }).orders} /> : <p>Looking up orders…</p>,
  })
  useRenderTool({
    name: 'revenue_by_month',
    parameters: shows,
    render: ({ toolCallId, parameters, result }) =>
      a2uiMode || parameters?.show === false ? <></> : <RevenueChart toolCallId={toolCallId} result={result} />,
  })
  // The arguments are read the way the server reads them (`normalizeTreeInput`: a stringified tree,
  // a dropped `{ type, props }` envelope), so what it accepted is what is drawn.
  useRenderTool({
    name: 'ui__render',
    parameters: z.any(),
    render: ({ toolCallId, parameters, result, status }) =>
      refused(status, result) ? (
        <Refused toolCallId={toolCallId} name="ui__render" result={result as string} />
      ) : a2uiMode ? (
        <></>
      ) : (
        <Tree node={normalizeTreeInput(catalog, parameters)} incomplete={status !== 'complete'} />
      ),
  })
  // `ui__sandbox` (`componentTools: ['Sandbox']`): its arguments ARE the sandbox's props.
  useRenderTool({
    name: 'ui__sandbox',
    parameters: z.any(),
    render: ({ toolCallId, parameters, result, status }) =>
      refused(status, result) ? (
        <Refused toolCallId={toolCallId} name="ui__sandbox" result={result as string} />
      ) : a2uiMode ? (
        <></>
      ) : (
        <Tree node={{ type: 'Sandbox', props: parameters ?? {} }} incomplete={status !== 'complete'} />
      ),
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
