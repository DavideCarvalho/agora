'use client';

// Interactive checkpoint-and-replay illustration for the durability docs. Hand-authored SVG, no
// animation deps — plain React state + CSS transitions. Three column-aligned bands read top-to-bottom
// as time: first run → checkpoint store → replay after crash. Play/step/scrub walks logical time;
// the 💥 crash marker is draggable (and mirrored by the "Crash after" control) and reshapes what
// replay re-runs vs returns from a checkpoint.
//
// Degrades without JS: SSR renders the fully-resolved frame (a readable static diagram). Theme-aware
// via Fumadocs' `--color-fd-*` variables; respects `prefers-reduced-motion`.

import { useEffect, useMemo, useRef, useState } from 'react';

const ink = 'var(--color-fd-foreground)';
const muted = 'var(--color-fd-muted-foreground)';
const border = 'var(--color-fd-border)';
const accent = 'var(--color-fd-primary)';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const RED = '#e5484d';

// Layered surface tints — opaque over the card so they read on any theme.
const tintAccent = 'color-mix(in srgb, var(--color-fd-primary) 14%, var(--color-fd-card))';
const tintAccentSoft = 'color-mix(in srgb, var(--color-fd-primary) 7%, var(--color-fd-card))';
const neutral = 'color-mix(in srgb, var(--color-fd-foreground) 4%, var(--color-fd-card))';
const tintRed = 'color-mix(in srgb, #e5484d 12%, var(--color-fd-card))';
// Semantic success green — a WRITTEN checkpoint / a saved-output return must read as "safe" on any
// theme, independent of --color-fd-primary (accent-as-done could otherwise read as a failure).
const GREEN = '#30a46c';
const tintGreen = 'color-mix(in srgb, #30a46c 14%, var(--color-fd-card))';

const COLS = [188, 418, 648];
const CELL_W = 176;
const N = 3;
const STEPS = [
  { idx: 'step[0]', name: 'reserveStock' },
  { idx: 'step[1]', name: 'chargeCard' },
  { idx: 'step[2]', name: 'ship' },
];

// Vertical bands.
const FR_Y = 60;
const FR_H = 74;
const ST_Y = 170;
const ST_H = 46;
const RP_Y = 246;
const RP_H = 74;

// Snap x for the crash marker when `checkpointedCount` = C (0..N): just right of the last
// checkpointed step (or past the last column when C === N).
const BOUNDARY_X = [96, 303, 533, 748];

type Ev =
  | { kind: 'exec-first'; step: number }
  | { kind: 'crash' }
  | { kind: 'restart' }
  | { kind: 'return'; step: number }
  | { kind: 'exec-replay'; step: number };

function buildEvents(checkpointedCount: number): Ev[] {
  const ev: Ev[] = [];
  for (let i = 0; i < checkpointedCount; i++) ev.push({ kind: 'exec-first', step: i });
  ev.push({ kind: 'crash' });
  ev.push({ kind: 'restart' });
  for (let i = 0; i < N; i++) {
    ev.push(i < checkpointedCount ? { kind: 'return', step: i } : { kind: 'exec-replay', step: i });
  }
  return ev;
}

function caption(e: Ev | undefined): string {
  if (!e) return 'Ready — press play, drag the crash marker, or scrub the timeline.';
  switch (e.kind) {
    case 'exec-first':
      return `First run: execute ${STEPS[e.step].name} → write checkpoint seq:${e.step}.`;
    case 'crash':
      return 'Crash — the process dies mid-run.';
    case 'restart':
      return 'Engine restarts and resumes the run from the top.';
    case 'return':
      return `Replay: ${STEPS[e.step].name} has a completed checkpoint → return saved output (not re-run).`;
    case 'exec-replay':
      return `Replay: ${STEPS[e.step].name} has no checkpoint → execute for real.`;
  }
}

/** A step card (first-run or replay band). Fully presentational — the parent computes the look. */
function Card({
  cx,
  y,
  h,
  fill,
  stroke,
  dashed,
  opacity,
  glyph,
  glyphFill,
  title,
  titleFill,
  sub,
  tip,
  onTip,
}: {
  cx: number;
  y: number;
  h: number;
  fill: string;
  stroke: string;
  dashed: boolean;
  opacity: number;
  glyph: string;
  glyphFill: string;
  title: string;
  titleFill: string;
  sub: string;
  tip: { title: string; body: string };
  onTip: (t: { ax: number; ay: number; title: string; body: string } | null) => void;
}) {
  const x = cx - CELL_W / 2;
  const enter = () => onTip({ ax: cx, ay: y, title: tip.title, body: tip.body });
  const leave = () => onTip(null);
  return (
    <g
      className="rd-anim"
      style={{ opacity, cursor: 'help' }}
      tabIndex={0}
      role="img"
      aria-label={`${tip.title}. ${tip.body}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      <rect
        x={x}
        y={y}
        width={CELL_W}
        height={h}
        rx={13}
        className="rd-anim"
        style={{
          fill,
          stroke,
          strokeWidth: 1.25,
          strokeDasharray: dashed ? '5 4' : undefined,
        }}
        filter="url(#rd-soft)"
      />
      <text x={x + 15} y={y + 23} style={{ fill: glyphFill, fontSize: 13 }}>
        {glyph}
      </text>
      <text
        x={cx + 8}
        y={y + h / 2 - 1}
        textAnchor="middle"
        className="rd-anim"
        style={{ fill: titleFill, fontSize: 13, fontWeight: 600 }}
      >
        {title}
      </text>
      <text
        x={cx + 8}
        y={y + h / 2 + 17}
        textAnchor="middle"
        style={{ fill: muted, fontSize: 10.5, fontFamily: mono }}
      >
        {sub}
      </text>
    </g>
  );
}

/** A checkpoint pill in the store tape. */
function Pill({
  cx,
  filled,
  seq,
  onTip,
}: {
  cx: number;
  filled: boolean;
  seq: number;
  onTip: (t: { ax: number; ay: number; title: string; body: string } | null) => void;
}) {
  const w = 158;
  const x = cx - w / 2;
  const tip = filled
    ? {
        title: `Checkpoint seq:${seq}`,
        body: 'Completed — the step’s saved output. On replay it is returned instead of re-running the step.',
      }
    : {
        title: `seq:${seq} · no checkpoint`,
        body: 'Nothing saved here, so replay must execute this step for real.',
      };
  const enter = () => onTip({ ax: cx, ay: ST_Y, title: tip.title, body: tip.body });
  const leave = () => onTip(null);
  return (
    <g
      className="rd-anim"
      style={{ cursor: 'help' }}
      tabIndex={0}
      role="img"
      aria-label={`${tip.title}. ${tip.body}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={leave}
    >
      <rect
        x={x}
        y={ST_Y}
        width={w}
        height={ST_H}
        rx={ST_H / 2}
        className="rd-anim"
        style={{
          fill: filled ? tintGreen : neutral,
          stroke: filled ? GREEN : border,
          strokeWidth: 1.25,
          strokeDasharray: filled ? undefined : '5 4',
        }}
      />
      <text
        x={x + 20}
        y={ST_Y + ST_H / 2 + 4}
        className="rd-anim"
        style={{ fill: filled ? GREEN : muted, fontSize: 13 }}
      >
        {filled ? '✓' : '○'}
      </text>
      <text
        x={cx + 12}
        y={ST_Y + ST_H / 2 - 2}
        textAnchor="middle"
        className="rd-anim"
        style={{ fill: filled ? ink : muted, fontSize: 11, fontWeight: 600, fontFamily: mono }}
      >
        seq:{seq}
      </text>
      <text
        x={cx + 12}
        y={ST_Y + ST_H / 2 + 13}
        textAnchor="middle"
        style={{ fill: muted, fontSize: 9.5, fontFamily: mono }}
      >
        {filled ? 'saved output' : 'empty'}
      </text>
    </g>
  );
}

/** A short vertical connector; arrowhead at (cx, y2). `flow` animates it as the active beat. */
function VArrow({
  cx,
  y1,
  y2,
  label,
  shown,
  flow,
}: {
  cx: number;
  y1: number;
  y2: number;
  label?: string;
  shown: boolean;
  flow: boolean;
}) {
  return (
    <g className="rd-anim" style={{ opacity: shown ? 1 : 0.12 }}>
      <line
        x1={cx}
        y1={y1}
        x2={cx}
        y2={y2}
        className={flow ? 'rd-flow' : undefined}
        style={{ stroke: flow ? accent : muted, strokeWidth: 1.5 }}
        markerEnd={flow ? 'url(#rd-arrow-on)' : 'url(#rd-arrow)'}
      />
      {label ? (
        <text
          x={cx - 10}
          y={(y1 + y2) / 2 + 3}
          textAnchor="end"
          style={{ fill: muted, fontSize: 9.5, fontFamily: mono }}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

export function ReplayDiagram() {
  const [checkpointed, setCheckpointed] = useState(2);
  const [t, setT] = useState(999); // clamped below → SSR/first paint shows the resolved frame
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [tip, setTip] = useState<{ left: number; top: number; title: string; body: string } | null>(
    null,
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Map an SVG-space anchor to a pixel position within the wrapper so the HTML tooltip stays crisp
  // (it doesn't scale with the SVG) and sits centred just above the hovered element.
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
      left: (t.ax / 800) * s.width + (s.left - w.left),
      top: (t.ay / 340) * s.height + (s.top - w.top),
      title: t.title,
      body: t.body,
    });
  }

  const events = useMemo(() => buildEvents(checkpointed), [checkpointed]);
  const tc = Math.min(t, events.length);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (tc >= events.length) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setT((v) => Math.min(events.length, v + 1)), reduced ? 320 : 900);
    return () => clearTimeout(id);
  }, [playing, tc, events.length, reduced]);

  // Changing the crash point jumps to the resolved outcome so the effect is visible at once;
  // press Reset/Play to watch it build up from the start.
  function resetTo(count: number) {
    setCheckpointed(count);
    setT(999);
    setPlaying(false);
  }

  function dragCrash(clientX: number) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 800;
    let best = 0;
    let bestD = Number.POSITIVE_INFINITY;
    for (let c = 0; c <= N; c++) {
      const d = Math.abs(BOUNDARY_X[c] - x);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best !== checkpointed) resetTo(best);
  }

  function onHandleDown(e: React.PointerEvent) {
    e.preventDefault();
    const move = (ev: PointerEvent) => dragCrash(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function onHandleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      resetTo(Math.min(N, checkpointed + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      resetTo(Math.max(0, checkpointed - 1));
    }
  }

  const applied = events.slice(0, tc);
  const has = (pred: (e: Ev) => boolean) => applied.some(pred);
  const firstDone = (i: number) => has((e) => e.kind === 'exec-first' && e.step === i);
  const returned = (i: number) => has((e) => e.kind === 'return' && e.step === i);
  const replayed = (i: number) => has((e) => e.kind === 'exec-replay' && e.step === i);
  const storeFilled = (i: number) => firstDone(i) || replayed(i);
  const crashed = has((e) => e.kind === 'crash');
  const restarted = has((e) => e.kind === 'restart');
  const phase: 'first' | 'crash' | 'replay' = !crashed ? 'first' : !restarted ? 'crash' : 'replay';
  const current = tc > 0 ? events[tc - 1] : undefined;
  const crashX = BOUNDARY_X[checkpointed];

  const btn = {
    font: 'inherit',
    fontSize: 13,
    lineHeight: 1,
    color: 'var(--color-fd-foreground)',
    background: 'transparent',
    border: 'none',
    borderRadius: 7,
    padding: '7px 10px',
    cursor: 'pointer',
  } as const;
  const group = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    background: 'var(--color-fd-card)',
    border: '1px solid var(--color-fd-border)',
    borderRadius: 9,
    padding: 2,
  } as const;

  return (
    <figure
      className="my-6 rounded-2xl border border-fd-border p-3 sm:p-4"
      style={{ background: tintAccentSoft }}
    >
      <style>{`
        .rd-anim { transition: opacity .4s ease, fill .4s ease, stroke .4s ease; }
        .rd-ping { animation: rd-ping 1.1s ease-out forwards; }
        @keyframes rd-ping { 0% { opacity: .55 } 70%, 100% { opacity: 0 } }
        .rd-flow { stroke-dasharray: 5 4; animation: rd-flow .6s linear infinite; }
        @keyframes rd-flow { to { stroke-dashoffset: -18 } }
        .rd-seg { font: inherit; font-size: 12px; color: var(--color-fd-muted-foreground); background: transparent; border: none; border-radius: 6px; padding: 5px 9px; cursor: pointer; }
        .rd-seg[data-on="true"] { color: var(--color-fd-primary-foreground); background: var(--color-fd-primary); }
        @media (prefers-reduced-motion: reduce) { .rd-anim { transition: none } .rd-ping, .rd-flow { animation: none } .rd-ping { opacity: 0 } }
      `}</style>

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <svg
          ref={svgRef}
          viewBox="0 0 800 340"
          width="100%"
          role="img"
          aria-label="Interactive checkpoint and deterministic replay across a crash"
        >
          <title>
            The first run executes each step and writes a checkpoint; after a crash, replay returns
            the saved output for completed checkpoints and executes only the step that has none.
            Drag the crash marker to change how many checkpoints exist before the crash.
          </title>
          <defs>
            <marker
              id="rd-arrow"
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: muted }} />
            </marker>
            <marker
              id="rd-arrow-on"
              viewBox="0 0 10 10"
              refX={8}
              refY={5}
              markerWidth={6}
              markerHeight={6}
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: accent }} />
            </marker>
            <filter id="rd-soft" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity="0.10" />
            </filter>
          </defs>

          {/* Column headers. */}
          {STEPS.map((step, i) => (
            <g key={step.idx}>
              <text
                x={COLS[i]}
                y={30}
                textAnchor="middle"
                style={{ fill: ink, fontSize: 12, fontWeight: 700 }}
              >
                {step.idx}
              </text>
              <text
                x={COLS[i]}
                y={45}
                textAnchor="middle"
                style={{ fill: muted, fontSize: 11, fontFamily: mono }}
              >
                {step.name}
              </text>
            </g>
          ))}

          {/* Left rail labels. */}
          <text
            x={14}
            y={FR_Y + FR_H / 2 - 5}
            style={{ fill: muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}
          >
            FIRST
          </text>
          <text
            x={14}
            y={FR_Y + FR_H / 2 + 9}
            style={{ fill: muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}
          >
            RUN
          </text>
          <text
            x={14}
            y={ST_Y + ST_H / 2 + 3}
            style={{ fill: muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}
          >
            STORE
          </text>
          <text
            x={14}
            y={RP_Y + RP_H / 2 - 5}
            style={{ fill: muted, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}
          >
            REPLAY
          </text>
          <text
            x={14}
            y={RP_Y + RP_H / 2 + 9}
            style={{ fill: muted, fontSize: 9, fontFamily: mono }}
          >
            on crash
          </text>

          {/* First-run band. */}
          <g className="rd-anim" style={{ opacity: phase === 'replay' ? 0.55 : 1 }}>
            {STEPS.map((step, i) => {
              if (i >= checkpointed) {
                return (
                  <Card
                    key={`fr-${step.idx}`}
                    cx={COLS[i]}
                    y={FR_Y}
                    h={FR_H}
                    fill={tintRed}
                    stroke={border}
                    dashed
                    opacity={0.75}
                    glyph="✕"
                    glyphFill={RED}
                    title="not reached"
                    titleFill={muted}
                    sub="crash was earlier"
                    onTip={onTip}
                    tip={{
                      title: `${step.idx} · not reached`,
                      body: 'The crash happened before this step ran, so it never wrote a checkpoint.',
                    }}
                  />
                );
              }
              const on = firstDone(i);
              return (
                <Card
                  key={`fr-${step.idx}`}
                  cx={COLS[i]}
                  y={FR_Y}
                  h={FR_H}
                  fill={on ? tintAccent : neutral}
                  stroke={on ? accent : border}
                  dashed={!on}
                  opacity={on ? 1 : 0.6}
                  glyph={on ? '▸' : '○'}
                  glyphFill={on ? accent : muted}
                  title="execute"
                  titleFill={on ? ink : muted}
                  sub="→ checkpoint"
                  onTip={onTip}
                  tip={{
                    title: `${step.idx} · first run`,
                    body: `${step.name} runs and writes its result to the store as checkpoint seq:${i}.`,
                  }}
                />
              );
            })}
          </g>

          {/* Store tape. */}
          {STEPS.map((step, i) => (
            <Pill
              key={`slot-${step.idx}`}
              cx={COLS[i]}
              filled={storeFilled(i)}
              seq={i}
              onTip={onTip}
            />
          ))}

          {/* Replay band. */}
          <g className="rd-anim" style={{ opacity: phase === 'first' ? 0.4 : 1 }}>
            {STEPS.map((step, i) => {
              if (i < checkpointed) {
                const on = returned(i);
                return (
                  <Card
                    key={`rp-${step.idx}`}
                    cx={COLS[i]}
                    y={RP_Y}
                    h={RP_H}
                    fill={neutral}
                    stroke={border}
                    dashed
                    opacity={on ? 0.92 : 0.5}
                    glyph="↩"
                    glyphFill={on ? GREEN : muted}
                    title="return saved"
                    titleFill={muted}
                    sub="not re-run"
                    onTip={onTip}
                    tip={{
                      title: `${step.idx} · replay`,
                      body: 'A completed checkpoint exists, so the saved output is returned. The step body does not run again.',
                    }}
                  />
                );
              }
              const on = replayed(i);
              return (
                <Card
                  key={`rp-${step.idx}`}
                  cx={COLS[i]}
                  y={RP_Y}
                  h={RP_H}
                  fill={on ? tintAccent : neutral}
                  stroke={on ? accent : border}
                  dashed={!on}
                  opacity={on ? 1 : 0.6}
                  glyph={on ? '▸' : '○'}
                  glyphFill={on ? accent : muted}
                  title="execute for real"
                  titleFill={on ? ink : muted}
                  sub="no checkpoint"
                  onTip={onTip}
                  tip={{
                    title: `${step.idx} · replay`,
                    body: `No checkpoint here, so ${step.name} executes for real now and writes seq:${i}.`,
                  }}
                />
              );
            })}
          </g>

          {/* Data-flow arrows. */}
          {STEPS.map((step, i) =>
            i < checkpointed ? (
              <g key={`arr-${step.idx}`}>
                <VArrow
                  cx={COLS[i]}
                  y1={FR_Y + FR_H}
                  y2={ST_Y}
                  label={i === 0 ? 'write' : undefined}
                  shown={firstDone(i)}
                  flow={current?.kind === 'exec-first' && current.step === i}
                />
                <VArrow
                  cx={COLS[i]}
                  y1={ST_Y + ST_H}
                  y2={RP_Y}
                  label={i === 0 ? 'return' : undefined}
                  shown={returned(i)}
                  flow={current?.kind === 'return' && current.step === i}
                />
              </g>
            ) : (
              <VArrow
                key={`arr-${step.idx}`}
                cx={COLS[i]}
                y1={RP_Y}
                y2={ST_Y + ST_H}
                shown={replayed(i)}
                flow={current?.kind === 'exec-replay' && current.step === i}
              />
            ),
          )}

          {/* Ping ring on the step the current beat executed. */}
          {current && (current.kind === 'exec-first' || current.kind === 'exec-replay') ? (
            <rect
              key={`ping-${tc}`}
              className="rd-ping"
              x={COLS[current.step] - CELL_W / 2 - 3}
              y={(current.kind === 'exec-first' ? FR_Y : RP_Y) - 3}
              width={CELL_W + 6}
              height={(current.kind === 'exec-first' ? FR_H : RP_H) + 6}
              rx={16}
              style={{ fill: 'none', stroke: accent, strokeWidth: 2 }}
            />
          ) : null}

          {/* Draggable crash marker: fault line across the first-run band + a grabbable handle. */}
          <g
            role="slider"
            tabIndex={0}
            aria-label="Crash point — number of checkpoints written before the crash"
            aria-valuemin={0}
            aria-valuemax={N}
            aria-valuenow={checkpointed}
            onPointerDown={onHandleDown}
            onKeyDown={onHandleKey}
            onMouseEnter={() =>
              onTip({
                ax: crashX,
                ay: FR_Y - 32,
                title: 'Crash point — drag me',
                body: 'Choose when the process dies. Only steps checkpointed before the crash are skipped on replay; the rest re-run.',
              })
            }
            onMouseLeave={() => onTip(null)}
            onFocus={() =>
              onTip({
                ax: crashX,
                ay: FR_Y - 32,
                title: 'Crash point — arrow keys move me',
                body: 'Choose when the process dies. Only steps checkpointed before the crash are skipped on replay; the rest re-run.',
              })
            }
            onBlur={() => onTip(null)}
            style={{ cursor: 'ew-resize', outline: 'none' }}
            className="rd-anim"
          >
            {/* Jagged lightning fault line — a vector rupture, no emoji. */}
            <path
              d={`M ${crashX} ${FR_Y - 6} L ${crashX - 5} ${FR_Y + 12} L ${crashX + 5} ${FR_Y + 30} L ${crashX - 5} ${FR_Y + 48} L ${crashX + 5} ${FR_Y + 62} L ${crashX} ${FR_Y + FR_H + 6}`}
              className="rd-anim"
              style={{
                fill: 'none',
                stroke: RED,
                strokeWidth: 2,
                strokeLinejoin: 'round',
                strokeLinecap: 'round',
                opacity: phase === 'crash' ? 1 : 0.85,
              }}
            />
            {/* Handle tab: a drawn lightning bolt + label. */}
            <rect
              x={crashX - 35}
              y={FR_Y - 32}
              width={70}
              height={23}
              rx={7}
              className="rd-anim"
              style={{ fill: tintRed, stroke: RED, strokeWidth: 1.25 }}
            />
            <path
              d={`M ${crashX - 17} ${FR_Y - 27} L ${crashX - 24} ${FR_Y - 19} L ${crashX - 20} ${FR_Y - 19} L ${crashX - 23} ${FR_Y - 13} L ${crashX - 14} ${FR_Y - 22} L ${crashX - 18} ${FR_Y - 22} Z`}
              style={{ fill: RED }}
            />
            <text
              x={crashX + 6}
              y={FR_Y - 16}
              textAnchor="middle"
              style={{ fill: RED, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6 }}
            >
              crash
            </text>
            <rect
              x={crashX - 22}
              y={FR_Y - 34}
              width={44}
              height={FR_H + 48}
              style={{ fill: 'transparent' }}
            />
          </g>
        </svg>
        {tip ? (
          <div
            style={{
              position: 'absolute',
              left: tip.left,
              top: tip.top,
              transform: 'translate(-50%, calc(-100% - 12px))',
              width: 216,
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
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 14 }}
      >
        <div style={group}>
          <button
            type="button"
            style={btn}
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => {
              if (tc >= events.length) setT(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? '⏸' : '▶'} {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            style={btn}
            aria-label="Step forward"
            onClick={() => {
              setPlaying(false);
              setT((v) => Math.min(events.length, Math.min(v, events.length) + 1));
            }}
          >
            ⏭
          </button>
          <button
            type="button"
            style={btn}
            aria-label="Reset"
            onClick={() => {
              setPlaying(false);
              setT(0);
            }}
          >
            ⟲
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={events.length}
          value={tc}
          aria-label="Scrub logical time"
          onChange={(e) => {
            setPlaying(false);
            setT(Number(e.target.value));
          }}
          style={{ flex: '1 1 120px', minWidth: 110, accentColor: 'var(--color-fd-primary)' }}
        />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--color-fd-muted-foreground)' }}>
            Crash after
          </span>
          <div style={group}>
            {['0', '1', '2', '3'].map((n, c) => (
              <button
                key={n}
                type="button"
                className="rd-seg"
                data-on={checkpointed === c}
                aria-pressed={checkpointed === c}
                onClick={() => resetTo(c)}
              >
                {c === 0 ? 'none' : n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <figcaption
        className="mt-3 border-t border-fd-border px-1 pt-2.5 text-xs text-fd-muted-foreground"
        aria-live="polite"
        style={{ minHeight: 32 }}
      >
        {caption(current)}
      </figcaption>
    </figure>
  );
}
