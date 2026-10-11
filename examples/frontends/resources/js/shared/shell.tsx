import { type ReactNode, useEffect, useState } from 'react'
import { csrfFetch } from './csrf.js'
import { scenarios, sendScenario } from './scenarios.js'

const pages = [
  { href: '/', label: 'Matrix' },
  { href: '/native', label: 'Native' },
  { href: '/copilotkit', label: 'CopilotKit' },
  { href: '/openui', label: 'OpenUI' },
  { href: '/a2ui', label: 'A2UI' },
  { href: '/whatsapp', label: 'WhatsApp' },
]

/** Light / dark: the `data-theme` attribute on <html> — what the sandbox's theme follows. */
function ThemeToggle() {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    localStorage.setItem('demo-theme', next)
  }
  return (
    <button type="button" className="theme-toggle" data-testid="theme-toggle" onClick={toggle}>
      Light / dark
    </button>
  )
}

const KIT_LABELS: Record<string, string> = {
  shadcn: 'shadcn + Tailwind',
  bootstrap: 'Bootstrap (CSS only)',
  mui: 'MUI (theme + wrapper)',
}

/** Make `kit` this visitor's sandbox kit (a cookie; every kit is built already), then reload with `?kit=`. */
async function switchKit(kit: string) {
  await csrfFetch('/demo/kit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kit }),
  })
  const url = new URL(window.location.href)
  url.searchParams.set('kit', kit)
  window.location.replace(url.toString())
}

/**
 * Which design system the sandbox draws with (scenario 9): `?kit=shadcn|bootstrap|mui` on any page,
 * or this switcher. Per visitor: it changes your kit only, then reloads the page.
 */
function KitSwitch() {
  const [state, setState] = useState<{ kit: string; kits: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void fetch('/demo/kit')
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { kit: string; kits: string[] } | null) => {
        if (body === null) return
        const wanted = new URL(window.location.href).searchParams.get('kit')
        if (wanted !== null && wanted !== body.kit && body.kits.includes(wanted)) {
          setBusy(true)
          void switchKit(wanted)
          return
        }
        setState(body)
        document.documentElement.dataset.kit = body.kit
      })
  }, [])
  if (busy) return <span className="kit-switch" data-testid="kit-switching">Switching the kit…</span>
  if (state === null) return null
  return (
    <label className="kit-switch">
      Kit{' '}
      <select
        data-testid="kit-switch"
        value={state.kit}
        onChange={(event) => {
          setBusy(true)
          void switchKit(event.target.value)
        }}
      >
        {state.kits.map((kit) => (
          <option key={kit} value={kit}>
            {KIT_LABELS[kit] ?? kit}
          </option>
        ))}
      </select>
    </label>
  )
}

if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = localStorage.getItem('demo-theme') ?? 'light'
}

/** The layout every page shares: the nav, the scenario buttons, and the page's chat. */
export function Shell(props: { current: string; subtitle: ReactNode; notes?: ReactNode; children: ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <strong>Orders assistant</strong>
        <nav>
          {pages.map((page) => (
            <a key={page.href} href={page.href} aria-current={page.href === props.current ? 'page' : undefined}>
              {page.label}
            </a>
          ))}
        </nav>
        <span className="subtitle">{props.subtitle}</span>
        <KitSwitch />
        <ThemeToggle />
      </header>
      <div className="body">
        <aside className="scenarios">
          <h2>Scenarios</h2>
          {scenarios.map((scenario) => (
            <button key={scenario.id} type="button" data-scenario={scenario.id} onClick={() => sendScenario(scenario.prompt)}>
              {scenario.label}
            </button>
          ))}
          <p className="hint">4. Interactive: press a Refund button inside the orders table, then approve or reject.</p>
          <p className="hint">5. Persistence: reload the page, or reopen an older thread from the list.</p>
          <p className="hint">8. Sandbox: change the numbers, then press “Ask the assistant to settle it”.</p>
          <p className="hint">9. Kit: the same splitter in the app’s design system — pick the kit at the top (shadcn + Tailwind, Bootstrap, MUI), then try Light / dark.</p>
          {props.notes ? <div className="notes">{props.notes}</div> : null}
        </aside>
        <main className="chat-frame">{props.children}</main>
      </div>
    </div>
  )
}
