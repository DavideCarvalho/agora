import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AgentProvider,
  useAgentChat,
  useThreads,
  type TranscriptBlock,
  type TranscriptToolCall,
} from '@adonis-agora/agent/react'
import { GenerativeUI } from '@adonis-agora/agent/react/genui'
import { catalog } from '#genui/catalog'
import { Shell } from '../shared/shell'
import { AgentActions, registry } from '../shared/renderers'
import { onScenario } from '../shared/scenarios'

// What this page can draw: the server sends anything else as its text instead.
const uiCapabilities = {
  components: Object.keys(registry).map((name) => ({ name, version: 1 })),
}

function NativePage() {
  return (
    <Shell current="/native" subtitle="@adonis-agora/agent/react over the native stream">
      {/* Session cookie + shield CSRF header on every request: nothing to configure. */}
      <AgentProvider genui={{ registry, catalog }} uiCapabilities={uiCapabilities}>
        <Native />
      </AgentProvider>
    </Shell>
  )
}

function Native() {
  // `opened` is the thread the chat was mounted with; `current` follows a thread the chat created.
  const [opened, setOpened] = useState(() => ({
    threadId: new URLSearchParams(location.search).get('thread') ?? undefined,
    mount: 0,
  }))
  const [current, setCurrent] = useState(opened.threadId)
  const { threads } = useThreads()
  const open = (id: string | undefined) => {
    history.replaceState(null, '', id ? `?thread=${id}` : location.pathname)
    setOpened((previous) => ({ threadId: id, mount: previous.mount + 1 }))
    setCurrent(id)
  }
  return (
    <div className="native">
      <nav className="threads" aria-label="Threads">
        <button type="button" className="new" onClick={() => open(undefined)}>
          + New chat
        </button>
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            aria-current={thread.id === current}
            onClick={() => open(thread.id)}
          >
            {thread.title || 'New chat'}
          </button>
        ))}
      </nav>
      <Chat
        key={opened.mount}
        threadId={opened.threadId}
        onThreadCreated={(id) => {
          history.replaceState(null, '', `?thread=${id}`)
          setCurrent(id)
        }}
      />
    </div>
  )
}

function Chat(props: { threadId?: string; onThreadCreated: (id: string) => void }) {
  // `proposals: false`: this app uses blocking approvals, where the proposal routes answer 501.
  const chat = useAgentChat({
    threadId: props.threadId,
    onThreadCreated: props.onThreadCreated,
    proposals: false,
  })
  const { transcript, composer } = chat
  const send = (text: string) => void chat.sendMessage({ text })

  useEffect(() => onScenario(send), [chat.sendMessage])

  return (
    // A component's buttons reach the chat through this context (see OrderList's Refund).
    <AgentActions.Provider value={{ send }}>
      <section className="conversation">
        <div className="messages" data-testid="messages">
          {chat.isLoadingHistory ? <p>Loading…</p> : null}
          {transcript.items.map((item) => (
            <article key={item.id} className="msg" data-role={item.role}>
              {item.blocks.map((block) => (
                <Block key={block.key} block={block} />
              ))}
            </article>
          ))}
          {chat.error ? <p className="error">{chat.error.message}</p> : null}
        </div>
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault()
            void composer.submit()
          }}
        >
          <input
            type="text"
            placeholder="Message the assistant"
            value={composer.text}
            onChange={(event) => composer.setText(event.target.value)}
          />
          <button type="submit" className="primary" disabled={!composer.canSend}>
            Send
          </button>
        </form>
      </section>
    </AgentActions.Provider>
  )
}

function Block({ block }: { block: TranscriptBlock }) {
  switch (block.kind) {
    case 'text':
      return <p>{block.text}</p>
    case 'reasoning':
      return <details data-testid="reasoning"><summary>Reasoning</summary>{block.text}</details>
    case 'ui':
      // The registry renderer, validated against the catalog; its fallbackText if it can't draw.
      return <GenerativeUI part={block} />
    case 'tools':
      return block.calls.map((call) => <ToolCall key={call.toolCallId} call={call} />)
    default:
      return null
  }
}

function ToolCall({ call }: { call: TranscriptToolCall }) {
  if (call.isAwaitingApproval) {
    return (
      <div className="card" data-testid="approval">
        <strong>{call.description.confirm?.title ?? call.name}</strong>
        <p>
          <button type="button" className="primary" onClick={() => call.approve.run()}>
            {call.description.confirm?.verb ?? 'Approve'}
          </button>
          <button type="button" onClick={() => call.reject.run()}>
            Reject
          </button>
        </p>
      </div>
    )
  }
  const failed = call.part.state === 'output-error'
  return (
    <div className="tool" data-testid="tool-call">
      {call.name} — {failed ? `failed: ${call.part.errorText}` : (call.approval?.status ?? call.part.state)}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NativePage />
  </StrictMode>
)
