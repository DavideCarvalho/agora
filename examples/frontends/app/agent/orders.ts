/**
 * The demo's "database", in memory. `refund_order` flips a status, so a later list shows the
 * refund. Restarting the server resets it.
 */
export interface Order {
  id: string
  customer: string
  totalCents: number
  status: 'paid' | 'shipped' | 'refunded'
}

const initial: Order[] = [
  { id: '1001', customer: 'Ada Lovelace', totalCents: 4200, status: 'shipped' },
  { id: '1002', customer: 'Alan Turing', totalCents: 12999, status: 'paid' },
  { id: '1003', customer: 'Grace Hopper', totalCents: 2550, status: 'paid' },
  { id: '1004', customer: 'Edsger Dijkstra', totalCents: 8900, status: 'shipped' },
]

const orders = new Map(initial.map((order) => [order.id, { ...order }]))

export function listOrders(): Order[] {
  return [...orders.values()].map((order) => ({ ...order }))
}

export function topOrders(count: number): Order[] {
  return listOrders()
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, count)
}

export function refundOrder(id: string): Order {
  const order = orders.get(id)
  if (!order) throw new Error(`Order ${id} does not exist`)
  if (order.status === 'refunded') throw new Error(`Order ${id} is already refunded`)
  order.status = 'refunded'
  return { ...order }
}

export const revenueByMonth = [
  { month: 'Jan', revenue: 12400 },
  { month: 'Feb', revenue: 13900 },
  { month: 'Mar', revenue: 13100 },
  { month: 'Apr', revenue: 15800 },
  { month: 'May', revenue: 17200 },
  { month: 'Jun', revenue: 18600 },
]

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Back to the seeded statuses — the e2e driver calls it before each page. */
export function resetOrders() {
  for (const order of initial) orders.set(order.id, { ...order })
}
