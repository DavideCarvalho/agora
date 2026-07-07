'use client';

// Failure-path companions to the queue sims: RetrySim (a step failing transiently and
// backing off — visibly longer each attempt — while the run waits suspended) and DlqSim
// (a poison pill crash-looping through recovery until it's dead-lettered into a DLQ
// handler lane, while normal traffic keeps flowing around it).

import { useEffect, useRef, useState } from 'react';
import {
  arcPos,
  drawBox,
  drawDot,
  drawPulses,
  type Pulse,
  pushTrail,
  setupSim,
  SIM_AMBER,
  SIM_GREEN,
  SIM_RED,
  SIM_W,
  SimFigure,
  simBtn,
  type Trail,
  useSimCanvas,
} from './queue-sim';

// ── RetrySim ─────────────────────────────────────────────────────────────────
// One dot, on a loop: dispatch → worker fails (red flash) → the run suspends with a
// visible wakeAt countdown that DOUBLES each attempt (exp backoff) → re-dispatch →
// success on the 3rd try → done. Attempt marks (✗ ✗ ✓) accumulate above the worker.

const R_H = 230;
const R_RUN = { x: 120, y: 115 };
const R_WORKER = { x: 470, y: 115 };
const R_DONE = { x: 790, y: 115 };

type RPhase = 'toWorker' | 'working' | 'reject' | 'backoff' | 'toDone' | 'rest';

export function RetrySim() {
  const { wrapRef, canvasRef } = useSimCanvas(R_H);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, R_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const pulses: Pulse[] = [];
    const trail: Trail = [];
    let phase: RPhase = 'toWorker';
    let t = 0;
    let attempt = 1;
    const maxAttempts = 3;
    let outcomes: ('fail' | 'ok')[] = [];
    let backoffMs = 0;
    let backoffTotal = 0;
    let doneCount = 0;
    let workerFlash = 0;
    let x = R_RUN.x + 40;
    let y = R_RUN.y;
    let fromX = x;
    let fromY = y;
    let last = performance.now();
    let raf = 0;

    function reset() {
      phase = 'toWorker';
      t = 0;
      attempt = 1;
      outcomes = [];
      trail.length = 0;
      x = R_RUN.x + 40;
      y = R_RUN.y;
      fromX = x;
      fromY = y;
    }

    function tick(now: number) {
      const dtMs = Math.min(64, now - last) * speedRef.current;
      last = now;
      if (!visibleRef.current || paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = dtMs / 1000;
      workerFlash = Math.max(0, workerFlash - 2.5 * dt);

      switch (phase) {
        case 'toWorker': {
          t += 2.0 * dt;
          if (t >= 1) {
            phase = 'working';
            x = R_WORKER.x;
            y = R_WORKER.y;
            t = 0;
            trail.length = 0;
          } else {
            const p = arcPos(fromX, fromY, R_WORKER.x, R_WORKER.y, t, -36);
            pushTrail(trail, x, y);
            x = p.x;
            y = p.y;
          }
          break;
        }
        case 'working': {
          t += dtMs / 700;
          if (t >= 1) {
            if (attempt < maxAttempts) {
              outcomes.push('fail');
              workerFlash = 1;
              pulses.push({ x: R_WORKER.x, y: R_WORKER.y, t: 0, color: SIM_RED });
              phase = 'reject';
              fromX = x;
              fromY = y;
              t = 0;
            } else {
              outcomes.push('ok');
              pulses.push({ x: R_WORKER.x, y: R_WORKER.y, t: 0, color: SIM_GREEN });
              phase = 'toDone';
              fromX = x;
              fromY = y;
              t = 0;
            }
          }
          break;
        }
        case 'reject': {
          t += 2.0 * dt;
          if (t >= 1) {
            phase = 'backoff';
            x = R_RUN.x + 40;
            y = R_RUN.y;
            trail.length = 0;
            backoffTotal = 900 * 2 ** (attempt - 1); // 0.9s, 1.8s — scaled exp backoff
            backoffMs = backoffTotal;
            t = 0;
          } else {
            const p = arcPos(fromX, fromY, R_RUN.x + 40, R_RUN.y, t, 36);
            pushTrail(trail, x, y);
            x = p.x;
            y = p.y;
          }
          break;
        }
        case 'backoff': {
          backoffMs -= dtMs;
          if (backoffMs <= 0) {
            attempt += 1;
            phase = 'toWorker';
            fromX = x;
            fromY = y;
            t = 0;
          }
          break;
        }
        case 'toDone': {
          t += 2.2 * dt;
          if (t >= 1) {
            doneCount += 1;
            pulses.push({ x: R_DONE.x - 32, y: R_DONE.y, t: 0, color: SIM_GREEN });
            phase = 'rest';
            t = 0;
          } else {
            const p = arcPos(fromX, fromY, R_DONE.x - 32, R_DONE.y, t, -36);
            pushTrail(trail, x, y);
            x = p.x;
            y = p.y;
          }
          break;
        }
        case 'rest': {
          t += dtMs / 1100;
          if (t >= 1) reset();
          break;
        }
      }
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function draw(dt: number) {
      if (!ctx2d) return;
      const theme = themeRef.current;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, SIM_W, R_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

      // guides
      ctx2d.strokeStyle = theme.border;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(R_RUN.x + 46, R_RUN.y);
      ctx2d.lineTo(R_WORKER.x - 26, R_WORKER.y);
      ctx2d.moveTo(R_WORKER.x + 26, R_WORKER.y);
      ctx2d.lineTo(R_DONE.x - 36, R_DONE.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // the run box — shows the suspension while backing off
      const suspended = phase === 'backoff';
      drawBox(ctx2d, theme, R_RUN.x - 70, R_RUN.y - 40, 116, 80, suspended ? SIM_AMBER : theme.border, suspended ? 1.5 : 1);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('run · checkout', R_RUN.x - 56, R_RUN.y - 18);
      ctx2d.fillStyle = suspended ? SIM_AMBER : theme.muted;
      if (suspended) {
        ctx2d.fillText('suspended', R_RUN.x - 56, R_RUN.y + 2);
        ctx2d.fillText(`wakes in ${(backoffMs / 1000).toFixed(1)}s`, R_RUN.x - 56, R_RUN.y + 20);
        // backoff countdown ring
        ctx2d.strokeStyle = SIM_AMBER;
        ctx2d.lineWidth = 2.5;
        ctx2d.beginPath();
        ctx2d.arc(R_RUN.x + 40, R_RUN.y, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (backoffMs / Math.max(1, backoffTotal)));
        ctx2d.stroke();
        ctx2d.lineWidth = 1;
      } else {
        ctx2d.fillText('zero compute', R_RUN.x - 56, R_RUN.y + 2);
        ctx2d.fillText('while waiting', R_RUN.x - 56, R_RUN.y + 20);
      }

      // worker + attempt marks
      const failGlow = workerFlash > 0;
      ctx2d.fillStyle = theme.card;
      ctx2d.strokeStyle = failGlow ? SIM_RED : phase === 'working' ? theme.accent : theme.border;
      ctx2d.lineWidth = failGlow ? 1 + workerFlash * 1.5 : 1;
      ctx2d.beginPath();
      ctx2d.arc(R_WORKER.x, R_WORKER.y, 18, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();
      ctx2d.lineWidth = 1;
      if (phase === 'working') {
        ctx2d.strokeStyle = theme.accent;
        ctx2d.lineWidth = 2.5;
        ctx2d.beginPath();
        ctx2d.arc(R_WORKER.x, R_WORKER.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t));
        ctx2d.stroke();
        ctx2d.lineWidth = 1;
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('@Step chargeCard · retries: 3', R_WORKER.x - 80, R_WORKER.y + 44);
      // attempt marks row
      const rowX0 = R_WORKER.x - ((maxAttempts - 1) * 24) / 2;
      for (let a = 0; a < maxAttempts; a++) {
        const ax = rowX0 + a * 24;
        const ay = R_WORKER.y - 44;
        const outcome = outcomes[a];
        ctx2d.fillStyle = theme.card;
        ctx2d.strokeStyle = outcome === 'fail' ? SIM_RED : outcome === 'ok' ? SIM_GREEN : theme.border;
        ctx2d.beginPath();
        ctx2d.arc(ax, ay, 8, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        if (outcome === 'fail') {
          ctx2d.strokeStyle = SIM_RED;
          ctx2d.lineWidth = 1.75;
          ctx2d.beginPath();
          ctx2d.moveTo(ax - 3, ay - 3);
          ctx2d.lineTo(ax + 3, ay + 3);
          ctx2d.moveTo(ax + 3, ay - 3);
          ctx2d.lineTo(ax - 3, ay + 3);
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
        if (outcome === 'ok') {
          ctx2d.strokeStyle = SIM_GREEN;
          ctx2d.lineWidth = 1.75;
          ctx2d.beginPath();
          ctx2d.moveTo(ax - 3.5, ay);
          ctx2d.lineTo(ax - 1, ay + 2.5);
          ctx2d.lineTo(ax + 4, ay - 3.5);
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`attempt ${Math.min(attempt, maxAttempts)}/${maxAttempts}`, R_WORKER.x - 32, R_WORKER.y - 62);

      // done pile
      drawBox(ctx2d, theme, R_DONE.x - 30, R_DONE.y - 34, 96, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), R_DONE.x - 14, R_DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('completed', R_DONE.x - 14, R_DONE.y + 22);

      drawPulses(ctx2d, pulses, dt);

      // the dot
      if (phase !== 'rest' && phase !== 'backoff') {
        const moving = phase === 'toWorker' || phase === 'reject' || phase === 'toDone';
        const color = phase === 'reject' ? SIM_RED : phase === 'toDone' ? SIM_GREEN : themeRef.current.accent;
        drawDot(ctx2d, x, y, phase === 'working' ? 7 : 6, color, moving ? trail : undefined, moving);
      }
    }

    if (reduced) {
      outcomes = ['fail'];
      phase = 'backoff';
      backoffTotal = 1800;
      backoffMs = 1100;
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
      height={R_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: a dispatched step fails transiently, the run suspends with an exponential-backoff countdown that doubles each attempt, then the retry succeeds and the run completes."
      controls={
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            speed
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                style={{
                  ...simBtn,
                  padding: '4px 10px',
                  borderColor: n === speed ? 'var(--color-fd-primary)' : 'var(--color-fd-border)',
                  color: n === speed ? 'var(--color-fd-foreground)' : 'var(--color-fd-muted-foreground)',
                }}
                onClick={() => setSpeed(n)}
              >
                {n}×
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
          Live model of a durable retry: the attempt fails (✗), the run <b>suspends</b> with the retry
          deadline stamped as <code>wakeAt</code> — watch the countdown <b>double</b> on the next failure
          (exponential backoff) — and the re-dispatch finally lands (✓). No worker is held while it waits,
          and the pending retry survives a crash or deploy.
        </>
      }
    />
  );
}

// ── DlqSim ───────────────────────────────────────────────────────────────────
// Normal runs flow through a worker to done. A POISON PILL crashes the worker on every
// recovery pickup (recovery ×N counter), and past maxRecoveryAttempts it drops into the
// dead tray — which spawns a DLQ handler run on its own lane. Traffic never stops.

const D_H = 300;
const D_PRODUCER = { x: 96, y: 110 };
const D_WORKER = { x: 470, y: 110 };
const D_DONE = { x: 812, y: 110 };
const D_DEAD = { x: 470, y: 236 };
const D_DLQ_DONE = { x: 812, y: 236 };

type DDot = {
  poison: boolean;
  phase: 'toWorker' | 'working' | 'crash' | 'recovering' | 'toDead' | 'dlqWork' | 'toDlqDone' | 'toDone' | 'gone';
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  attempts: number;
  trail: Trail;
};

export function DlqSim() {
  const { wrapRef, canvasRef } = useSimCanvas(D_H);
  const [paused, setPaused] = useState(false);
  const poisonRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, D_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const dots: DDot[] = [];
    const pulses: Pulse[] = [];
    const maxRecovery = 4;
    let spawnCarry = 0;
    let doneCount = 0;
    let deadCount = 0;
    let dlqHandled = 0;
    let workerFlash = 0;
    let sinceAutoPoison = 0;
    let last = performance.now();
    let raf = 0;

    function spawn(poison: boolean) {
      dots.push({
        poison,
        phase: 'toWorker',
        x: D_PRODUCER.x + 36,
        y: D_PRODUCER.y,
        fromX: D_PRODUCER.x + 36,
        fromY: D_PRODUCER.y,
        t: 0,
        attempts: 0,
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
      const dt = dtMs / 1000;
      workerFlash = Math.max(0, workerFlash - 2.5 * dt);

      spawnCarry += 1.6 * dt;
      while (spawnCarry >= 1) {
        spawnCarry -= 1;
        spawn(false);
      }
      sinceAutoPoison += dtMs;
      if (sinceAutoPoison > 9000) {
        sinceAutoPoison = 0;
        poisonRef.current += 1;
      }
      if (poisonRef.current > 0 && !dots.some((d) => d.poison && d.phase !== 'gone')) {
        poisonRef.current -= 1;
        spawn(true);
      }

      for (const dot of dots) {
        switch (dot.phase) {
          case 'toWorker': {
            dot.t += 2.1 * dt;
            if (dot.t >= 1) {
              dot.phase = 'working';
              dot.x = D_WORKER.x;
              dot.y = D_WORKER.y;
              dot.t = 0;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, D_WORKER.x, D_WORKER.y, dot.t, -30);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'working': {
            dot.t += dtMs / (dot.poison ? 420 : 650);
            if (dot.t >= 1) {
              if (dot.poison) {
                dot.attempts += 1;
                workerFlash = 1;
                pulses.push({ x: D_WORKER.x, y: D_WORKER.y, t: 0, color: SIM_RED });
                if (dot.attempts > maxRecovery) {
                  dot.phase = 'toDead';
                } else {
                  dot.phase = 'crash';
                }
                dot.fromX = dot.x;
                dot.fromY = dot.y;
                dot.t = 0;
              } else {
                dot.phase = 'toDone';
                dot.fromX = dot.x;
                dot.fromY = dot.y;
                dot.t = 0;
              }
            }
            break;
          }
          case 'crash': {
            dot.t += 2.4 * dt;
            if (dot.t >= 1) {
              dot.phase = 'recovering';
              dot.t = 0;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, D_WORKER.x - 90, D_WORKER.y - 52, dot.t, -14);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'recovering': {
            dot.t += dtMs / 620;
            if (dot.t >= 1) {
              dot.phase = 'toWorker';
              dot.fromX = dot.x;
              dot.fromY = dot.y;
              dot.t = 0;
            }
            break;
          }
          case 'toDead': {
            dot.t += 2.2 * dt;
            if (dot.t >= 1) {
              deadCount += 1;
              pulses.push({ x: D_DEAD.x - 60, y: D_DEAD.y, t: 0, color: SIM_RED });
              dot.phase = 'dlqWork';
              dot.x = D_DEAD.x + 60;
              dot.y = D_DEAD.y;
              dot.t = 0;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, D_DEAD.x - 60, D_DEAD.y, dot.t, 30);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'dlqWork': {
            dot.t += dtMs / 900;
            if (dot.t >= 1) {
              dot.phase = 'toDlqDone';
              dot.fromX = dot.x;
              dot.fromY = dot.y;
              dot.t = 0;
            }
            break;
          }
          case 'toDlqDone': {
            dot.t += 2.2 * dt;
            if (dot.t >= 1) {
              dlqHandled += 1;
              pulses.push({ x: D_DLQ_DONE.x - 32, y: D_DLQ_DONE.y, t: 0, color: SIM_GREEN });
              dot.phase = 'gone';
            } else {
              const p = arcPos(dot.fromX, dot.fromY, D_DLQ_DONE.x - 32, D_DLQ_DONE.y, dot.t, 0);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'toDone': {
            dot.t += 2.4 * dt;
            if (dot.t >= 1) {
              doneCount += 1;
              pulses.push({ x: D_DONE.x - 32, y: D_DONE.y, t: 0, color: SIM_GREEN });
              dot.phase = 'gone';
            } else {
              const p = arcPos(dot.fromX, dot.fromY, D_DONE.x - 32, D_DONE.y, dot.t, -30);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'gone':
            break;
        }
      }
      for (let i = dots.length - 1; i >= 0; i--) if (dots[i]?.phase === 'gone') dots.splice(i, 1);
      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function draw(dt: number) {
      if (!ctx2d) return;
      const theme = themeRef.current;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, SIM_W, D_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

      // guides
      ctx2d.strokeStyle = theme.border;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(D_PRODUCER.x + 40, D_PRODUCER.y);
      ctx2d.lineTo(D_WORKER.x - 28, D_WORKER.y);
      ctx2d.moveTo(D_WORKER.x + 28, D_WORKER.y);
      ctx2d.lineTo(D_DONE.x - 36, D_DONE.y);
      ctx2d.moveTo(D_DEAD.x + 4, D_DEAD.y);
      ctx2d.lineTo(D_DLQ_DONE.x - 36, D_DLQ_DONE.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      // producer
      drawBox(ctx2d, theme, D_PRODUCER.x - 64, D_PRODUCER.y - 34, 100, 68, theme.border);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('runs', D_PRODUCER.x - 50, D_PRODUCER.y - 10);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('pipeline', D_PRODUCER.x - 50, D_PRODUCER.y + 8);

      // recovery note
      const recovering = dots.find((d) => d.phase === 'recovering' || d.phase === 'crash');
      if (recovering) {
        ctx2d.fillStyle = SIM_RED;
        ctx2d.fillText(`recovery ×${recovering.attempts}/${maxRecovery}`, D_WORKER.x - 130, D_WORKER.y - 56);
        ctx2d.fillStyle = theme.muted;
        ctx2d.fillText('crash-loop', D_WORKER.x - 130, D_WORKER.y - 42);
      }

      // worker
      const busy = dots.find((d) => d.phase === 'working');
      ctx2d.fillStyle = theme.card;
      ctx2d.strokeStyle = workerFlash > 0 ? SIM_RED : busy ? theme.accent : theme.border;
      ctx2d.lineWidth = workerFlash > 0 ? 1 + workerFlash * 1.5 : 1;
      ctx2d.beginPath();
      ctx2d.arc(D_WORKER.x, D_WORKER.y, 18, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();
      ctx2d.lineWidth = 1;
      if (busy) {
        ctx2d.strokeStyle = busy.poison ? SIM_RED : theme.accent;
        ctx2d.lineWidth = 2.5;
        ctx2d.beginPath();
        ctx2d.arc(D_WORKER.x, D_WORKER.y, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, busy.t));
        ctx2d.stroke();
        ctx2d.lineWidth = 1;
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('worker', D_WORKER.x - 18, D_WORKER.y + 40);

      // done pile
      drawBox(ctx2d, theme, D_DONE.x - 30, D_DONE.y - 34, 96, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), D_DONE.x - 14, D_DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('completed', D_DONE.x - 14, D_DONE.y + 22);

      // dead tray
      drawBox(ctx2d, theme, D_DEAD.x - 110, D_DEAD.y - 26, 108, 52, deadCount > 0 ? SIM_RED : theme.border);
      ctx2d.fillStyle = deadCount > 0 ? SIM_RED : theme.muted;
      ctx2d.fillText(`dead: ${deadCount}`, D_DEAD.x - 96, D_DEAD.y - 2);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('inspectable', D_DEAD.x - 96, D_DEAD.y + 14);

      // DLQ handler slot
      const dlq = dots.find((d) => d.phase === 'dlqWork');
      ctx2d.fillStyle = theme.card;
      ctx2d.strokeStyle = dlq ? SIM_AMBER : theme.border;
      ctx2d.beginPath();
      ctx2d.arc(D_DEAD.x + 60, D_DEAD.y, 15, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();
      if (dlq) {
        ctx2d.strokeStyle = SIM_AMBER;
        ctx2d.lineWidth = 2.5;
        ctx2d.beginPath();
        ctx2d.arc(D_DEAD.x + 60, D_DEAD.y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, dlq.t));
        ctx2d.stroke();
        ctx2d.lineWidth = 1;
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('pipeline.dlq · page + ticket', D_DEAD.x + 22, D_DEAD.y + 36);

      // DLQ done
      drawBox(ctx2d, theme, D_DLQ_DONE.x - 30, D_DLQ_DONE.y - 26, 96, 52, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(dlqHandled), D_DLQ_DONE.x - 14, D_DLQ_DONE.y + 1);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('handled', D_DLQ_DONE.x - 14, D_DLQ_DONE.y + 17);

      drawPulses(ctx2d, pulses, dt);

      for (const dot of dots) {
        if (dot.phase === 'gone' || dot.phase === 'recovering') {
          if (dot.phase === 'recovering') {
            // parked next to the worker while recovery counts up
            drawDot(ctx2d, D_WORKER.x - 90, D_WORKER.y - 52, 6, SIM_RED);
          }
          continue;
        }
        const moving = dot.phase !== 'working' && dot.phase !== 'dlqWork';
        const color = dot.poison
          ? SIM_RED
          : dot.phase === 'toDone'
            ? SIM_GREEN
            : theme.accent;
        const finalColor = dot.phase === 'toDlqDone' ? SIM_GREEN : color;
        drawDot(ctx2d, dot.x, dot.y, dot.phase === 'working' || dot.phase === 'dlqWork' ? 7 : 5.5, finalColor, moving ? dot.trail : undefined, moving);
      }
    }

    if (reduced) {
      spawn(true);
      const d = dots[0];
      if (d) {
        d.phase = 'recovering';
        d.attempts = 3;
      }
      deadCount = 1;
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
      height={D_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: normal runs flow to completion while a poison-pill run crash-loops through recovery, is dead-lettered past the recovery cap, and a DLQ handler run pages and files a ticket — traffic never stops."
      controls={
        <>
          <button type="button" style={{ ...simBtn, borderColor: SIM_RED }} onClick={() => { poisonRef.current += 1; }}>
            ☠ inject poison pill
          </button>
          <button type="button" style={{ ...simBtn, marginLeft: 'auto' }} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </>
      }
      caption={
        <>
          Live model of dead-lettering: the <b style={{ color: SIM_RED }}>poison pill</b> crashes the worker
          on every recovery pickup (watch the <code>recovery ×N</code> counter), and past{' '}
          <code>maxRecoveryAttempts</code> it drops to the <b>dead</b> tray — parked, inspectable — which
          starts the <code>pipeline.dlq</code> handler run to page and file a ticket. Meanwhile the healthy
          traffic above never stops flowing.
        </>
      }
    />
  );
}
