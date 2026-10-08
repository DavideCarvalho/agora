import { createContext, useContext, type ReactNode } from 'react'
import { useGenuiNode, type GenuiNodeState } from '@adonis-agora/agent/react/genui'

/**
 * The React renderers of every catalog component (app/genui/catalog.ts): the app's `OrderList` and
 * the library builtins, which ship as definitions only. The native page and the CopilotKit page
 * draw with these same components, so any difference you see is the integration, not the pixels.
 *
 * Skeletons. On the native page a `ui__render` tree streams while the model writes it, so a node's
 * props can be missing or half-written: `useGenuiNode()?.incomplete` says so, and the renderer
 * draws a skeleton with the final footprint until they fill in (outside a tree the hook answers
 * `null`). `OrderList` also has a loading state of its own, pushed by `list_orders` before it reads.
 */

/** How a component talks back to the agent. Each page provides its own `send`. */
export const AgentActions = createContext<{ send: (text: string) => void }>({ send: () => {} })

type Row = Record<string, string | number | boolean | null>

export interface OrderRow {
  id: string
  customer: string
  totalCents: number
  status: string
}

// ---------------------------------------------------------------------------------------------
// Skeleton pieces: decorative blocks inside one busy container that announces "Loading…" once.
// ---------------------------------------------------------------------------------------------

export function Bar({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton-bar ${className}`} />
}

function Busy({ children, className = 'genui-block', testId }: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div className={className} aria-busy="true" data-genui-skeleton data-testid={testId}>
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  )
}

function SkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return Array.from({ length: rows }, (_, r) => (
    <tr key={`skeleton-${r}`} aria-hidden="true">
      {Array.from({ length: columns }, (_, c) => <td key={c}><Bar /></td>)}
    </tr>
  ))
}

/** A chart's footprint: title, plot area with a faint baseline, axis labels. */
export function ChartSkeleton({ title }: { title?: string }) {
  return (
    <Busy testId="chart-skeleton">
      {title ? <figcaption>{title}</figcaption> : <Bar className="skeleton-title" />}
      <div className="skeleton-plot" aria-hidden="true" />
    </Busy>
  )
}

/** What `<GenerativeUI>` draws for a node held back while the model writes it (the chart). */
export function heldPlaceholder(node: GenuiNodeState): ReactNode {
  return node.type === 'Chart' ? <ChartSkeleton /> : <Busy><Bar className="skeleton-title" /></Busy>
}

// ---------------------------------------------------------------------------------------------
// The app's component, with its loading / empty / error states.
// ---------------------------------------------------------------------------------------------

const ORDER_COLUMNS = ['Order', 'Customer', 'Total', 'Status', '']

type Placeholder = { state: 'loading' | 'empty' | 'error'; title?: string }

export function OrderList(props: { orders: OrderRow[] } | Placeholder) {
  const { send } = useContext(AgentActions)
  if ('state' in props) {
    if (props.state !== 'loading') {
      return (
        <p className="genui-ended" role={props.state === 'error' ? 'alert' : 'status'}>
          {props.state === 'empty' ? 'No orders yet.' : 'Could not load your orders.'}
        </p>
      )
    }
    // The real header and three rows: the list lands in the same place, without a jump.
    return (
      <Busy className="" testId="order-list-skeleton">
        <table className="genui-table">
          <thead><tr>{ORDER_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody><SkeletonRows rows={3} columns={ORDER_COLUMNS.length} /></tbody>
        </table>
      </Busy>
    )
  }
  return (
    <table className="genui-table" data-testid="order-list">
      <thead>
        <tr>{ORDER_COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {props.orders.map((order) => (
          <tr key={order.id}>
            <td>#{order.id}</td>
            <td>{order.customer}</td>
            <td>${(order.totalCents / 100).toFixed(2)}</td>
            <td><span className={`status status-${order.status}`}>{order.status}</span></td>
            <td>
              {order.status !== 'refunded' ? (
                <button type="button" data-testid={`refund-${order.id}`} onClick={() => send(`Refund order #${order.id}`)}>
                  Refund
                </button>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ---------------------------------------------------------------------------------------------
// The builtins. Every prop is defaulted: while a node streams, any of them may not be there yet.
// ---------------------------------------------------------------------------------------------

type Column = { key: string; label: string; align?: 'left' | 'right' | 'center' }

export function DataTable({ title, columns = [], rows = [] }: { title?: string; columns?: Column[]; rows?: Row[] }) {
  const node = useGenuiNode()
  const cols = columns.filter((c) => c?.key && c.label)
  if (node?.incomplete && cols.length === 0) {
    return (
      <Busy testId="data-table-skeleton">
        {title ? <figcaption>{title}</figcaption> : <Bar className="skeleton-title" />}
        <table className="genui-table"><tbody><SkeletonRows rows={3} columns={3} /></tbody></table>
      </Busy>
    )
  }
  return (
    <figure className="genui-block" data-testid="data-table" aria-busy={node?.incomplete || undefined}>
      {title ? <figcaption>{title}</figcaption> : null}
      <table className="genui-table">
        <thead><tr>{cols.map((c) => <th key={c.key} style={{ textAlign: c.align }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.filter(Boolean).map((row, i) => (
            <tr key={i}>{cols.map((c) => <td key={c.key} style={{ textAlign: c.align }}>{String(row[c.key] ?? '')}</td>)}</tr>
          ))}
          {/* While rows are still arriving, one skeleton row keeps the bottom edge steady. */}
          {node?.incomplete ? <SkeletonRows rows={1} columns={cols.length} /> : null}
        </tbody>
      </table>
    </figure>
  )
}

export function Chart({ type = 'bar', title, xKey = '', series = [], data = [] }: { type?: 'bar' | 'line'; title?: string; xKey?: string; series?: Array<{ key: string; label?: string }>; data?: Row[]; unit?: string }) {
  const key = series[0]?.key ?? ''
  const values = data.map((point) => Number(point?.[key]) || 0)
  const max = Math.max(1, ...values)
  const width = 360, height = 140, step = width / Math.max(1, data.length)
  const y = (v: number) => height - (v / max) * (height - 10)
  return (
    <figure className="genui-block" data-testid="chart">
      {title ? <figcaption>{title}</figcaption> : null}
      <svg width={width} height={height + 18} role="img" aria-label={title}>
        {type === 'bar'
          ? values.map((v, i) => <rect key={i} x={i * step + 6} y={y(v)} width={step - 12} height={height - y(v)} fill="#4f6bed" />)
          : <polyline fill="none" stroke="#4f6bed" strokeWidth={2} points={values.map((v, i) => `${i * step + step / 2},${y(v)}`).join(' ')} />}
        {data.map((point, i) => (
          <text key={i} x={i * step + step / 2} y={height + 14} fontSize={11} textAnchor="middle">{String(point?.[xKey] ?? '')}</text>
        ))}
      </svg>
    </figure>
  )
}

type Kpi = { label?: string; value?: string | number; delta?: string; trend?: string }

export function KpiCards({ items = [] }: { title?: string; items?: Kpi[] }) {
  const node = useGenuiNode()
  const ready = items.filter((item) => item?.label)
  if (node?.incomplete && ready.length === 0) {
    return (
      <Busy className="kpis" testId="kpis-skeleton">
        {[0, 1].map((i) => <div key={i} className="kpi"><Bar className="skeleton-label" /><Bar className="skeleton-value" /></div>)}
      </Busy>
    )
  }
  return (
    <div className="kpis" data-testid="kpis">
      {ready.map((item) => (
        <div key={item.label} className="kpi">
          <span>{item.label}</span>
          {item.value === undefined ? <Bar className="skeleton-value" /> : <strong>{item.value}</strong>}
          {item.delta ? <em className={`trend-${item.trend ?? 'flat'}`}>{item.delta}</em> : null}
        </div>
      ))}
    </div>
  )
}

export function Callout({ tone = 'info', title, text = '' }: { tone?: string; title?: string; text?: string }) {
  return <div className={`callout callout-${tone}`}>{title ? <strong>{title} </strong> : null}{text}</div>
}

export function Stack({ direction = 'column', gap = 8, children }: { direction?: 'row' | 'column'; gap?: number; children?: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: direction, gap }}>{children}</div>
}

/** A layout draws its frame at once; its children fill in on their own. */
export function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children?: ReactNode }) {
  const node = useGenuiNode()
  return (
    <section className="genui-card" data-testid="genui-card" aria-busy={node?.incomplete || undefined}>
      {title ? <h3>{title}{subtitle ? <small> — {subtitle}</small> : null}</h3> : node?.incomplete ? <Bar className="skeleton-title" /> : null}
      {children}
    </section>
  )
}

export const Heading = ({ text = '' }: { text?: string }) => <h3>{text}</h3>
export const Text = ({ text = '', muted }: { text?: string; muted?: boolean }) => <p style={{ color: muted ? '#777' : undefined }}>{text}</p>
export const Badge = ({ text = '', tone = 'neutral' }: { text?: string; tone?: string }) => <span className={`status status-${tone}`}>{text}</span>

/** Keys are the catalog's component names. */
export const registry = { OrderList, DataTable, Chart, KpiCards, Callout, Stack, Card, Heading, Text, Badge }
