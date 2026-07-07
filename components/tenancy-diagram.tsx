// Deployment-topology diagrams for the durable tenancy docs. Hand-authored SVG (no runtime deps),
// theme-aware via Fumadocs' `--color-fd-*` CSS variables — so it adapts to light/dark and to each
// site's own primary color automatically. Three variants map to the three shapes the
// operator/tenant model allows.

type Variant = 'single' | 'tenants' | 'polyglot';

const ink = 'var(--color-fd-foreground)';
const muted = 'var(--color-fd-muted-foreground)';
const card = 'var(--color-fd-card)';
const border = 'var(--color-fd-border)';
const accent = 'var(--color-fd-primary)';
const accentSoft = 'color-mix(in srgb, var(--color-fd-primary) 14%, transparent)';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

/** A rounded node box with a title, muted subtitle rows, and an optional accent bar. */
function Node({
  x,
  y,
  w,
  h,
  title,
  rows,
  accented,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: string[];
  accented?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        style={{
          fill: card,
          stroke: accented ? accent : border,
          strokeWidth: accented ? 1.5 : 1,
        }}
        filter="url(#soft)"
      />
      {accented ? <rect x={x} y={y} width={4} height={h} rx={2} style={{ fill: accent }} /> : null}
      <text x={x + 16} y={y + 25} style={{ fill: ink, fontSize: 13, fontWeight: 600 }}>
        {title}
      </text>
      {rows.map((row, i) => (
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: static label list, order is stable
          key={i}
          x={x + 16}
          y={y + 46 + i * 17}
          style={{ fill: muted, fontSize: 11, fontFamily: mono }}
        >
          {row}
        </text>
      ))}
    </g>
  );
}

/** A labelled connector. `dir="both"` draws arrowheads on both ends. */
function Link({
  x1,
  y1,
  x2,
  y2,
  label,
  dir = 'both',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  dir?: 'both' | 'forward';
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        style={{ stroke: muted, strokeWidth: 1.5 }}
        markerEnd="url(#arrow)"
        markerStart={dir === 'both' ? 'url(#arrow)' : undefined}
      />
      {label ? (
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 7}
          textAnchor="middle"
          style={{ fill: muted, fontSize: 10.5, fontFamily: mono }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX={8}
        refY={5}
        markerWidth={6}
        markerHeight={6}
        orient="auto-start-reverse"
      >
        <path d="M0,0 L10,5 L0,10 z" style={{ fill: muted }} />
      </marker>
      <filter id="soft" x="-8%" y="-8%" width="116%" height="130%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
      </filter>
    </defs>
  );
}

/** Transport bus — a tall rounded pill representing the broker (Redis) the wire runs over. */
function Bus({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={w / 2}
        style={{ fill: accentSoft, stroke: border, strokeWidth: 1 }}
      />
      <text
        x={x + w / 2}
        y={y + h / 2 - 4}
        textAnchor="middle"
        style={{ fill: ink, fontSize: 12, fontWeight: 600 }}
      >
        Transport
      </text>
      <text
        x={x + w / 2}
        y={y + h / 2 + 13}
        textAnchor="middle"
        style={{ fill: muted, fontSize: 10.5, fontFamily: mono }}
      >
        (Redis)
      </text>
    </g>
  );
}

function Single() {
  return (
    <svg viewBox="0 0 660 190" width="100%" role="img" aria-label="Single deployment topology">
      <title>Single deployment: one process holds the store, engine, and workers</title>
      <Defs />
      <Node
        x={40}
        y={30}
        w={300}
        h={130}
        accented
        title="Application"
        rows={['engine · store · workers', 'namespace: default', 'StoreRunGateway (direct reads)']}
      />
      <Bus x={470} y={45} w={120} h={100} />
      <Link x1={340} y1={95} x2={470} y2={95} label="tasks" />
    </svg>
  );
}

function Tenants() {
  return (
    <svg viewBox="0 0 760 320" width="100%" role="img" aria-label="Operator with tenant workers">
      <title>Control plane (operator) plus tenant workers, wired over the transport</title>
      <Defs />
      <Node
        x={24}
        y={96}
        w={224}
        h={128}
        accented
        title="Control plane · operator"
        rows={[
          'engine · store · dashboard',
          'namespace: — (drives all)',
          'sees every tenant’s runs',
        ]}
      />
      <Bus x={330} y={70} w={92} h={180} />
      <Node
        x={512}
        y={40}
        w={224}
        h={102}
        title="Tenant · blue"
        rows={['DURABLE_TENANT=blue · no store', 'workers → handler@blue', 'ProxyRunGateway']}
      />
      <Node
        x={512}
        y={178}
        w={224}
        h={102}
        title="Tenant · green"
        rows={['DURABLE_TENANT=green · no store', 'workers → handler@green', 'ProxyRunGateway']}
      />
      <Link x1={248} y1={160} x2={330} y2={160} label="control + reads" />
      <Link x1={422} y1={120} x2={512} y2={91} label="run@blue" />
      <Link x1={422} y1={200} x2={512} y2={229} label="run@green" />
    </svg>
  );
}

function Polyglot() {
  return (
    <svg
      viewBox="0 0 760 210"
      width="100%"
      role="img"
      aria-label="Cross-runtime operator and worker"
    >
      <title>A Node operator orchestrating a Python tenant worker over one transport</title>
      <Defs />
      <Node
        x={24}
        y={45}
        w={230}
        h={120}
        accented
        title="Operator · Node"
        rows={['engine · store', 'orchestrates pipeline', 'namespace: default']}
      />
      <Bus x={340} y={55} w={92} h={100} />
      <Node
        x={512}
        y={45}
        w={224}
        h={120}
        title="Tenant · Python"
        rows={['durable-worker (no store)', 'runs handler@… steps', 'same queue names']}
      />
      <Link x1={254} y1={105} x2={340} y2={105} label="start-run" />
      <Link x1={432} y1={105} x2={512} y2={105} label="dispatch · reply" />
    </svg>
  );
}

const VARIANTS: Record<Variant, () => React.JSX.Element> = {
  single: Single,
  tenants: Tenants,
  polyglot: Polyglot,
};

/**
 * A durable deployment-topology diagram. `variant` selects which shape to draw; `caption` is an
 * optional figcaption. Theme-aware (light/dark, per-site primary) via Fumadocs' CSS variables.
 */
export function TenancyDiagram({
  variant,
  caption,
}: {
  variant: Variant;
  caption?: string;
}) {
  const Shape = VARIANTS[variant];
  return (
    <figure className="my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card p-4">
      <Shape />
      {caption ? (
        <figcaption className="mt-2 border-t border-fd-border px-1 pt-2 text-xs text-fd-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
