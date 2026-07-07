'use client';

// Interactive operator+tenants scene for the tenancy docs. Hand-authored SVG, no animation deps —
// a token is moved between waypoints and CSS-transitions there. Send a run from a tenant and watch
// start-run → dispatch → reply travel the transport; or try to read another tenant's run and watch
// the operator reject it with a cross-tenant error, showing the isolation boundary live.
//
// Degrades without JS: SSR renders the static topology (operator · transport · two tenants) with a
// prompt to interact. Theme-aware via Fumadocs' `--color-fd-*` variables; respects reduced motion.

import { useEffect, useRef, useState } from 'react';

const ink = 'var(--color-fd-foreground)';
const muted = 'var(--color-fd-muted-foreground)';
const cardBg = 'var(--color-fd-card)';
const border = 'var(--color-fd-border)';
const accent = 'var(--color-fd-primary)';
const RED = '#e5484d';
// Semantic success green (named OK — `GREEN` below is the green tenant's waypoint).
const OK = '#30a46c';

const tintAccent = 'color-mix(in srgb, var(--color-fd-primary) 14%, var(--color-fd-card))';
const tintAccentSoft = 'color-mix(in srgb, var(--color-fd-primary) 7%, var(--color-fd-card))';
const neutral = 'color-mix(in srgb, var(--color-fd-foreground) 4%, var(--color-fd-card))';
const tintRed = 'color-mix(in srgb, #e5484d 13%, var(--color-fd-card))';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

type Tone = 'go' | 'deny' | 'ok';
type Highlight = 'none' | 'op' | 'blue' | 'green' | 'op-deny' | 'blue-deny';
type Stage = { x: number; y: number; label: string; tone: Tone; hi: Highlight; caption: string };

const BLUE = { x: 524, y: 88 };
const GREEN = { x: 524, y: 216 };
const BUS_B = { x: 430, y: 118 };
const BUS_G = { x: 430, y: 188 };
const OP = { x: 232, y: 150 };

function happyPath(name: 'blue' | 'green'): Stage[] {
  const t = name === 'blue' ? BLUE : GREEN;
  const bus = name === 'blue' ? BUS_B : BUS_G;
  return [
    {
      ...t,
      label: 'start-run',
      tone: 'go',
      hi: 'none',
      caption: `${name} asks the operator to create a run (start-run).`,
    },
    { ...bus, label: 'start-run', tone: 'go', hi: 'none', caption: '…proxied over the transport.' },
    {
      ...OP,
      label: 'creating…',
      tone: 'go',
      hi: 'op',
      caption: `Operator creates run@${name}, stamped namespace=${name} · status pending.`,
    },
    {
      ...bus,
      label: 'dispatch',
      tone: 'go',
      hi: 'none',
      caption: `Operator dispatches it to ${name}'s queue (handler@${name}).`,
    },
    {
      ...t,
      label: 'running',
      tone: 'go',
      hi: name,
      caption: `${name} runs the step (store-less — it does the work).`,
    },
    {
      ...bus,
      label: 'reply',
      tone: 'go',
      hi: 'none',
      caption: `${name} replies with the result over the transport.`,
    },
    {
      ...OP,
      label: 'completed',
      tone: 'ok',
      hi: 'op',
      caption: `Operator records the result. run@${name} completed.`,
    },
  ];
}

const CROSS_TENANT: Stage[] = [
  {
    ...BLUE,
    label: 'read run@green',
    tone: 'deny',
    hi: 'none',
    caption: 'Blue asks to read a run that belongs to green.',
  },
  {
    ...BUS_B,
    label: 'read run@green',
    tone: 'deny',
    hi: 'none',
    caption: 'Request proxied to the operator.',
  },
  {
    ...OP,
    label: 'checking…',
    tone: 'deny',
    hi: 'op-deny',
    caption: 'Operator loads the run, sees namespace=green ≠ blue → rejects.',
  },
  {
    ...BUS_B,
    label: 'cross-tenant ✗',
    tone: 'deny',
    hi: 'none',
    caption: 'cross-tenant error returned — before any read runs.',
  },
  {
    ...BLUE,
    label: 'denied',
    tone: 'deny',
    hi: 'blue-deny',
    caption: 'A tenant only ever sees its own runs. Isolation holds.',
  },
];

function Node({
  x,
  y,
  w,
  h,
  title,
  rows,
  primary,
  highlight,
  tip,
  onTip,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  rows: string[];
  primary?: boolean;
  highlight: 'none' | 'go' | 'deny';
  tip: { title: string; body: string };
  onTip: (t: { ax: number; ay: number; title: string; body: string } | null) => void;
}) {
  const lit = highlight !== 'none';
  const ring = highlight === 'deny' ? RED : accent;
  const fill = highlight === 'deny' ? tintRed : highlight === 'go' ? tintAccent : neutral;
  const stroke = lit ? ring : border;
  const enter = () => onTip({ ax: x + w / 2, ay: y, title: tip.title, body: tip.body });
  const leave = () => onTip(null);
  return (
    <g
      className="tf-anim"
      style={{ cursor: 'help' }}
      tabIndex={0}
      role="img"
      aria-label={`${tip.title}. ${tip.body}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      {lit ? (
        <rect
          className="tf-ping"
          x={x - 5}
          y={y - 5}
          width={w + 10}
          height={h + 10}
          rx={16}
          style={{ fill: 'none', stroke: ring, strokeWidth: 2 }}
        />
      ) : null}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={13}
        className="tf-anim"
        style={{ fill, stroke, strokeWidth: lit || primary ? 1.5 : 1 }}
        filter="url(#tf-soft)"
      />
      {primary ? <rect x={x} y={y} width={4} height={h} rx={2} style={{ fill: accent }} /> : null}
      <text x={x + 17} y={y + 26} style={{ fill: ink, fontSize: 13.5, fontWeight: 600 }}>
        {title}
      </text>
      {rows.map((row, i) => (
        <text
          key={row}
          x={x + 17}
          y={y + 47 + i * 17}
          style={{ fill: muted, fontSize: 11, fontFamily: mono }}
        >
          {row}
        </text>
      ))}
    </g>
  );
}

/** A dashed wire with a chip-backed label so text never collides with the line or the bus. */
function Wire({
  x1,
  y1,
  x2,
  y2,
  label,
  lx,
  ly,
  tip,
  onTip,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  lx: number;
  ly: number;
  tip: { title: string; body: string };
  onTip: (t: { ax: number; ay: number; title: string; body: string } | null) => void;
}) {
  const w = label.length * 6.2 + 14;
  const enter = () => onTip({ ax: lx, ay: ly - 11, title: tip.title, body: tip.body });
  const leave = () => onTip(null);
  return (
    <g
      style={{ cursor: 'help' }}
      tabIndex={0}
      role="img"
      aria-label={`${tip.title}. ${tip.body}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        style={{ stroke: border, strokeWidth: 1.25 }}
        strokeDasharray="4 4"
      />
      <rect
        x={lx - w / 2}
        y={ly - 11}
        width={w}
        height={17}
        rx={8}
        style={{ fill: cardBg, stroke: border, strokeWidth: 0.75 }}
      />
      <text
        x={lx}
        y={ly + 1}
        textAnchor="middle"
        style={{ fill: muted, fontSize: 10, fontFamily: mono }}
      >
        {label}
      </text>
    </g>
  );
}

export function TenantFlow() {
  const [scenario, setScenario] = useState<Stage[]>([]);
  const [stage, setStage] = useState(-1);
  const [reduced, setReduced] = useState(false);
  const [tip, setTip] = useState<{ left: number; top: number; title: string; body: string } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Map an SVG-space anchor to a pixel position within the wrapper so the HTML tooltip stays crisp.
  function onTip(t: { ax: number; ay: number; title: string; body: string } | null) {
    if (!t) {
      setTip(null);
      return;
    }
    const svg = svgRef.current;
    const wrap = wrapRef.current;
    if (!svg || !wrap) return;
    const s = svg.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    setTip({
      left: (t.ax / 780) * s.width + (s.left - w.left),
      top: (t.ay / 300) * s.height + (s.top - w.top),
      title: t.title,
      body: t.body,
    });
  }

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (stage < 0 || stage >= scenario.length - 1) return;
    const id = setTimeout(() => setStage((s) => s + 1), reduced ? 380 : 780);
    return () => clearTimeout(id);
  }, [stage, scenario.length, reduced]);

  function run(s: Stage[]) {
    setScenario(s);
    setStage(0);
  }

  const active = stage >= 0 ? scenario[stage] : undefined;
  const hi = active?.hi ?? 'none';
  const opHi = hi === 'op' ? 'go' : hi === 'op-deny' ? 'deny' : 'none';
  const blueHi = hi === 'blue' ? 'go' : hi === 'blue-deny' ? 'deny' : 'none';
  const greenHi = hi === 'green' ? 'go' : 'none';
  const tone = active?.tone === 'deny' ? RED : active?.tone === 'ok' ? OK : accent;

  const pill = {
    font: 'inherit',
    fontSize: 12.5,
    lineHeight: 1,
    color: 'var(--color-fd-foreground)',
    background: 'var(--color-fd-card)',
    border: '1px solid var(--color-fd-border)',
    borderRadius: 9,
    padding: '7px 12px',
    cursor: 'pointer',
  } as const;

  return (
    <figure
      className="my-6 rounded-2xl border border-fd-border p-3 sm:p-4"
      style={{ background: tintAccentSoft }}
    >
      <style>{`
        .tf-anim { transition: opacity .3s ease, stroke .3s ease, stroke-width .3s ease, fill .3s ease; }
        .tf-token { transition: transform .68s cubic-bezier(.4,0,.2,1); }
        .tf-ping { animation: tf-ping 1.4s ease-out infinite; }
        @keyframes tf-ping { 0% { opacity: .5 } 70%, 100% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .tf-anim, .tf-token { transition: none } .tf-ping { animation: none; opacity: 0 } }
      `}</style>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 780 300"
          width="100%"
          role="img"
          aria-label="Interactive operator and tenants: a run travels the transport, and cross-tenant reads are rejected"
        >
          <title>
            A control-plane operator and two tenant workers wired over the transport. Enqueue a run
            to watch start-run, dispatch and reply travel between a tenant and the operator; or read
            another tenant's run to see the operator reject it with a cross-tenant error.
          </title>
          <defs>
            <filter id="tf-soft" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.10" />
            </filter>
            <filter id="tf-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={tone} floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Transport bus. */}
          <g
            style={{ cursor: 'help' }}
            tabIndex={0}
            role="img"
            aria-label="Transport — the broker every tenant-operator message travels over"
            onMouseEnter={() =>
              onTip({
                ax: 400,
                ay: 60,
                title: 'Transport',
                body: 'The broker (Redis, or your DB). Every tenant↔operator message travels here — a tenant never touches the store directly.',
              })
            }
            onMouseLeave={() => onTip(null)}
            onFocus={() =>
              onTip({
                ax: 400,
                ay: 60,
                title: 'Transport',
                body: 'The broker (Redis, or your DB). Every tenant↔operator message travels here — a tenant never touches the store directly.',
              })
            }
            onBlur={() => onTip(null)}
          >
            <rect
              x={356}
              y={60}
              width={88}
              height={180}
              rx={44}
              style={{ fill: tintAccent, stroke: border, strokeWidth: 1 }}
              filter="url(#tf-soft)"
            />
            <text
              x={400}
              y={146}
              textAnchor="middle"
              style={{ fill: ink, fontSize: 12.5, fontWeight: 600 }}
            >
              Transport
            </text>
            <text
              x={400}
              y={163}
              textAnchor="middle"
              style={{ fill: muted, fontSize: 10.5, fontFamily: mono }}
            >
              (Redis)
            </text>
          </g>

          {/* Wires with chip labels. */}
          <Wire
            x1={232}
            y1={150}
            x2={356}
            y2={150}
            label="control + reads"
            lx={294}
            ly={133}
            onTip={onTip}
            tip={{
              title: 'Reads & control',
              body: 'getRunDetail, listRuns, cancel, retry… proxied to the operator and answered on a correlated reply.',
            }}
          />
          <Wire
            x1={444}
            y1={110}
            x2={524}
            y2={88}
            label="run@blue"
            lx={486}
            ly={92}
            onTip={onTip}
            tip={{
              title: 'run@blue channel',
              body: 'blue’s run lifecycle rides here: start-run out, dispatch back to handler@blue, reply out.',
            }}
          />
          <Wire
            x1={444}
            y1={200}
            x2={524}
            y2={216}
            label="run@green"
            lx={486}
            ly={212}
            onTip={onTip}
            tip={{
              title: 'run@green channel',
              body: 'green’s run lifecycle rides here: start-run out, dispatch back to handler@green, reply out.',
            }}
          />

          {/* Nodes. */}
          <Node
            x={20}
            y={86}
            w={212}
            h={128}
            primary
            highlight={opHi}
            title="Control plane · operator"
            rows={[
              'engine · store · dashboard',
              'namespace: — (drives all)',
              'sees every tenant’s runs',
            ]}
            onTip={onTip}
            tip={{
              title: 'Operator (control plane)',
              body: 'Owns the store + dashboard and drives runs of every namespace. Its own namespace is unset, so it sees all tenants.',
            }}
          />
          <Node
            x={524}
            y={40}
            w={232}
            h={96}
            highlight={blueHi}
            title="Tenant · blue"
            rows={['DURABLE_TENANT=blue · no store', 'handler@blue · ProxyRunGateway']}
            onTip={onTip}
            tip={{
              title: 'Tenant · blue',
              body: 'A store-less worker. DURABLE_TENANT=blue → queues suffixed handler@blue, runs stamped blue, reads/control proxied to the operator.',
            }}
          />
          <Node
            x={524}
            y={168}
            w={232}
            h={96}
            highlight={greenHi}
            title="Tenant · green"
            rows={['DURABLE_TENANT=green · no store', 'handler@green · ProxyRunGateway']}
            onTip={onTip}
            tip={{
              title: 'Tenant · green',
              body: 'A store-less worker. DURABLE_TENANT=green → queues suffixed handler@green, runs stamped green, reads/control proxied to the operator.',
            }}
          />

          {/* Travelling token with a glow and a label chip. The chip sits opposite the nearest node
            (right of the operator, left of a tenant, above the bus) so it never covers a node. */}
          {active
            ? (() => {
                const lw = active.label.length * 6.3 + 18;
                const dir = active.x < 330 ? 1 : active.x > 470 ? -1 : 0;
                const chipX = dir === 0 ? -lw / 2 : dir > 0 ? 18 : -18 - lw;
                const chipY = dir === 0 ? -36 : -10;
                const textX = dir === 0 ? 0 : dir > 0 ? 18 + lw / 2 : -18 - lw / 2;
                return (
                  <g
                    className="tf-token"
                    style={{ transform: `translate(${active.x}px, ${active.y}px)` }}
                  >
                    {active.label ? (
                      <g>
                        <rect
                          x={chipX}
                          y={chipY}
                          width={lw}
                          height={20}
                          rx={10}
                          style={{ fill: cardBg, stroke: tone, strokeWidth: 1 }}
                        />
                        <text
                          x={textX}
                          y={chipY + 14}
                          textAnchor="middle"
                          style={{ fill: tone, fontSize: 10.5, fontFamily: mono }}
                        >
                          {active.label}
                        </text>
                      </g>
                    ) : null}
                    <circle
                      r={13}
                      filter="url(#tf-glow)"
                      style={{ fill: tone, stroke: cardBg, strokeWidth: 2.5 }}
                    />
                  </g>
                );
              })()
            : null}
        </svg>
        {tip ? (
          <div
            style={{
              position: 'absolute',
              left: tip.left,
              top: tip.top,
              transform: 'translate(-50%, calc(-100% - 12px))',
              width: 220,
              pointerEvents: 'none',
              zIndex: 5,
              background: 'var(--color-fd-card)',
              border: '1px solid var(--color-fd-border)',
              borderRadius: 10,
              padding: '8px 11px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--color-fd-foreground)',
                marginBottom: 3,
              }}
            >
              {tip.title}
            </div>
            <div
              style={{ fontSize: 11.5, lineHeight: 1.4, color: 'var(--color-fd-muted-foreground)' }}
            >
              {tip.body}
            </div>
          </div>
        ) : null}
      </div>

      {/* Controls. */}
      <div
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 }}
      >
        <button type="button" style={pill} onClick={() => run(happyPath('blue'))}>
          ▶ Enqueue run@blue
        </button>
        <button type="button" style={pill} onClick={() => run(happyPath('green'))}>
          ▶ Enqueue run@green
        </button>
        <button
          type="button"
          style={{ ...pill, borderColor: RED, color: RED }}
          onClick={() => run(CROSS_TENANT)}
        >
          ⚠ Blue reads green’s run
        </button>
        <button
          type="button"
          style={{ ...pill, marginLeft: 'auto' }}
          onClick={() => {
            setStage(-1);
            setScenario([]);
          }}
        >
          ⟲ Reset
        </button>
      </div>
      <figcaption
        className="mt-3 border-t border-fd-border px-1 pt-2.5 text-xs text-fd-muted-foreground"
        aria-live="polite"
        style={{ minHeight: 32 }}
      >
        {active?.caption ??
          'Enqueue a run to watch it travel the transport — or read another tenant’s run to see the isolation boundary reject it.'}
      </figcaption>
    </figure>
  );
}
