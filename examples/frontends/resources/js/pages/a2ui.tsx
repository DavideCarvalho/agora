import { StrictMode, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import {
  A2uiSurface,
  basicCatalog,
  createBinderlessComponentImplementation,
  MarkdownContext,
  type ReactComponentImplementation,
} from '@a2ui/react/v0_9'
import { renderMarkdown } from '@a2ui/markdown-it'
import { Catalog, MessageProcessor, type ActionPayload, type ComponentContext } from '@a2ui/web_core/v0_9'
import { GenuiActionProvider, GenuiNodeScope, SandboxView, type UiAction } from '@adonis-agora/agent/react/genui'
import type { SandboxProps } from '@adonis-agora/agent/genui'
import { z } from 'zod'
import { A2UI_CATALOG_ID, catalog } from '#genui/catalog'
import { Shell } from '../shared/shell.js'
import { onScenario } from '../shared/scenarios.js'
import { csrfFetch } from '../shared/csrf.js'

/**
 * A2UI (https://a2ui.org, v0.9) with Google's official React renderer (`@a2ui/react`) and message
 * processor (`@a2ui/web_core`), over `POST /agent/a2ui` (`a2uiAdapter()` in config/agent.ts). The
 * server sends JSON Lines of A2UI messages; every surface they create is drawn in order; an action a
 * surface raises (a Refund button, Approve / Reject, the sandbox's `agent.send`) is posted back and
 * becomes the next turn. No chat framework: the page keeps the thread id and the user's lines.
 */

/**
 * The app's A2UI catalog: every basic component, plus `Sandbox` — the library's sandbox renderer
 * inside an A2UI custom component. `incomplete` (the server sets it while the model writes) drives
 * its placeholder → preview → live states; its `agent.send` is dispatched as an A2UI action.
 */
function useProperties(context: ComponentContext): Record<string, any> {
  const model = context.componentModel
  return useSyncExternalStore(
    (notify) => {
      const sub = model.onUpdated.subscribe(notify)
      return () => sub.unsubscribe()
    },
    () => model.properties
  )
}

const Sandbox = createBinderlessComponentImplementation(
  // Props are free-form (the agent validated them against its own catalog). `@a2ui/web_core` types
  // its schemas with zod 3; this app's zod 4 object is enough for a binderless component.
  { name: 'Sandbox', schema: z.looseObject({}) as never },
  ({ context }) => {
    const { incomplete, component: _c, id: _i, ...props } = useProperties(context)
    const node = { id: context.componentModel.id, type: 'Sandbox', incomplete: incomplete === true, held: false, streamSafe: incomplete === true }
    // What the user said rides in the context, as `text` (A2UI actions have no field for it).
    const dispatch = (action: UiAction) =>
      void context.dispatchAction({ event: { name: action.name, context: { ...action.context, ...(action.text ? { text: action.text } : {}) } } })
    return (
      <GenuiNodeScope node={node}>
        <GenuiActionProvider onAction={dispatch}>
          <SandboxView {...(props as SandboxProps)} />
        </GenuiActionProvider>
      </GenuiNodeScope>
    )
  }
)

const appCatalog = new Catalog<ReactComponentImplementation>(
  A2UI_CATALOG_ID,
  'v0.9',
  [...basicCatalog.components.values(), Sandbox],
  [...basicCatalog.functions.values()]
)

// Everything the agent's catalog has: tools push their skeletons (OrderList) to a client that declares them.
const uiCapabilities = { components: catalog.components.map((c) => ({ name: c.name, version: c.version ?? 1 })) }

type Entry = { kind: 'user'; key: string; text: string } | { kind: 'surface'; key: string }

function A2uiChat() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const threadId = useRef<string | undefined>(undefined)
  const post = useRef<(body: Record<string, unknown>, said: string) => Promise<void>>(async () => {})

  // One processor per page: surfaces live in it, `A2uiSurface` draws them; actions come back here.
  const processor = useMemo(
    () =>
      new MessageProcessor<ReactComponentImplementation>([appCatalog, basicCatalog], (action: ActionPayload) => {
        const { text: said, ...context } = action.context as Record<string, unknown>
        const label = typeof said === 'string' ? said : describe(action.name, context)
        void post.current({ action: { version: 'v0.9', action: { ...action, context, ...(typeof said === 'string' ? { text: said } : {}) } } }, label)
      }),
    []
  )
  useEffect(() => {
    const created = processor.onSurfaceCreated((surface) =>
      setEntries((list) => [...list, { kind: 'surface', key: surface.id }])
    )
    const deleted = processor.onSurfaceDeleted((id) =>
      setEntries((list) => list.filter((entry) => !(entry.kind === 'surface' && entry.key === id)))
    )
    return () => {
      created.unsubscribe()
      deleted.unsubscribe()
    }
  }, [processor])

  // POST, then read the JSON Lines as they arrive and hand each message to the processor.
  post.current = async (body, said) => {
    setEntries((list) => [...list, { kind: 'user', key: crypto.randomUUID(), text: said }])
    setBusy(true)
    setError(null)
    try {
      const response = await csrfFetch('/agent/a2ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/jsonl' },
        body: JSON.stringify({ threadId: threadId.current, uiCapabilities, ...body }),
      })
      if (!response.ok || !response.body) throw new Error(`POST /agent/a2ui: ${response.status} ${await response.text()}`)
      threadId.current = response.headers.get('X-Agent-Thread-Id') ?? threadId.current
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += value
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) if (line.trim()) processor.processMessages(JSON.parse(line))
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }
  const send = (message: string) => void post.current({ message }, message)
  useEffect(() => onScenario(send), [])

  return (
    <section className="conversation a2ui" data-testid="a2ui">
      <div className="messages" data-testid="messages">
        {entries.map((entry) =>
          entry.kind === 'user' ? (
            <article key={entry.key} className="msg" data-role="user"><p>{entry.text}</p></article>
          ) : (
            <Surface key={entry.key} processor={processor} id={entry.key} />
          )
        )}
        {busy ? <p className="a2ui-busy" aria-live="polite">…</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim()) return
          send(text)
          setText('')
        }}
      >
        <input type="text" placeholder="Message the assistant" value={text} onChange={(event) => setText(event.target.value)} />
        <button type="submit" className="primary" disabled={!text.trim() || busy}>Send</button>
      </form>
    </section>
  )
}

function Surface({ processor, id }: { processor: MessageProcessor<ReactComponentImplementation>; id: string }) {
  const surface = processor.getSurface(id)
  if (!surface) return null
  return (
    <article className="msg a2ui-surface" data-role="assistant" data-surface={id}>
      <A2uiSurface surface={surface} />
    </article>
  )
}

/** The user's line for an action that names no sentence: `refund` + `{ orderId }` → "refund · orderId 1002". */
function describe(name: string, context: Record<string, unknown>): string {
  if (name === 'agora.approve') return 'Approved.'
  if (name === 'agora.reject') return 'Rejected.'
  const values = Object.entries(context).filter(([key]) => key !== 'interruptId')
  return [name, ...values.map(([key, value]) => `${key} ${String(value)}`)].join(' · ')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell current="/a2ui" subtitle="A2UI v0.9 — @a2ui/react (official renderer) → POST /agent/a2ui">
      {/* A2UI's `Text` is markdown; the renderer takes the markdown engine from this context. */}
      <MarkdownContext.Provider value={renderMarkdown}>
        <A2uiChat />
      </MarkdownContext.Provider>
    </Shell>
  </StrictMode>
)
