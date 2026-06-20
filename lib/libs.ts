import { Activity, Boxes, type LucideIcon, Telescope, Workflow, Zap } from 'lucide-react';

export interface AgoraLib {
  /** url + folder slug under /docs */
  slug: string;
  /** primary published package, without the @agora scope */
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
    packages: 2,
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
    packages: 9,
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
    packages: 5,
    stage: 'beta',
  },
];

export const stageLabel: Record<AgoraLib['stage'], string> = {
  alpha: 'Alpha',
  beta: 'Beta',
  wip: 'In flight',
};

export const totalPackages = libs.reduce((n, l) => n + l.packages, 0);
