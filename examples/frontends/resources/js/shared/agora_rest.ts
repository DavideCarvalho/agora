import { readUiActionText, uiActionSummary } from '@adonis-agora/agent/genui'
import { csrfFetch } from './csrf.js'

/**
 * GLUE for the third-party pages: the agent's own REST routes (threads, cancel) that AG-UI has no
 * request for. The native page gets all of this from `@adonis-agora/agent/react`.
 */
export interface ThreadSummary {
  id: string
  title: string
  createdAt: string
}

interface StoredMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: Array<{ id: string; name: string; input: unknown }>
  toolResults?: Array<{ id: string; output: unknown; error?: string }>
}

/** An AG-UI message — what both CopilotKit and OpenUI keep in their message lists. */
export type AgUiMessage =
  | { id: string; role: 'user' | 'system'; content: string }
  | {
      id: string
      role: 'assistant'
      content: string
      toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
    }
  | { id: string; role: 'tool'; toolCallId: string; content: string }

export async function listThreads(): Promise<ThreadSummary[]> {
  const response = await csrfFetch('/agent/threads')
  if (!response.ok) throw new Error(`GET /agent/threads: ${response.status}`)
  const body = await response.json()
  return Array.isArray(body) ? body : (body.threads ?? body.data ?? [])
}

/**
 * What a user message shows: its text — or, for a UI action (a sandbox's `agent.send`, whose stored
 * text carries the values as JSON for the model), one line: "Recalculate · people: 4, tip: 15".
 */
export const userLine = (content: string) => {
  const action = readUiActionText(content)
  return action ? uiActionSummary(action) : content
}

/**
 * A stored thread as AG-UI messages: assistant tool calls, then one `tool` message per result.
 * A UI action's user message shows as its one line (the server keeps the whole text).
 */
export async function threadMessages(threadId: string): Promise<AgUiMessage[]> {
  const response = await csrfFetch(`/agent/threads/${encodeURIComponent(threadId)}`)
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`GET /agent/threads/${threadId}: ${response.status}`)
  const { messages } = (await response.json()) as { messages: StoredMessage[] }
  return messages.flatMap((message): AgUiMessage[] => {
    if (message.role === 'user') return [{ id: message.id, role: 'user', content: userLine(message.content) }]
    if (message.role !== 'assistant') return [{ id: message.id, role: message.role, content: message.content }]
    const calls = message.toolCalls ?? []
    return [
      {
        id: message.id,
        role: 'assistant',
        content: message.content,
        ...(calls.length
          ? { toolCalls: calls.map((c) => ({ id: c.id, type: 'function' as const, function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) } })) }
          : {}),
      },
      ...(message.toolResults ?? []).map((result) => ({
        id: `${message.id}:${result.id}`,
        role: 'tool' as const,
        toolCallId: result.id,
        content: result.error ?? JSON.stringify(result.output ?? null),
      })),
    ]
  })
}


export async function cancelRun(runId: string): Promise<void> {
  await csrfFetch(`/agent/chat/${encodeURIComponent(runId)}/cancel`, { method: 'POST' })
}
