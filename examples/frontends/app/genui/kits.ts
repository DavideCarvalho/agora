import app from '@adonisjs/core/services/app'
import { AnonymousActorResolver } from '@adonis-agora/agent'
import { type Catalog, type DefineSandboxOptions, defineSandbox, sandboxPolicyOf } from '@adonis-agora/agent/genui'
import {
  adonisSandboxKitDiscovery,
  resolveSandboxServer,
  type ResolvedSandboxServer,
} from '@adonis-agora/agent/genui/kit'
import { catalog } from '#genui/catalog'

/**
 * The sandbox kit per visitor (scenario 9). vite.config.ts builds every kit side by side, each a
 * named `genuiSandboxKit({ name })`; a visitor picks one with `?kit=` or the switcher (a
 * `sandbox_kit` cookie, start/routes.ts), and only their own chats draw with it:
 *
 * - the model: config/agent.ts resolves the catalog per actor (`genui({ resolver })`) — the same
 *   catalog, its `Sandbox` found for that visitor's kit (`kitName`), so the tool descriptions name
 *   that kit's components, classes and theme;
 * - the browser: the renderers ask `/demo/kit/config` (start/routes.ts) where that kit's assets are.
 */

/** The kits vite.config.ts builds (it lists them on `globalThis`, which the dev server shares). */
export function kitNames(): string[] {
  return (globalThis as { __sandboxKits?: string[] }).__sandboxKits ?? ['shadcn', 'bootstrap', 'mui']
}

/** The kit a new visitor starts with: `SANDBOX_KIT`, else shadcn. */
export function defaultKit(): string {
  const wanted = process.env.SANDBOX_KIT
  return wanted !== undefined && kitNames().includes(wanted) ? wanted : 'shadcn'
}

/** A kit name from a cookie or a query, if it is one of ours. */
export function knownKit(value: unknown): string | undefined {
  return typeof value === 'string' && kitNames().includes(value) ? value : undefined
}

const servers = new Map<string, Promise<ResolvedSandboxServer>>()

/** One kit, found through Vite (its named plugin in dev, the manifest in a build). */
function serverFor(kit: string): Promise<ResolvedSandboxServer> {
  let pending = servers.get(kit)
  if (pending === undefined) {
    const own = catalog.components.find((each) => sandboxPolicyOf(each) !== undefined) as
      | { name: string; sandboxOptions?: DefineSandboxOptions }
      | undefined
    pending = adonisSandboxKitDiscovery(app, { name: kit }).then((discovery) =>
      resolveSandboxServer({ ...own?.sandboxOptions, name: own?.name, kit: true, kitName: kit }, discovery)
    )
    servers.set(kit, pending)
  }
  return pending
}

/** The catalog with its `Sandbox` drawn in `kit`. */
export async function catalogFor(kit: string): Promise<Catalog> {
  return catalog.extend([defineSandbox((await serverFor(kit)).define)])
}

/** What the browser needs for `kit`: its asset urls (`GET <agent>/config`'s `genui.sandbox` shape). */
export async function clientConfigFor(kit: string) {
  return (await serverFor(kit)).client()
}

/** Who picked which kit: the visitor's anonymous actor (its `agent_anon` cookie) → the kit. */
const visitors = new Map<string, string>()
const actors = new AnonymousActorResolver()

/** The anonymous actor id the agent gives this request (the same cookie, the same digest). */
export function actorIdOf(ctx: unknown): string {
  return actors.resolve(ctx).id
}

export function rememberKit(actorId: string, kit: string): void {
  visitors.set(actorId, kit)
}

export function kitOfActor(actorId: string): string {
  return visitors.get(actorId) ?? defaultKit()
}
