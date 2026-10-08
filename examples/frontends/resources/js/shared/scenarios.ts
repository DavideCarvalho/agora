/** The same prompts on every page. The scripted model keys off these words. */
export const scenarios = [
  { id: 'orders', label: '1. Orders table (tool → skeleton → rows)', prompt: 'Show my recent orders' },
  { id: 'revenue', label: '2. Revenue chart (progressive)', prompt: 'Chart revenue by month' },
  {
    id: 'dashboard',
    label: '3. Dashboard (model-composed, streamed)',
    prompt: 'Show a dashboard with a chart of revenue by month plus the top 3 orders',
  },
  { id: 'invalid', label: '7. Invalid props (pie chart)', prompt: 'Show order statuses as a pie chart' },
] as const

export const SCENARIO_EVENT = 'demo:scenario'

/** The shell's buttons raise this; each page sends it through its own framework's API. */
export function sendScenario(prompt: string) {
  window.dispatchEvent(new CustomEvent(SCENARIO_EVENT, { detail: prompt }))
}

export function onScenario(handler: (prompt: string) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<string>).detail)
  window.addEventListener(SCENARIO_EVENT, listener)
  return () => window.removeEventListener(SCENARIO_EVENT, listener)
}
