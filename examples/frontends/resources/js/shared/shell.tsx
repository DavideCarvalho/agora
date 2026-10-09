import type { ReactNode } from 'react'
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
          <p className="hint">9. Kit: the same splitter written in JSX with the app’s own Button/Card/Input/Slider, in its theme — try Light / dark.</p>
          {props.notes ? <div className="notes">{props.notes}</div> : null}
        </aside>
        <main className="chat-frame">{props.children}</main>
      </div>
    </div>
  )
}
