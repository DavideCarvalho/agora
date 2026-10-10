import { StrictMode, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Shell } from '../shared/shell.js'
import { onScenario } from '../shared/scenarios.js'
import { csrfFetch } from '../shared/csrf.js'

/**
 * The same agent, the same prompts, on (simulated) WhatsApp. The server runs the real channel
 * handler (`channels.handle`) over an adapter that records what it would send — so what you see is
 * what `genui({ channels: { whatsapp } })` produces: text, reply buttons, list messages and chart
 * images, never a tree or a sandbox. Pressing a button sends its id back, like WhatsApp does.
 */
interface SimMessage {
  id: string
  at: number
  direction: 'in' | 'out'
  text: string
  buttons?: { id: string; label: string }[]
  list?: { button: string; title?: string; rows: { id: string; title: string; description?: string }[] }
  image?: string
}

const conversation = 'demo'

/** WhatsApp's markdown: *bold*, _italic_, ~strike~, ```code```. */
function whatsappText(text: string): ReactNode[] {
  return text.split(/(```[\s\S]*?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/).map((part, i) => {
    if (part.startsWith('```')) return <pre key={i}>{part.slice(3, -3)}</pre>
    if (/^\*[^*]+\*$/.test(part)) return <strong key={i}>{part.slice(1, -1)}</strong>
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>
    if (/^~[^~]+~$/.test(part)) return <s key={i}>{part.slice(1, -1)}</s>
    return part
  })
}

function Bubble(props: { message: SimMessage; onPress: (id: string, label: string) => void }) {
  const { message } = props
  const [open, setOpen] = useState(false)
  return (
    <div className="wa-bubble" data-direction={message.direction} data-testid="wa-message">
      {message.image ? <img src={message.image} alt="" data-testid="wa-image" /> : null}
      {message.text ? <div className="wa-text">{whatsappText(message.text)}</div> : null}
      {message.buttons?.map((button) => (
        <button key={button.id} type="button" className="wa-button" data-testid="wa-button" onClick={() => props.onPress(button.id, button.label)}>
          {button.label}
        </button>
      ))}
      {message.list ? (
        <>
          <button type="button" className="wa-button" data-testid="wa-list-open" onClick={() => setOpen((value) => !value)}>
            ☰ {message.list.button}
          </button>
          {open ? (
            <div className="wa-list" role="listbox">
              {message.list.title ? <div className="wa-list-title">{message.list.title}</div> : null}
              {message.list.rows.map((row) => (
                <button key={row.id} type="button" data-testid="wa-list-row" onClick={() => props.onPress(row.id, row.title)}>
                  <strong>{row.title}</strong>
                  {row.description ? <span>{row.description}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function WhatsApp() {
  const [messages, setMessages] = useState<SimMessage[]>([])
  const [draft, setDraft] = useState('')
  const [waiting, setWaiting] = useState(false)
  const since = useRef(0)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/sim/whatsapp/messages?conversation=${conversation}&since=${since.current}`)
      const fresh = (await response.json()) as SimMessage[]
      if (fresh.length === 0) return
      since.current = fresh[fresh.length - 1]!.at
      setMessages((list) => [...list, ...fresh])
      if (fresh.some((message) => message.direction === 'out')) setWaiting(false)
    }, 400)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [messages])

  const send = useCallback(async (body: { text: string; buttonId?: string; label?: string }) => {
    setWaiting(true)
    await csrfFetch('/sim/whatsapp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversation, ...body }),
    })
  }, [])

  useEffect(() => onScenario((prompt) => void send({ text: prompt })), [send])

  const reset = async () => {
    await csrfFetch(`/sim/whatsapp/reset?conversation=${conversation}`, { method: 'POST' })
    since.current = 0
    setMessages([])
  }

  return (
    <Shell
      current="/whatsapp"
      subtitle="The same prompts on WhatsApp: genui({ channels: { whatsapp } })"
      notes={
        <>
          <p>
            Per-component tools only, each component drawn as WhatsApp messages: the orders as a list to pick
            one from, charts as PNG images (<code>chartImages()</code>), the rest as text. No trees, no sandbox.
          </p>
          <button type="button" data-testid="wa-reset" onClick={reset}>
            New conversation
          </button>
        </>
      }
    >
      <div className="wa-phone">
        <div className="wa-header">Orders assistant · WhatsApp</div>
        <div className="wa-messages" ref={scroller}>
          {messages.map((message) => (
            <Bubble key={message.id} message={message} onPress={(buttonId, label) => void send({ text: label, label, buttonId })} />
          ))}
          {waiting ? <div className="wa-typing" data-testid="wa-typing">typing…</div> : null}
        </div>
        <form
          className="wa-composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim() === '') return
            void send({ text: draft })
            setDraft('')
          }}
        >
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Message" />
          <button type="submit">Send</button>
        </form>
      </div>
    </Shell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WhatsApp />
  </StrictMode>
)
