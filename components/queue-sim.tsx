'use client';

// Ambient, Encore-style live simulations for the durable docs. Canvas + rAF (many
// moving dots — CSS transitions don't fit), theme-aware by sampling the Fumadocs CSS
// variables (re-sampled when the `dark` class flips), paused when offscreen and under
// `prefers-reduced-motion` (which renders a representative static frame instead).
//
// Shared visual language: dots swoop along gentle arcs with a fading trail and a soft
// glow; queued work is amber-tinted when it has waited; success is ALWAYS green
// (completion pulses), failure red — the theme accent only ever means "active".

import { useEffect, useRef, useState } from 'react';

export const SIM_GREEN = '#30a46c';
export const SIM_AMBER = '#f5a524';
export const SIM_RED = '#e5484d';

export const SIM_W = 920;

export type SimTheme = {
  ink: string;
  muted: string;
  accent: string;
  border: string;
  card: string;
};

export function sampleTheme(el: HTMLElement): SimTheme {
  const cs = getComputedStyle(el);
  const read = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback;
  return {
    ink: read('--color-fd-foreground', '#111'),
    muted: read('--color-fd-muted-foreground', '#777'),
    accent: read('--color-fd-primary', '#30a46c'),
    border: read('--color-fd-border', '#ccc'),
    card: read('--color-fd-card', '#fff'),
  };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Position along a gentle quadratic arc from (x0,y0) to (x1,y1); `bend` bows it up (-) or down (+). */
export function arcPos(x0: number, y0: number, x1: number, y1: number, t: number, bend: number): { x: number; y: number } {
  const k = easeInOut(t);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2 + bend;
  const u = 1 - k;
  return {
    x: u * u * x0 + 2 * u * k * cx + k * k * x1,
    y: u * u * y0 + 2 * u * k * cy + k * k * y1,
  };
}

export type Trail = { x: number; y: number }[];

export function pushTrail(trail: Trail, x: number, y: number) {
  trail.push({ x, y });
  if (trail.length > 7) trail.shift();
}

export function drawDot(
  ctx2d: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  trail?: Trail,
  glow = false,
) {
  if (trail) {
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i];
      if (!p) continue;
      const a = ((i + 1) / trail.length) * 0.22;
      ctx2d.globalAlpha = a;
      ctx2d.fillStyle = color;
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, r * (0.35 + (0.5 * (i + 1)) / trail.length), 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  }
  if (glow) {
    ctx2d.shadowColor = color;
    ctx2d.shadowBlur = 12;
  }
  ctx2d.fillStyle = color;
  ctx2d.beginPath();
  ctx2d.arc(x, y, r, 0, Math.PI * 2);
  ctx2d.fill();
  ctx2d.shadowBlur = 0;
}

export type Pulse = { x: number; y: number; t: number; color: string };

export function drawPulses(ctx2d: CanvasRenderingContext2D, pulses: Pulse[], dt: number) {
  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    if (!p) continue;
    p.t += 2.2 * dt;
    if (p.t >= 1) {
      pulses.splice(i, 1);
      continue;
    }
    ctx2d.globalAlpha = (1 - p.t) * 0.5;
    ctx2d.strokeStyle = p.color;
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, 10 + p.t * 20, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.globalAlpha = 1;
    ctx2d.lineWidth = 1;
  }
}

/** Card-styled node box with a title and subtitle rows. */
export function drawBox(
  ctx2d: CanvasRenderingContext2D,
  theme: SimTheme,
  x: number,
  y: number,
  w: number,
  h: number,
  stroke: string,
  lineWidth = 1,
) {
  ctx2d.fillStyle = theme.card;
  ctx2d.strokeStyle = stroke;
  ctx2d.lineWidth = lineWidth;
  ctx2d.beginPath();
  ctx2d.roundRect(x, y, w, h, 12);
  ctx2d.fill();
  ctx2d.stroke();
  ctx2d.lineWidth = 1;
}

export function useSimCanvas(height: number) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return { wrapRef, canvasRef, height };
}

export const simBtn = {
  padding: '5px 12px',
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid var(--color-fd-border)',
  background: 'var(--color-fd-card)',
  color: 'var(--color-fd-foreground)',
  cursor: 'pointer',
};

export function SimFigure({
  height,
  wrapRef,
  canvasRef,
  ariaLabel,
  controls,
  caption,
}: {
  height: number;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  ariaLabel: string;
  controls: React.ReactNode;
  caption: React.ReactNode;
}) {
  return (
    <figure
      ref={wrapRef}
      className="my-6 rounded-2xl border border-fd-border p-3 sm:p-4"
      style={{ background: 'color-mix(in srgb, var(--color-fd-primary) 7%, var(--color-fd-card))' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', maxWidth: SIM_W, display: 'block', margin: '0 auto', aspectRatio: `${SIM_W} / ${height}` }}
        role="img"
        aria-label={ariaLabel}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 10, fontSize: 12.5, color: 'var(--color-fd-muted-foreground)' }}>
        {controls}
      </div>
      <figcaption style={{ marginTop: 8, fontSize: 12.5, color: 'var(--color-fd-muted-foreground)', lineHeight: 1.5 }}>
        {caption}
      </figcaption>
    </figure>
  );
}

/** Boilerplate every sim shares: theme sampling, offscreen pause, reduced-motion, dpr scaling. */
export function setupSim(
  canvas: HTMLCanvasElement,
  wrap: HTMLElement,
  height: number,
): {
  ctx2d: CanvasRenderingContext2D | null;
  themeRef: { current: SimTheme };
  visibleRef: { current: boolean };
  reduced: boolean;
  dpr: number;
  cleanup: () => void;
} {
  const ctx2d = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeRef = { current: sampleTheme(wrap) };
  const themeObserver = new MutationObserver(() => {
    themeRef.current = sampleTheme(wrap);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const visibleRef = { current: true };
  const io = new IntersectionObserver((entries) => {
    visibleRef.current = entries[0]?.isIntersecting ?? true;
  });
  io.observe(wrap);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = SIM_W * dpr;
  canvas.height = height * dpr;
  return {
    ctx2d,
    themeRef,
    visibleRef,
    reduced,
    dpr,
    cleanup: () => {
      io.disconnect();
      themeObserver.disconnect();
    },
  };
}

// ── QueueSim: durable queue + worker pool (flow-control) ─────────────────────

const Q_H = 260;
const PRODUCER = { x: 96, y: 130 };
const QUEUE = { x: 250, y: 96, w: 240, h: 68 };
const WORKERS_X = 610;
const DONE = { x: 812, y: 130 };

type QPhase = 'toQueue' | 'queued' | 'toWorker' | 'working' | 'toDone' | 'done';

type QDot = {
  phase: QPhase;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  t: number;
  speed: number;
  workMs: number;
  slot: number;
  bornAt: number;
  trail: Trail;
};

function slotPos(slot: number, concurrency: number): { x: number; y: number } {
  const gap = 52;
  const y0 = 130 - ((concurrency - 1) * gap) / 2;
  return { x: WORKERS_X, y: y0 + slot * gap };
}

function queueSlotPos(index: number): { x: number; y: number } {
  const perRow = 11;
  const row = Math.min(1, Math.floor(index / perRow));
  const col = index % perRow;
  return {
    x: QUEUE.x + QUEUE.w - 18 - col * 20,
    y: QUEUE.y + (row === 0 ? 22 : 46),
  };
}

export function QueueSim() {
  const { wrapRef, canvasRef } = useSimCanvas(Q_H);
  const [rate, setRate] = useState(3);
  const [concurrency, setConcurrency] = useState(2);
  const [paused, setPaused] = useState(false);
  const burstRef = useRef(0);
  const rateRef = useRef(rate);
  const concurrencyRef = useRef(concurrency);
  rateRef.current = rate;
  concurrencyRef.current = concurrency;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, Q_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const dots: QDot[] = [];
    const pulses: Pulse[] = [];
    let simMs = 0;
    let spawnCarry = 0;
    let doneCount = 0;
    let last = performance.now();
    let raf = 0;

    function spawn() {
      dots.push({
        phase: 'toQueue',
        x: PRODUCER.x + 36,
        y: PRODUCER.y,
        fromX: PRODUCER.x + 36,
        fromY: PRODUCER.y,
        targetX: 0,
        targetY: 0,
        t: 0,
        speed: 2.2,
        workMs: 500 + Math.random() * 700,
        slot: -1,
        bornAt: simMs,
        trail: [],
      });
    }

    function tick(now: number) {
      const dtMs = Math.min(64, now - last);
      last = now;
      if (!visibleRef.current || paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      simMs += dtMs;
      const dt = dtMs / 1000;

      spawnCarry += rateRef.current * dt;
      if (burstRef.current > 0) {
        const release = Math.min(burstRef.current, Math.max(1, Math.round(30 * dt)));
        burstRef.current -= release;
        for (let i = 0; i < release; i++) spawn();
      }
      while (spawnCarry >= 1) {
        spawnCarry -= 1;
        spawn();
      }

      const conc = concurrencyRef.current;
      const working = dots.filter((d) => d.phase === 'working' || d.phase === 'toWorker');
      const queuedDots = dots.filter((d) => d.phase === 'queued');
      const busySlots = new Set(working.map((d) => d.slot));
      for (const dot of queuedDots) {
        if (working.length >= conc) break;
        let free = -1;
        for (let sIdx = 0; sIdx < conc; sIdx++) {
          if (!busySlots.has(sIdx)) {
            free = sIdx;
            break;
          }
        }
        if (free < 0) break;
        busySlots.add(free);
        working.push(dot);
        const pos = slotPos(free, conc);
        dot.phase = 'toWorker';
        dot.slot = free;
        dot.fromX = dot.x;
        dot.fromY = dot.y;
        dot.targetX = pos.x;
        dot.targetY = pos.y;
        dot.t = 0;
        dot.speed = 2.4;
      }

      let queueIndex = 0;
      for (const dot of dots) {
        switch (dot.phase) {
          case 'toQueue': {
            const pos = queueSlotPos(Math.min(21, dots.filter((d) => d.phase === 'queued').length));
            dot.targetX = pos.x;
            dot.targetY = pos.y;
            dot.t += dot.speed * dt;
            if (dot.t >= 1) {
              dot.phase = 'queued';
              dot.x = dot.targetX;
              dot.y = dot.targetY;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, dot.targetX, dot.targetY, dot.t, -30);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'queued': {
            const pos = queueSlotPos(Math.min(21, queueIndex));
            queueIndex += 1;
            dot.x += (pos.x - dot.x) * Math.min(1, 10 * dt);
            dot.y += (pos.y - dot.y) * Math.min(1, 10 * dt);
            break;
          }
          case 'toWorker': {
            const pos = slotPos(dot.slot, Math.max(conc, dot.slot + 1));
            dot.targetX = pos.x;
            dot.targetY = pos.y;
            dot.t += dot.speed * dt;
            if (dot.t >= 1) {
              dot.phase = 'working';
              dot.x = dot.targetX;
              dot.y = dot.targetY;
              dot.t = 0;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, dot.targetX, dot.targetY, dot.t, 34);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'working': {
            dot.t += dtMs / dot.workMs;
            if (dot.t >= 1) {
              dot.phase = 'toDone';
              dot.fromX = dot.x;
              dot.fromY = dot.y;
              dot.targetX = DONE.x - 32;
              dot.targetY = DONE.y;
              dot.t = 0;
              dot.speed = 2.6;
            }
            break;
          }
          case 'toDone': {
            dot.t += dot.speed * dt;
            if (dot.t >= 1) {
              dot.phase = 'done';
              doneCount += 1;
              pulses.push({ x: DONE.x - 32, y: DONE.y, t: 0, color: SIM_GREEN });
            } else {
              const p = arcPos(dot.fromX, dot.fromY, dot.targetX, dot.targetY, dot.t, -30);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'done':
            break;
        }
      }
      for (let i = dots.length - 1; i >= 0; i--) if (dots[i]?.phase === 'done') dots.splice(i, 1);
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function draw(dt: number) {
      if (!ctx2d) return;
      const theme = themeRef.current;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, SIM_W, Q_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const conc = concurrencyRef.current;
      const queuedN = dots.filter((d) => d.phase === 'queued' || d.phase === 'toQueue').length;
      const inFlight = dots.filter((d) => d.phase === 'working' || d.phase === 'toWorker').length;

      // flow guides
      ctx2d.strokeStyle = theme.border;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(PRODUCER.x + 40, PRODUCER.y);
      ctx2d.lineTo(QUEUE.x - 8, PRODUCER.y);
      ctx2d.moveTo(QUEUE.x + QUEUE.w + 8, PRODUCER.y);
      ctx2d.lineTo(WORKERS_X - 40, PRODUCER.y);
      ctx2d.moveTo(WORKERS_X + 40, PRODUCER.y);
      ctx2d.lineTo(DONE.x - 34, PRODUCER.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // producer
      drawBox(ctx2d, theme, PRODUCER.x - 64, PRODUCER.y - 34, 100, 68, theme.border);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('runs', PRODUCER.x - 50, PRODUCER.y - 12);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('dispatch', PRODUCER.x - 50, PRODUCER.y + 6);
      ctx2d.fillText('ctx.step', PRODUCER.x - 50, PRODUCER.y + 22);

      // queue — the border warms up as the backlog grows, faint tint fill inside
      const pressure = Math.min(1, queuedN / 16);
      drawBox(ctx2d, theme, QUEUE.x, QUEUE.y, QUEUE.w, QUEUE.h, pressure > 0.5 ? SIM_AMBER : theme.border, 1 + pressure);
      ctx2d.globalAlpha = 0.05 + pressure * 0.06;
      ctx2d.fillStyle = pressure > 0.5 ? SIM_AMBER : theme.accent;
      ctx2d.beginPath();
      ctx2d.roundRect(QUEUE.x, QUEUE.y, QUEUE.w, QUEUE.h, 12);
      ctx2d.fill();
      ctx2d.globalAlpha = 1;
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`queue 'emails'`, QUEUE.x + 2, QUEUE.y - 8);
      ctx2d.fillStyle = queuedN > 8 ? SIM_AMBER : theme.muted;
      ctx2d.fillText(`${queuedN} waiting · zero compute`, QUEUE.x + 108, QUEUE.y - 8);

      // worker slots
      for (let sIdx = 0; sIdx < conc; sIdx++) {
        const pos = slotPos(sIdx, conc);
        const dot = dots.find((d) => d.phase === 'working' && d.slot === sIdx);
        ctx2d.fillStyle = theme.card;
        ctx2d.strokeStyle = dot ? theme.accent : theme.border;
        ctx2d.beginPath();
        ctx2d.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        if (dot) {
          ctx2d.globalAlpha = 0.12;
          ctx2d.fillStyle = theme.accent;
          ctx2d.beginPath();
          ctx2d.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.globalAlpha = 1;
          ctx2d.strokeStyle = theme.accent;
          ctx2d.lineWidth = 2.5;
          ctx2d.beginPath();
          ctx2d.arc(pos.x, pos.y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, dot.t));
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`workers ${inFlight}/${conc}`, WORKERS_X - 34, slotPos(conc - 1, conc).y + 42);

      // done pile
      drawBox(ctx2d, theme, DONE.x - 30, DONE.y - 34, 96, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), DONE.x - 14, DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('completed', DONE.x - 14, DONE.y + 22);

      drawPulses(ctx2d, pulses, dt);

      for (const dot of dots) {
        if (dot.phase === 'done') continue;
        const waitedMs = simMs - dot.bornAt;
        const moving = dot.phase === 'toQueue' || dot.phase === 'toWorker' || dot.phase === 'toDone';
        const color =
          dot.phase === 'queued' ? (waitedMs > 3200 ? SIM_AMBER : theme.accent) : dot.phase === 'toDone' ? SIM_GREEN : theme.accent;
        drawDot(ctx2d, dot.x, dot.y, dot.phase === 'working' ? 7 : 5.5, color, moving ? dot.trail : undefined, moving);
      }
    }

    if (reduced) {
      for (let i = 0; i < 5; i++) spawn();
      dots.forEach((d, i) => {
        const pos = queueSlotPos(i);
        d.phase = 'queued';
        d.x = pos.x;
        d.y = pos.y;
      });
      draw(0);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      sim.cleanup();
    };
  }, [paused, canvasRef, wrapRef]);

  return (
    <SimFigure
      height={Q_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: runs dispatch steps into a durable queue; the admission gate feeds a fixed pool of worker slots; a burst of arrivals queues up (zero compute) and drains at the configured concurrency."
      controls={
        <>
          <button type="button" style={simBtn} onClick={() => { burstRef.current += 14; }}>
            ⚡ burst +14
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            rate
            <input type="range" min={1} max={8} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: 90 }} />
            <span className="tnum" style={{ minWidth: 34 }}>{rate}/s</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            concurrency
            {[1, 2, 4].map((n) => (
              <button
                key={n}
                type="button"
                style={{
                  ...simBtn,
                  padding: '4px 10px',
                  borderColor: n === concurrency ? 'var(--color-fd-primary)' : 'var(--color-fd-border)',
                  color: n === concurrency ? 'var(--color-fd-foreground)' : 'var(--color-fd-muted-foreground)',
                }}
                onClick={() => setConcurrency(n)}
              >
                {n}
              </button>
            ))}
          </label>
          <button type="button" style={{ ...simBtn, marginLeft: 'auto' }} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </>
      }
      caption={
        <>
          Live model of durable admission: hit <b>burst</b> and watch the queue absorb the spike — every
          blocked run waits suspended (zero compute, amber when it has waited a while) and drains FIFO at
          whatever <b>concurrency</b> allows. Nothing is dropped, nothing melts.
        </>
      }
    />
  );
}

// ── SingletonSim: per-key mutex lanes (singleton workflows) ──────────────────

const KEYS = [
  { label: 'store:A', color: '#6e79d6' },
  { label: 'store:B', color: '#0ea5e9' },
  { label: 'store:C', color: '#d6409f' },
];

const S_H = 300;
const S_PRODUCER = { x: 96, y: 150 };
const LANE_Y = [72, 150, 228];
const SLOT_X = 600;
const S_DONE = { x: 812, y: 150 };

type SDot = {
  key: number;
  phase: 'toLane' | 'queued' | 'working' | 'toDone' | 'done';
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  workMs: number;
  trail: Trail;
};

export function SingletonSim() {
  const { wrapRef, canvasRef } = useSimCanvas(S_H);
  const [rate, setRate] = useState(2);
  const [paused, setPaused] = useState(false);
  const burstRef = useRef(0);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, S_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const dots: SDot[] = [];
    const pulses: Pulse[] = [];
    let spawnCarry = 0;
    let doneCount = 0;
    let last = performance.now();
    let raf = 0;

    function spawn(key: number) {
      dots.push({
        key,
        phase: 'toLane',
        x: S_PRODUCER.x + 36,
        y: S_PRODUCER.y,
        fromX: S_PRODUCER.x + 36,
        fromY: S_PRODUCER.y,
        t: 0,
        workMs: 900 + Math.random() * 900,
        trail: [],
      });
    }

    function laneQueuePos(key: number, index: number): { x: number; y: number } {
      return { x: SLOT_X - 46 - index * 19, y: LANE_Y[key] ?? 150 };
    }

    function tick(now: number) {
      const dtMs = Math.min(64, now - last);
      last = now;
      if (!visibleRef.current || paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = dtMs / 1000;

      spawnCarry += rateRef.current * dt;
      if (burstRef.current > 0) {
        const release = Math.min(burstRef.current, Math.max(1, Math.round(24 * dt)));
        burstRef.current -= release;
        for (let i = 0; i < release; i++) spawn(0);
      }
      while (spawnCarry >= 1) {
        spawnCarry -= 1;
        spawn(Math.floor(Math.random() * KEYS.length));
      }

      for (let key = 0; key < KEYS.length; key++) {
        const working = dots.some((d) => d.key === key && d.phase === 'working');
        if (working) continue;
        const next = dots.find((d) => d.key === key && d.phase === 'queued');
        if (next) {
          next.phase = 'working';
          next.x = SLOT_X;
          next.y = LANE_Y[key] ?? 150;
          next.t = 0;
          next.trail.length = 0;
        }
      }

      const perKeyIndex = [0, 0, 0];
      for (const dot of dots) {
        switch (dot.phase) {
          case 'toLane': {
            const idx = dots.filter((d) => d.key === dot.key && d.phase === 'queued').length;
            const pos = laneQueuePos(dot.key, Math.min(12, idx));
            dot.t += 2.2 * dt;
            if (dot.t >= 1) {
              dot.phase = 'queued';
              dot.x = pos.x;
              dot.y = pos.y;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, pos.x, pos.y, dot.t, dot.key === 1 ? -26 : 0);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'queued': {
            const pos = laneQueuePos(dot.key, Math.min(12, perKeyIndex[dot.key] ?? 0));
            perKeyIndex[dot.key] = (perKeyIndex[dot.key] ?? 0) + 1;
            dot.x += (pos.x - dot.x) * Math.min(1, 10 * dt);
            dot.y += (pos.y - dot.y) * Math.min(1, 10 * dt);
            break;
          }
          case 'working': {
            dot.t += dtMs / dot.workMs;
            if (dot.t >= 1) {
              dot.phase = 'toDone';
              dot.fromX = dot.x;
              dot.fromY = dot.y;
              dot.t = 0;
            }
            break;
          }
          case 'toDone': {
            dot.t += 2.6 * dt;
            if (dot.t >= 1) {
              dot.phase = 'done';
              doneCount += 1;
              pulses.push({ x: S_DONE.x - 32, y: S_DONE.y, t: 0, color: SIM_GREEN });
            } else {
              const p = arcPos(dot.fromX, dot.fromY, S_DONE.x - 32, S_DONE.y, dot.t, dot.key === 1 ? -26 : 0);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'done':
            break;
        }
      }
      for (let i = dots.length - 1; i >= 0; i--) if (dots[i]?.phase === 'done') dots.splice(i, 1);
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function draw(dt: number) {
      if (!ctx2d) return;
      const theme = themeRef.current;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, SIM_W, S_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

      drawBox(ctx2d, theme, S_PRODUCER.x - 64, S_PRODUCER.y - 34, 100, 68, theme.border);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('starts', S_PRODUCER.x - 50, S_PRODUCER.y - 10);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('sync-inventory', S_PRODUCER.x - 50, S_PRODUCER.y + 8);

      for (let key = 0; key < KEYS.length; key++) {
        const y = LANE_Y[key] ?? 150;
        const keyDef = KEYS[key];
        if (!keyDef) continue;
        ctx2d.strokeStyle = theme.border;
        ctx2d.setLineDash([3, 6]);
        ctx2d.beginPath();
        ctx2d.moveTo(S_PRODUCER.x + 40, S_PRODUCER.y);
        ctx2d.lineTo(230, y);
        ctx2d.lineTo(SLOT_X - 28, y);
        ctx2d.moveTo(SLOT_X + 28, y);
        ctx2d.lineTo(S_DONE.x - 36, S_DONE.y);
        ctx2d.stroke();
        ctx2d.setLineDash([]);

        const queuedN = dots.filter((d) => d.key === key && d.phase === 'queued').length;
        ctx2d.fillStyle = keyDef.color;
        ctx2d.fillText(keyDef.label, 236, y - 14);
        if (queuedN > 0) {
          ctx2d.fillStyle = queuedN > 5 ? SIM_AMBER : theme.muted;
          ctx2d.fillText(`${queuedN} gated`, 236 + 62, y - 14);
        }

        const dot = dots.find((d) => d.key === key && d.phase === 'working');
        ctx2d.fillStyle = theme.card;
        ctx2d.strokeStyle = dot ? keyDef.color : theme.border;
        ctx2d.beginPath();
        ctx2d.arc(SLOT_X, y, 16, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        if (dot) {
          ctx2d.globalAlpha = 0.12;
          ctx2d.fillStyle = keyDef.color;
          ctx2d.beginPath();
          ctx2d.arc(SLOT_X, y, 16, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.globalAlpha = 1;
          ctx2d.strokeStyle = keyDef.color;
          ctx2d.lineWidth = 2.5;
          ctx2d.beginPath();
          ctx2d.arc(SLOT_X, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, dot.t));
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('limit: 1 per key', SLOT_X - 40, (LANE_Y[2] ?? 228) + 40);

      drawBox(ctx2d, theme, S_DONE.x - 30, S_DONE.y - 34, 96, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), S_DONE.x - 14, S_DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('completed', S_DONE.x - 14, S_DONE.y + 22);

      drawPulses(ctx2d, pulses, dt);

      for (const dot of dots) {
        if (dot.phase === 'done') continue;
        const moving = dot.phase === 'toLane' || dot.phase === 'toDone';
        const color = dot.phase === 'toDone' ? SIM_GREEN : (KEYS[dot.key]?.color ?? theme.accent);
        ctx2d.globalAlpha = dot.phase === 'queued' ? 0.85 : 1;
        drawDot(ctx2d, dot.x, dot.y, dot.phase === 'working' ? 7 : 5.5, color, moving ? dot.trail : undefined, moving);
        ctx2d.globalAlpha = 1;
      }
    }

    if (reduced) {
      spawn(0);
      spawn(0);
      spawn(1);
      dots.forEach((d, i) => {
        d.phase = i === 0 ? 'working' : 'queued';
        const pos = i === 0 ? { x: SLOT_X, y: LANE_Y[0] ?? 72 } : laneQueuePos(d.key, i - 1);
        d.x = pos.x;
        d.y = pos.y;
      });
      draw(0);
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      sim.cleanup();
    };
  }, [paused, canvasRef, wrapRef]);

  return (
    <SimFigure
      height={S_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: starts for three singleton keys flow into per-key mutex lanes; same-key starts queue FIFO behind the in-flight run while other keys run in parallel."
      controls={
        <>
          <button type="button" style={{ ...simBtn, borderColor: KEYS[0]?.color }} onClick={() => { burstRef.current += 8; }}>
            ⚡ burst store:A +8
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            rate
            <input type="range" min={1} max={6} value={rate} onChange={(e) => setRate(Number(e.target.value))} style={{ width: 90 }} />
            <span className="tnum" style={{ minWidth: 34 }}>{rate}/s</span>
          </label>
          <button type="button" style={{ ...simBtn, marginLeft: 'auto' }} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </>
      }
      caption={
        <>
          Live model of <b>singleton</b> admission: each key owns one slot (a mutex). Burst <b>store:A</b> and
          only <b>its</b> lane backs up — gated starts wait suspended, FIFO, while store:B and store:C keep
          flowing. Different keys never contend.
        </>
      }
    />
  );
}
