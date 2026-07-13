import {
  Activity,
  Bot,
  Boxes,
  Filter,
  Image,
  KeyRound,
  type LucideIcon,
  ShieldCheck,
  Telescope,
  Workflow,
  Zap,
} from 'lucide-react';

export interface AgoraLib {
  /** url + folder slug under /docs */
  slug: string;
  /** primary published package, without the @adonis-agora scope */
  pkg: string;
  /** display name */
  name: string;
  /** one-line description */
  blurb: string;
  /** short role tag shown on the card */
  role: string;
  /** lucide icon, used on cards + docs sidebar tabs */
  icon: LucideIcon;
  /** lucide icon name as string — for meta.json sidebar tabs */
  iconName: string;
  /** how many packages ship in the family */
  packages: number;
  /** maturity badge */
  stage: 'alpha' | 'beta' | 'wip';
}

export const libs: AgoraLib[] = [
  {
    slug: 'context',
    pkg: 'context',
    name: 'Context',
    blurb:
      'Ambient request/tenant/correlation context that crosses HTTP, queue, durable and ace boundaries — not just the HTTP lifecycle.',
    role: 'Foundation',
    icon: Boxes,
    iconName: 'Boxes',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'diagnostics',
    pkg: 'diagnostics',
    name: 'Diagnostics',
    blurb:
      'A zero-dependency diagnostics bus over node:diagnostics_channel — emit once, observe anywhere, with an OpenTelemetry auto-bridge.',
    role: 'Foundation',
    icon: Activity,
    iconName: 'Activity',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'resilience',
    pkg: 'resilience',
    name: 'Resilience',
    blurb:
      'Composable timeout, retry, circuit-breaker and failover policies — with a pluggable, distributed breaker store (Lucid, Redis).',
    role: 'Reliability',
    icon: Zap,
    iconName: 'Zap',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'durable',
    pkg: 'durable',
    name: 'Durable',
    blurb:
      'Durable, resumable, cross-process workflows built on @adonisjs/queue — steps, signals, sagas, leases, DLQ, cron. Resumable by design.',
    role: 'Workflows',
    icon: Workflow,
    iconName: 'Workflow',
    packages: 2,
    stage: 'beta',
  },
  {
    slug: 'telescope',
    pkg: 'telescope',
    name: 'Telescope',
    blurb:
      'A Telescope-style observability console — watchers, request correlation, pluggable storage, headless API + an extensible dashboard.',
    role: 'Observability',
    icon: Telescope,
    iconName: 'Telescope',
    packages: 1,
    stage: 'beta',
  },
  {
    slug: 'authz',
    pkg: 'authz',
    name: 'Authz',
    blurb:
      'DB-backed roles & permissions that feed AdonisJS Bouncer — wildcard grants, multi-tenancy, a Lucid store and ace commands. Integrates, never replaces.',
    role: 'Authorization',
    icon: ShieldCheck,
    iconName: 'ShieldCheck',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'media',
    pkg: 'media',
    name: 'Media',
    blurb:
      'A media library for AdonisJS — owner collections, image conversions (eager/lazy), and column attachments, all on top of @adonisjs/drive. The spatie media-library feel.',
    role: 'Storage',
    icon: Image,
    iconName: 'Image',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'filter',
    pkg: 'filter',
    name: 'Filter',
    blurb:
      'A typed query-param filter language for Lucid — Spatie/JSON:API input, operators and defineFilter classes, offset & cursor pagination, relations via whereHas, full-text (tsvector) and vector-similarity search, plus a type-safe client builder with codegen.',
    role: 'Data',
    icon: Filter,
    iconName: 'Filter',
    packages: 2,
    stage: 'alpha',
  },
  {
    slug: 'agent',
    pkg: 'agent',
    name: 'Agent',
    blurb:
      'A governed, durable-ready AI agent for AdonisJS — streaming chat, tool-calling, fail-closed authorization, human-in-the-loop approvals, quota/cost accounting and multi-agent delegation. One loop, two runners.',
    role: 'AI',
    icon: Bot,
    iconName: 'Bot',
    packages: 1,
    stage: 'alpha',
  },
  {
    slug: 'authkit',
    pkg: 'authkit-server',
    name: 'AuthKit',
    blurb:
      'A full OIDC/OAuth2 Authorization Server for AdonisJS — MFA, passwordless, device flow, DPoP, admin & account consoles, plus an OIDC client adapter and React ergonomics.',
    role: 'Identity',
    icon: KeyRound,
    iconName: 'KeyRound',
    packages: 9,
    stage: 'beta',
  },
];

export const stageLabel: Record<AgoraLib['stage'], string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  wip: 'In flight',
};

export const totalPackages = libs.reduce((n, l) => n + l.packages, 0);
