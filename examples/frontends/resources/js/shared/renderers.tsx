import { createContext, useContext, type ReactNode } from 'react'

/**
 * The React renderers of every catalog component (app/genui/catalog.ts): the app's `OrderList` and
 * the library builtins, which ship as definitions only. The native page and the CopilotKit page
 * draw with these same components, so any difference you see is the integration, not the pixels.
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

export function OrderList({ orders }: { orders: OrderRow[] }) {
  const { send } = useContext(AgentActions)
  return (
    <table className="genui-table" data-testid="order-list">
      <thead>
        <tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th /></tr>
      </thead>
      <tbody>
        {orders.map((order) => (
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

export function DataTable(props: { title?: string; columns: Array<{ key: string; label: string; align?: 'left' | 'right' | 'center' }>; rows: Row[] }) {
  return (
    <figure className="genui-block" data-testid="data-table">
      {props.title ? <figcaption>{props.title}</figcaption> : null}
      <table className="genui-table">
        <thead><tr>{props.columns.map((c) => <th key={c.key} style={{ textAlign: c.align }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {props.rows.map((row, i) => (
            <tr key={i}>{props.columns.map((c) => <td key={c.key} style={{ textAlign: c.align }}>{String(row[c.key] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

export function Chart(props: { type: 'bar' | 'line'; title?: string; xKey: string; series: Array<{ key: string; label?: string }>; data: Row[]; unit?: string }) {
  const key = props.series[0]?.key ?? ''
  const values = props.data.map((point) => Number(point[key]) || 0)
  const max = Math.max(1, ...values)
  const width = 360, height = 140, step = width / Math.max(1, props.data.length)
  const y = (v: number) => height - (v / max) * (height - 10)
  return (
    <figure className="genui-block" data-testid="chart">
      {props.title ? <figcaption>{props.title}</figcaption> : null}
      <svg width={width} height={height + 18} role="img" aria-label={props.title}>
        {props.type === 'bar'
          ? values.map((v, i) => <rect key={i} x={i * step + 6} y={y(v)} width={step - 12} height={height - y(v)} fill="#4f6bed" />)
          : <polyline fill="none" stroke="#4f6bed" strokeWidth={2} points={values.map((v, i) => `${i * step + step / 2},${y(v)}`).join(' ')} />}
        {props.data.map((point, i) => (
          <text key={i} x={i * step + step / 2} y={height + 14} fontSize={11} textAnchor="middle">{String(point[props.xKey])}</text>
        ))}
      </svg>
    </figure>
  )
}

export function KpiCards(props: { title?: string; items: Array<{ label: string; value: string | number; delta?: string; trend?: string }> }) {
  return (
    <div className="kpis" data-testid="kpis">
      {props.items.map((item) => (
        <div key={item.label} className="kpi">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.delta ? <em className={`trend-${item.trend ?? 'flat'}`}>{item.delta}</em> : null}
        </div>
      ))}
    </div>
  )
}

export function Callout(props: { tone?: string; title?: string; text: string }) {
  return <div className={`callout callout-${props.tone ?? 'info'}`}>{props.title ? <strong>{props.title} </strong> : null}{props.text}</div>
}

export function Stack(props: { direction?: 'row' | 'column'; gap?: number; children?: ReactNode }) {
  return <div style={{ display: 'flex', flexDirection: props.direction ?? 'column', gap: props.gap ?? 8 }}>{props.children}</div>
}

export function Card(props: { title?: string; subtitle?: string; children?: ReactNode }) {
  return (
    <section className="genui-card" data-testid="genui-card">
      {props.title ? <h3>{props.title}{props.subtitle ? <small> — {props.subtitle}</small> : null}</h3> : null}
      {props.children}
    </section>
  )
}

export const Heading = (props: { text: string }) => <h3>{props.text}</h3>
export const Text = (props: { text: string; muted?: boolean }) => <p style={{ color: props.muted ? '#777' : undefined }}>{props.text}</p>
export const Badge = (props: { text: string; tone?: string }) => <span className={`status status-${props.tone ?? 'neutral'}`}>{props.text}</span>

/** Keys are the catalog's component names. */
export const registry = { OrderList, DataTable, Chart, KpiCards, Callout, Stack, Card, Heading, Text, Badge }
