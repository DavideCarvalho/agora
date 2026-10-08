import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { Shell } from '../shared/shell.js'
import { rows, type Cell } from '../shared/matrix.js'

const label = { 'built-in': 'Built in', glue: 'Glue', no: 'No', unverified: 'Not verified' }

/** `code` spans in the notes, without a markdown dependency. */
function rich(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, i) => (part.startsWith('`') ? <code key={i}>{part.slice(1, -1)}</code> : part))
}

function CellView({ cell }: { cell: Cell }) {
  return (
    <td className={cell.status === 'built-in' ? 'yes' : cell.status}>
      <strong>{label[cell.status]}</strong> — {rich(cell.note)}
    </td>
  )
}

function Home() {
  return (
    <Shell current="/" subtitle="Generative UI: one agent, three frontends">
      <div className="home">
        <h1>Generative UI: native vs CopilotKit vs OpenUI</h1>
        <p>
          One AdonisJS agent (<code>@adonis-agora/agent</code>), three pages. <a href="/native">Native</a> uses{' '}
          <code>@adonis-agora/agent/react</code> over the native stream; <a href="/copilotkit">CopilotKit</a> and{' '}
          <a href="/openui">OpenUI</a> drive the same agent through <code>agUiAdapter()</code>. Every cell below
          was checked by running the pages (<code>pnpm e2e</code>). “Glue” is app code that bridges the frontend
          to this agent, with its line count.
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Capability</th>
              <th><a href="/native">Native</a></th>
              <th><a href="/copilotkit">CopilotKit</a></th>
              <th><a href="/openui">OpenUI</a></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <th>{row.capability}</th>
                <CellView cell={row.native} />
                <CellView cell={row.copilotkit} />
                <CellView cell={row.openui} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Home />
  </StrictMode>
)
