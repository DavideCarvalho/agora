import { randomUUID } from 'node:crypto'
import type { ChannelAdapter, InboundMessage, OutboundMessage } from '@adonis-agora/agent/channels'

/**
 * A simulated WhatsApp: a channel adapter that answers like WhatsApp Cloud would be asked to —
 * text, reply buttons (≤3), list messages (≤10 rows), images — but records each message for the
 * /whatsapp page instead of calling Meta. `kind: 'whatsapp'`, so `genui({ channels: { whatsapp } })`
 * applies to it exactly as it would to `whatsappCloud()`.
 */
export interface SimMessage {
  id: string
  at: number
  conversation: string
  direction: 'in' | 'out'
  text: string
  buttons?: { id: string; label: string }[]
  list?: { button: string; title?: string; rows: { id: string; title: string; description?: string }[] }
  image?: string
}

const log: SimMessage[] = []

export function simMessages(conversation: string, since = 0): SimMessage[] {
  return log.filter((message) => message.conversation === conversation && message.at > since)
}

export function resetSim(conversation: string) {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    if (log[index]!.conversation === conversation) log.splice(index, 1)
  }
}

let clock = 0
/** Strictly increasing timestamps: two messages in one millisecond keep their order. */
const now = () => (clock = Math.max(Date.now(), clock + 1))

export function recordInbound(conversation: string, text: string) {
  log.push({ id: randomUUID(), at: now(), conversation, direction: 'in', text })
}

function toSim(conversation: string, message: OutboundMessage): SimMessage {
  const base = { id: randomUUID(), at: now(), conversation, direction: 'out' as const, text: message.text }
  if (message.media !== undefined) {
    const { media } = message
    const image =
      media.url ?? (media.data ? `data:${media.contentType ?? 'image/png'};base64,${media.data.toString('base64')}` : undefined)
    return { ...base, ...(image ? { image } : {}) }
  }
  if (message.list !== undefined) return { ...base, list: message.list }
  if (message.buttons !== undefined) return { ...base, buttons: message.buttons }
  return base
}

export const whatsappSim: ChannelAdapter = {
  name: 'whatsapp-sim',
  kind: 'whatsapp',
  capabilities: { buttons: 3, lists: 10, markdown: 'whatsapp', maxLength: 4096, media: true, maxCaptionLength: 1024 },
  verify: () => true,
  parse(body): InboundMessage | null {
    const input = body as { conversation?: string; text?: string; buttonId?: string }
    if (typeof input?.text !== 'string') return null
    const conversation = input.conversation ?? 'demo'
    return {
      id: randomUUID(),
      from: conversation,
      conversation,
      text: input.text,
      ...(typeof input.buttonId === 'string' ? { buttonId: input.buttonId } : {}),
      raw: body,
    }
  },
  async send(conversation, message) {
    log.push(toSim(conversation, message))
  },
}
