'use client';

// Scale-story companions to the queue sims: FanoutSim (ctx.all scattering children and
// joining on all results), RateLimitSim (a fixed-window rate gate refilling every
// second), and AdaptiveSim (a worker whose concurrency limit breathes with load).

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

// ── FanoutSim ────────────────────────────────────────────────────────────────
// ctx.all: one parent scatters N children across parallel lanes, every child runs
// concurrently (its own durable run), and the results CONVERGE — the parent resumes
// only once all of them settle. Optionally one child fails: the rest still finish,
// and the join turns red (GatherError carries exactly which children failed).

const F_H = 320;
const F_PARENT = { x: 110, y: 160 };
const F_SLOT_X = 460;
const F_JOIN = { x: 690, y: 160 };
const F_DONE = { x: 840, y: 160 };

type FPhase = 'fanout' | 'working' | 'toJoin' | 'joined' | 'gone';

type FChild = {
  phase: FPhase;
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  laneY: number;
  t: number;
  workMs: number;
  failed: boolean;
  trail: Trail;
};

export function FanoutSim() {
  const { wrapRef, canvasRef } = useSimCanvas(F_H);
  const [paused, setPaused] = useState(false);
  const [count, setCount] = useState(5);
  const [failOne, setFailOne] = useState(false);
  const countRef = useRef(count);
  const failRef = useRef(failOne);
  countRef.current = count;
  failRef.current = failOne;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, F_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const pulses: Pulse[] = [];
    let children: FChild[] = [];
    let stage: 'scatter' | 'gather' | 'settle' | 'rest' = 'rest';
    let restT = 1; // start a wave immediately
    let settleT = 0;
    let batchFailed = false;
    let doneCount = 0;
    let failedCount = 0;
    let last = performance.now();
    let raf = 0;

    function laneY(i: number, n: number): number {
      const span = Math.min(230, n * 44);
      return F_PARENT.y - span / 2 + (i * span) / Math.max(1, n - 1);
    }

    function startWave() {
      const n = countRef.current;
      const failIdx = failRef.current ? Math.floor(Math.random() * n) : -1;
      children = Array.from({ length: n }, (_, i) => ({
        phase: 'fanout' as FPhase,
        x: F_PARENT.x + 44,
        y: F_PARENT.y,
        fromX: F_PARENT.x + 44,
        fromY: F_PARENT.y,
        laneY: laneY(i, n),
        t: 0,
        workMs: 700 + Math.random() * 1100,
        failed: i === failIdx,
        trail: [],
      }));
      batchFailed = failIdx >= 0;
      stage = 'scatter';
    }

    function tick(now: number) {
      const dtMs = Math.min(64, now - last);
      last = now;
      if (!visibleRef.current || paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = dtMs / 1000;

      if (stage === 'rest') {
        restT += dt;
        if (restT > 1.2) {
          restT = 0;
          startWave();
        }
      }

      for (const child of children) {
        switch (child.phase) {
          case 'fanout': {
            child.t += 2.0 * dt;
            if (child.t >= 1) {
              child.phase = 'working';
              child.x = F_SLOT_X;
              child.y = child.laneY;
              child.t = 0;
              child.trail.length = 0;
            } else {
              const p = arcPos(child.fromX, child.fromY, F_SLOT_X, child.laneY, child.t, (child.laneY - F_PARENT.y) * -0.18);
              pushTrail(child.trail, child.x, child.y);
              child.x = p.x;
              child.y = p.y;
            }
            break;
          }
          case 'working': {
            child.t += dtMs / child.workMs;
            if (child.t >= 1) {
              if (child.failed) {
                pulses.push({ x: F_SLOT_X, y: child.laneY, t: 0, color: SIM_RED });
              }
              child.phase = 'toJoin';
              child.fromX = child.x;
              child.fromY = child.y;
              child.t = 0;
            }
            break;
          }
          case 'toJoin': {
            child.t += 2.2 * dt;
            if (child.t >= 1) {
              child.phase = 'joined';
              child.x = F_JOIN.x;
              child.y = F_JOIN.y;
            } else {
              const p = arcPos(child.fromX, child.fromY, F_JOIN.x, F_JOIN.y, child.t, (child.laneY - F_PARENT.y) * 0.18);
              pushTrail(child.trail, child.x, child.y);
              child.x = p.x;
              child.y = p.y;
            }
            break;
          }
          case 'joined':
          case 'gone':
            break;
        }
      }

      if (stage === 'scatter' && children.length > 0 && children.every((c) => c.phase === 'joined')) {
        stage = 'settle';
        settleT = 0;
        pulses.push({ x: F_JOIN.x, y: F_JOIN.y, t: 0, color: batchFailed ? SIM_RED : SIM_GREEN });
      }
      if (stage === 'settle') {
        settleT += 2.2 * dt;
        if (settleT >= 1) {
          if (batchFailed) failedCount += 1;
          else doneCount += 1;
          pulses.push({ x: F_DONE.x - 24, y: F_DONE.y, t: 0, color: batchFailed ? SIM_RED : SIM_GREEN });
          // keep the settled children on screen through the rest — the per-child ✓/✗
          // marks are the payoff; startWave replaces them.
          stage = 'rest';
          restT = 0;
        }
      }

      draw(dt);
      raf = requestAnimationFrame(tick);
    }

    function draw(dt: number) {
      if (!ctx2d) return;
      const theme = themeRef.current;
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2d.clearRect(0, 0, SIM_W, F_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';

      // parent
      const waiting = stage === 'scatter';
      drawBox(ctx2d, theme, F_PARENT.x - 74, F_PARENT.y - 40, 124, 80, waiting ? SIM_AMBER : theme.border, waiting ? 1.5 : 1);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('run · batch', F_PARENT.x - 60, F_PARENT.y - 18);
      ctx2d.fillStyle = waiting ? SIM_AMBER : theme.muted;
      ctx2d.fillText(waiting ? 'suspended on' : 'ctx.all(Item,', F_PARENT.x - 60, F_PARENT.y + 2);
      ctx2d.fillText(waiting ? 'ctx.all(…)' : 'inputs)', F_PARENT.x - 60, F_PARENT.y + 20);

      // child lanes + slots — each lane carries its index so the reader can map it to the
      // per-child result marks under the join.
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (!child || child.phase === 'gone') continue;
        const active = child.phase === 'working';
        const settled = child.phase === 'joined' || child.phase === 'toJoin';
        ctx2d.fillStyle = settled ? (child.failed ? SIM_RED : SIM_GREEN) : theme.muted;
        ctx2d.fillText(`#${i}`, F_SLOT_X - 42, child.laneY + 4);
        ctx2d.fillStyle = theme.card;
        ctx2d.strokeStyle = active ? (child.failed ? SIM_RED : theme.accent) : settled ? (child.failed ? SIM_RED : SIM_GREEN) : theme.border;
        ctx2d.beginPath();
        ctx2d.arc(F_SLOT_X, child.laneY, 13, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        if (active) {
          ctx2d.strokeStyle = child.failed ? SIM_RED : theme.accent;
          ctx2d.lineWidth = 2.2;
          ctx2d.beginPath();
          ctx2d.arc(F_SLOT_X, child.laneY, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, child.t));
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
        // once a child settles, stamp its outcome right on the lane slot: ✓ or ✗
        if (settled) {
          ctx2d.strokeStyle = child.failed ? SIM_RED : SIM_GREEN;
          ctx2d.lineWidth = 1.75;
          ctx2d.beginPath();
          if (child.failed) {
            ctx2d.moveTo(F_SLOT_X - 4, child.laneY - 4);
            ctx2d.lineTo(F_SLOT_X + 4, child.laneY + 4);
            ctx2d.moveTo(F_SLOT_X + 4, child.laneY - 4);
            ctx2d.lineTo(F_SLOT_X - 4, child.laneY + 4);
          } else {
            ctx2d.moveTo(F_SLOT_X - 4.5, child.laneY);
            ctx2d.lineTo(F_SLOT_X - 1.5, child.laneY + 3);
            ctx2d.lineTo(F_SLOT_X + 5, child.laneY - 4);
          }
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`${children.filter((c) => c.phase === 'working').length} children running concurrently`, F_SLOT_X - 78, F_H - 18);

      // join node — fills as children arrive
      const arrived = children.filter((c) => c.phase === 'joined').length;
      const total = children.length || countRef.current;
      const joinColor = batchFailed && arrived === total ? SIM_RED : theme.accent;
      ctx2d.fillStyle = theme.card;
      ctx2d.strokeStyle = arrived > 0 ? joinColor : theme.border;
      ctx2d.beginPath();
      ctx2d.arc(F_JOIN.x, F_JOIN.y, 20, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();
      if (children.length > 0) {
        ctx2d.strokeStyle = joinColor;
        ctx2d.lineWidth = 3;
        ctx2d.beginPath();
        ctx2d.arc(F_JOIN.x, F_JOIN.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (arrived / Math.max(1, total)));
        ctx2d.stroke();
        ctx2d.lineWidth = 1;
        ctx2d.fillStyle = theme.ink;
        ctx2d.fillText(`${arrived}/${total}`, F_JOIN.x - 10, F_JOIN.y + 4);
      }
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('join · waitAll', F_JOIN.x - 34, F_JOIN.y + 42);

      // per-child results row under the join: one mark per index, in input order — the
      // reader sees exactly WHICH children succeeded and which one failed.
      if (children.length > 0) {
        const rowSpacing = 20;
        const rowX0 = F_JOIN.x - ((children.length - 1) * rowSpacing) / 2;
        const rowY = F_JOIN.y + 62;
        const failedIdx: number[] = [];
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (!child) continue;
          const joined = child.phase === 'joined';
          if (joined && child.failed) failedIdx.push(i);
          const mx = rowX0 + i * rowSpacing;
          ctx2d.fillStyle = theme.card;
          ctx2d.strokeStyle = joined ? (child.failed ? SIM_RED : SIM_GREEN) : theme.border;
          ctx2d.beginPath();
          ctx2d.arc(mx, rowY, 7, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.stroke();
          if (joined) {
            ctx2d.strokeStyle = child.failed ? SIM_RED : SIM_GREEN;
            ctx2d.lineWidth = 1.6;
            ctx2d.beginPath();
            if (child.failed) {
              ctx2d.moveTo(mx - 2.5, rowY - 2.5);
              ctx2d.lineTo(mx + 2.5, rowY + 2.5);
              ctx2d.moveTo(mx + 2.5, rowY - 2.5);
              ctx2d.lineTo(mx - 2.5, rowY + 2.5);
            } else {
              ctx2d.moveTo(mx - 3, rowY);
              ctx2d.lineTo(mx - 1, rowY + 2);
              ctx2d.lineTo(mx + 3.5, rowY - 3);
            }
            ctx2d.stroke();
            ctx2d.lineWidth = 1;
          }
        }
        if (failedIdx.length > 0 && arrived === total) {
          ctx2d.fillStyle = SIM_RED;
          ctx2d.fillText(`GatherError: child #${failedIdx.join(', #')} failed`, F_JOIN.x - 74, rowY + 24);
        }
      }

      // done boxes
      drawBox(ctx2d, theme, F_DONE.x - 24, F_DONE.y - 40, 74, 44, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), F_DONE.x - 8, F_DONE.y - 18);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('resolved', F_DONE.x - 12, F_DONE.y - 2);
      drawBox(ctx2d, theme, F_DONE.x - 24, F_DONE.y + 8, 74, 44, failedCount > 0 ? SIM_RED : theme.border);
      ctx2d.fillStyle = failedCount > 0 ? SIM_RED : theme.muted;
      ctx2d.font = '600 16px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(failedCount), F_DONE.x - 8, F_DONE.y + 30);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('GatherError', F_DONE.x - 18, F_DONE.y + 46);

      drawPulses(ctx2d, pulses, dt);

      for (const child of children) {
        if (child.phase === 'joined' || child.phase === 'gone') continue;
        const moving = child.phase === 'fanout' || child.phase === 'toJoin';
        const color = child.failed && child.phase !== 'fanout' ? SIM_RED : child.phase === 'toJoin' ? SIM_GREEN : theme.accent;
        drawDot(ctx2d, child.x, child.y, child.phase === 'working' ? 6.5 : 5, color, moving ? child.trail : undefined, moving);
      }
    }

    if (reduced) {
      startWave();
      children.forEach((c, i) => {
        c.phase = i % 2 === 0 ? 'working' : 'joined';
        c.x = i % 2 === 0 ? F_SLOT_X : F_JOIN.x;
        c.y = i % 2 === 0 ? c.laneY : F_JOIN.y;
        c.t = 0.5;
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
      height={F_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: ctx.all scatters N child workflows across parallel lanes; the suspended parent resumes once every child has settled and joined; with a failing child the join resolves as a GatherError."
      controls={
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            children
            {[3, 5, 8].map((n) => (
              <button
                key={n}
                type="button"
                style={{
                  ...simBtn,
                  padding: '4px 10px',
                  borderColor: n === count ? 'var(--color-fd-primary)' : 'var(--color-fd-border)',
                  color: n === count ? 'var(--color-fd-foreground)' : 'var(--color-fd-muted-foreground)',
                }}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </label>
          <button
            type="button"
            style={{ ...simBtn, borderColor: failOne ? SIM_RED : 'var(--color-fd-border)' }}
            onClick={() => setFailOne((f) => !f)}
          >
            {failOne ? '✗ one child fails' : 'all succeed'}
          </button>
          <button type="button" style={{ ...simBtn, marginLeft: 'auto' }} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </>
      }
      caption={
        <>
          Live model of <code>ctx.all</code>: the parent <b>suspends</b> (amber, zero compute) while N
          children — each a full durable run, labelled <code>#i</code> — execute concurrently and{' '}
          <b>join</b> as they settle, stamping a per-child ✓/✗ under the join. Toggle a failing child:
          the others still finish green, and the join resolves as a <code>GatherError</code> naming
          exactly which index failed.
        </>
      }
    />
  );
}

// ── RateLimitSim ─────────────────────────────────────────────────────────────
// A fixed-window rate gate: at most `limit` admissions per second. The window bar
// drains as calls pass; when it's spent, arrivals wait (suspended) for the next
// window — burst and watch the surge ride the refills, `limit` at a time.

const RL_H = 240;
const RL_PRODUCER = { x: 96, y: 120 };
const RL_GATE = { x: 380, y: 78, w: 190, h: 84 };
const RL_DONE = { x: 812, y: 120 };

type RLDot = {
  phase: 'toGate' | 'waiting' | 'through' | 'gone';
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  trail: Trail;
};

export function RateLimitSim() {
  const { wrapRef, canvasRef } = useSimCanvas(RL_H);
  const [paused, setPaused] = useState(false);
  const [limit, setLimit] = useState(5);
  const burstRef = useRef(0);
  const limitRef = useRef(limit);
  limitRef.current = limit;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, RL_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const dots: RLDot[] = [];
    const pulses: Pulse[] = [];
    let spawnCarry = 0;
    let windowMs = 0;
    let usedThisWindow = 0;
    let doneCount = 0;
    let last = performance.now();
    let raf = 0;

    function spawn() {
      dots.push({
        phase: 'toGate',
        x: RL_PRODUCER.x + 36,
        y: RL_PRODUCER.y,
        fromX: RL_PRODUCER.x + 36,
        fromY: RL_PRODUCER.y,
        t: 0,
        trail: [],
      });
    }

    function waitPos(index: number): { x: number; y: number } {
      const perRow = 8;
      const row = Math.min(2, Math.floor(index / perRow));
      const col = index % perRow;
      return { x: RL_GATE.x - 26 - col * 18, y: RL_GATE.y + 18 + row * 22 };
    }

    function tick(now: number) {
      const dtMs = Math.min(64, now - last);
      last = now;
      if (!visibleRef.current || paused) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const dt = dtMs / 1000;

      windowMs += dtMs;
      if (windowMs >= 1000) {
        windowMs -= 1000;
        usedThisWindow = 0;
      }

      spawnCarry += 3.5 * dt;
      if (burstRef.current > 0) {
        const release = Math.min(burstRef.current, Math.max(1, Math.round(30 * dt)));
        burstRef.current -= release;
        for (let i = 0; i < release; i++) spawn();
      }
      while (spawnCarry >= 1) {
        spawnCarry -= 1;
        spawn();
      }

      // admissions: FIFO through the gate while the window has budget
      for (const dot of dots) {
        if (usedThisWindow >= limitRef.current) break;
        if (dot.phase !== 'waiting') continue;
        usedThisWindow += 1;
        dot.phase = 'through';
        dot.fromX = dot.x;
        dot.fromY = dot.y;
        dot.t = 0;
        dot.trail.length = 0;
      }

      let waitIndex = 0;
      for (const dot of dots) {
        switch (dot.phase) {
          case 'toGate': {
            const pos = waitPos(Math.min(23, dots.filter((d) => d.phase === 'waiting').length));
            dot.t += 2.2 * dt;
            if (dot.t >= 1) {
              dot.phase = 'waiting';
              dot.x = pos.x;
              dot.y = pos.y;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, pos.x, pos.y, dot.t, -24);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'waiting': {
            const pos = waitPos(Math.min(23, waitIndex));
            waitIndex += 1;
            dot.x += (pos.x - dot.x) * Math.min(1, 10 * dt);
            dot.y += (pos.y - dot.y) * Math.min(1, 10 * dt);
            break;
          }
          case 'through': {
            dot.t += 1.8 * dt;
            if (dot.t >= 1) {
              dot.phase = 'gone';
              doneCount += 1;
              pulses.push({ x: RL_DONE.x - 32, y: RL_DONE.y, t: 0, color: SIM_GREEN });
            } else {
              const p = arcPos(dot.fromX, dot.fromY, RL_DONE.x - 32, RL_DONE.y, dot.t, -20);
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
      ctx2d.clearRect(0, 0, SIM_W, RL_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const lim = limitRef.current;
      const waitingN = dots.filter((d) => d.phase === 'waiting' || d.phase === 'toGate').length;

      ctx2d.strokeStyle = theme.border;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(RL_PRODUCER.x + 40, RL_PRODUCER.y);
      ctx2d.lineTo(RL_GATE.x - 10, RL_PRODUCER.y);
      ctx2d.moveTo(RL_GATE.x + RL_GATE.w + 8, RL_PRODUCER.y);
      ctx2d.lineTo(RL_DONE.x - 36, RL_DONE.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      drawBox(ctx2d, theme, RL_PRODUCER.x - 64, RL_PRODUCER.y - 34, 100, 68, theme.border);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('runs', RL_PRODUCER.x - 50, RL_PRODUCER.y - 12);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('dispatch', RL_PRODUCER.x - 50, RL_PRODUCER.y + 6);
      ctx2d.fillText('ctx.step', RL_PRODUCER.x - 50, RL_PRODUCER.y + 22);

      // the gate: window budget bar + reset countdown
      const spent = usedThisWindow >= lim;
      drawBox(ctx2d, theme, RL_GATE.x, RL_GATE.y, RL_GATE.w, RL_GATE.h, spent ? SIM_AMBER : theme.border, spent ? 1.5 : 1);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`rateLimit { limit: ${lim}, perMs: 1000 }`, RL_GATE.x + 2, RL_GATE.y - 8);
      // budget bar
      const barW = RL_GATE.w - 28;
      ctx2d.fillStyle = theme.border;
      ctx2d.beginPath();
      ctx2d.roundRect(RL_GATE.x + 14, RL_GATE.y + 22, barW, 10, 5);
      ctx2d.fill();
      const left = Math.max(0, (lim - usedThisWindow) / lim);
      ctx2d.fillStyle = spent ? SIM_AMBER : SIM_GREEN;
      if (left > 0) {
        ctx2d.beginPath();
        ctx2d.roundRect(RL_GATE.x + 14, RL_GATE.y + 22, barW * left, 10, 5);
        ctx2d.fill();
      }
      ctx2d.fillStyle = spent ? SIM_AMBER : theme.muted;
      ctx2d.fillText(`${lim - usedThisWindow}/${lim} left this window`, RL_GATE.x + 14, RL_GATE.y + 52);
      // window reset countdown
      ctx2d.strokeStyle = theme.muted;
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.arc(RL_GATE.x + RL_GATE.w - 24, RL_GATE.y + 58, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - windowMs / 1000));
      ctx2d.stroke();
      ctx2d.lineWidth = 1;

      if (waitingN > 0) {
        ctx2d.fillStyle = waitingN > 8 ? SIM_AMBER : theme.muted;
        ctx2d.fillText(`${waitingN} waiting for the next window`, RL_GATE.x - 174, RL_GATE.y + RL_GATE.h + 22);
      }

      drawBox(ctx2d, theme, RL_DONE.x - 30, RL_DONE.y - 34, 96, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), RL_DONE.x - 14, RL_DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('dispatched', RL_DONE.x - 14, RL_DONE.y + 22);

      drawPulses(ctx2d, pulses, dt);

      for (const dot of dots) {
        if (dot.phase === 'gone') continue;
        const moving = dot.phase === 'toGate' || dot.phase === 'through';
        const color = dot.phase === 'through' ? SIM_GREEN : dot.phase === 'waiting' ? SIM_AMBER : theme.accent;
        drawDot(ctx2d, dot.x, dot.y, 5.5, color, moving ? dot.trail : undefined, moving);
      }
    }

    if (reduced) {
      for (let i = 0; i < 6; i++) spawn();
      dots.forEach((d, i) => {
        const pos = waitPos(i);
        d.phase = 'waiting';
        d.x = pos.x;
        d.y = pos.y;
      });
      usedThisWindow = limitRef.current;
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
      height={RL_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: a fixed-window rate limit admits at most limit calls per second; excess arrivals wait suspended and surge through when the window refills."
      controls={
        <>
          <button type="button" style={simBtn} onClick={() => { burstRef.current += 20; }}>
            ⚡ burst +20
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            limit/s
            {[3, 5, 10].map((n) => (
              <button
                key={n}
                type="button"
                style={{
                  ...simBtn,
                  padding: '4px 10px',
                  borderColor: n === limit ? 'var(--color-fd-primary)' : 'var(--color-fd-border)',
                  color: n === limit ? 'var(--color-fd-foreground)' : 'var(--color-fd-muted-foreground)',
                }}
                onClick={() => setLimit(n)}
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
          Live model of a queue's <code>rateLimit</code>: the window budget drains as calls pass (watch the
          bar), and once it's spent, arrivals <b>wait suspended</b> for the refill — a burst rides the
          windows through, <code>limit</code> at a time, never hammering the downstream.
        </>
      }
    />
  );
}

// ── AdaptiveSim ──────────────────────────────────────────────────────────────
// concurrency: 'adaptive' — the worker's slot count BREATHES: it grows while latency
// is healthy and backlog builds, and a RAM brake (or rising latency) shrinks it. The
// live limit is what the worker heartbeats as WorkerStatus.

const A_H = 280;
const A_PRODUCER = { x: 96, y: 140 };
const A_QUEUE = { x: 250, y: 106, w: 190, h: 68 };
const A_WORKER_X = 610;
const A_DONE = { x: 830, y: 140 };
const A_MAX_SLOTS = 8;

type ADot = {
  phase: 'toQueue' | 'queued' | 'toSlot' | 'working' | 'toDone' | 'gone';
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  t: number;
  slot: number;
  workMs: number;
  trail: Trail;
};

export function AdaptiveSim() {
  const { wrapRef, canvasRef } = useSimCanvas(A_H);
  const [paused, setPaused] = useState(false);
  const burstRef = useRef(0);
  const brakeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const sim = setupSim(canvas, wrap, A_H);
    const { ctx2d, themeRef, visibleRef, reduced, dpr } = sim;
    if (!ctx2d) return sim.cleanup;

    const dots: ADot[] = [];
    const pulses: Pulse[] = [];
    let limit = 2;
    let limitFloat = 2;
    let brakeMs = 0;
    let spawnCarry = 0;
    let waveT = 0;
    let doneCount = 0;
    let last = performance.now();
    let raf = 0;

    function slotY(slot: number): number {
      return 140 - ((A_MAX_SLOTS - 1) * 26) / 2 + slot * 26;
    }

    function queuePosOf(index: number): { x: number; y: number } {
      const perRow = 9;
      const row = Math.min(1, Math.floor(index / perRow));
      const col = index % perRow;
      return { x: A_QUEUE.x + A_QUEUE.w - 16 - col * 19, y: A_QUEUE.y + (row === 0 ? 22 : 46) };
    }

    function spawn() {
      dots.push({
        phase: 'toQueue',
        x: A_PRODUCER.x + 36,
        y: A_PRODUCER.y,
        fromX: A_PRODUCER.x + 36,
        fromY: A_PRODUCER.y,
        t: 0,
        slot: -1,
        workMs: 550 + Math.random() * 650,
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
      waveT += dt;

      // load wave: slow sine between ~1.2/s and ~5/s, plus manual bursts
      const rate = 3.1 + 1.9 * Math.sin(waveT / 4.2);
      spawnCarry += rate * dt;
      if (burstRef.current > 0) {
        const release = Math.min(burstRef.current, Math.max(1, Math.round(30 * dt)));
        burstRef.current -= release;
        for (let i = 0; i < release; i++) spawn();
      }
      while (spawnCarry >= 1) {
        spawnCarry -= 1;
        spawn();
      }

      // the controller: backlog pushes the limit up; the RAM brake slams it down.
      if (brakeRef.current > 0) {
        brakeRef.current = 0;
        brakeMs = 2600;
      }
      brakeMs = Math.max(0, brakeMs - dtMs);
      const queuedN = dots.filter((d) => d.phase === 'queued').length;
      const target = brakeMs > 0 ? 1 : Math.max(1, Math.min(A_MAX_SLOTS, Math.round(1 + queuedN / 2)));
      limitFloat += (target - limitFloat) * Math.min(1, (brakeMs > 0 ? 3.2 : 0.9) * dt);
      limit = Math.round(limitFloat);

      // admissions
      const inFlight = dots.filter((d) => d.phase === 'working' || d.phase === 'toSlot');
      const busy = new Set(inFlight.map((d) => d.slot));
      for (const dot of dots) {
        if (inFlight.length >= limit) break;
        if (dot.phase !== 'queued') continue;
        let free = -1;
        for (let s = 0; s < limit; s++) {
          if (!busy.has(s)) {
            free = s;
            break;
          }
        }
        if (free < 0) break;
        busy.add(free);
        inFlight.push(dot);
        dot.phase = 'toSlot';
        dot.slot = free;
        dot.fromX = dot.x;
        dot.fromY = dot.y;
        dot.t = 0;
        dot.trail.length = 0;
      }

      let qIndex = 0;
      for (const dot of dots) {
        switch (dot.phase) {
          case 'toQueue': {
            const pos = queuePosOf(Math.min(17, dots.filter((d) => d.phase === 'queued').length));
            dot.t += 2.2 * dt;
            if (dot.t >= 1) {
              dot.phase = 'queued';
              dot.x = pos.x;
              dot.y = pos.y;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, pos.x, pos.y, dot.t, -26);
              pushTrail(dot.trail, dot.x, dot.y);
              dot.x = p.x;
              dot.y = p.y;
            }
            break;
          }
          case 'queued': {
            const pos = queuePosOf(Math.min(17, qIndex));
            qIndex += 1;
            dot.x += (pos.x - dot.x) * Math.min(1, 10 * dt);
            dot.y += (pos.y - dot.y) * Math.min(1, 10 * dt);
            break;
          }
          case 'toSlot': {
            dot.t += 2.4 * dt;
            const ty = slotY(dot.slot);
            if (dot.t >= 1) {
              dot.phase = 'working';
              dot.x = A_WORKER_X;
              dot.y = ty;
              dot.t = 0;
              dot.trail.length = 0;
            } else {
              const p = arcPos(dot.fromX, dot.fromY, A_WORKER_X, ty, dot.t, 22);
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
              dot.t = 0;
            }
            break;
          }
          case 'toDone': {
            dot.t += 2.6 * dt;
            if (dot.t >= 1) {
              dot.phase = 'gone';
              doneCount += 1;
              pulses.push({ x: A_DONE.x - 30, y: A_DONE.y, t: 0, color: SIM_GREEN });
            } else {
              const p = arcPos(dot.fromX, dot.fromY, A_DONE.x - 30, A_DONE.y, dot.t, -22);
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
      ctx2d.clearRect(0, 0, SIM_W, A_H);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const queuedN = dots.filter((d) => d.phase === 'queued' || d.phase === 'toQueue').length;
      const inFlightN = dots.filter((d) => d.phase === 'working' || d.phase === 'toSlot').length;

      ctx2d.strokeStyle = theme.border;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(A_PRODUCER.x + 40, A_PRODUCER.y);
      ctx2d.lineTo(A_QUEUE.x - 8, A_PRODUCER.y);
      ctx2d.moveTo(A_QUEUE.x + A_QUEUE.w + 8, A_PRODUCER.y);
      ctx2d.lineTo(A_WORKER_X - 46, A_PRODUCER.y);
      ctx2d.moveTo(A_WORKER_X + 40, A_PRODUCER.y);
      ctx2d.lineTo(A_DONE.x - 34, A_DONE.y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);

      drawBox(ctx2d, theme, A_PRODUCER.x - 64, A_PRODUCER.y - 34, 100, 68, theme.border);
      ctx2d.fillStyle = theme.ink;
      ctx2d.fillText('load', A_PRODUCER.x - 50, A_PRODUCER.y - 12);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('varies over', A_PRODUCER.x - 50, A_PRODUCER.y + 6);
      ctx2d.fillText('the day', A_PRODUCER.x - 50, A_PRODUCER.y + 22);

      const pressure = Math.min(1, queuedN / 14);
      drawBox(ctx2d, theme, A_QUEUE.x, A_QUEUE.y, A_QUEUE.w, A_QUEUE.h, pressure > 0.5 ? SIM_AMBER : theme.border, 1 + pressure);
      ctx2d.fillStyle = queuedN > 7 ? SIM_AMBER : theme.muted;
      ctx2d.fillText(`backlog: ${queuedN}`, A_QUEUE.x + 2, A_QUEUE.y - 8);

      // worker slots — only `limit` exist right now; ghost outlines mark headroom
      const braking = brakeMs > 0;
      for (let s = 0; s < A_MAX_SLOTS; s++) {
        const y = slotY(s);
        const exists = s < limit;
        const dot = dots.find((d) => d.phase === 'working' && d.slot === s);
        if (!exists) {
          ctx2d.globalAlpha = 0.25;
          ctx2d.strokeStyle = theme.border;
          ctx2d.setLineDash([2, 4]);
          ctx2d.beginPath();
          ctx2d.arc(A_WORKER_X, y, 11, 0, Math.PI * 2);
          ctx2d.stroke();
          ctx2d.setLineDash([]);
          ctx2d.globalAlpha = 1;
          continue;
        }
        ctx2d.fillStyle = theme.card;
        ctx2d.strokeStyle = dot ? theme.accent : theme.border;
        ctx2d.beginPath();
        ctx2d.arc(A_WORKER_X, y, 12, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.stroke();
        if (dot) {
          ctx2d.strokeStyle = theme.accent;
          ctx2d.lineWidth = 2.2;
          ctx2d.beginPath();
          ctx2d.arc(A_WORKER_X, y, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, dot.t));
          ctx2d.stroke();
          ctx2d.lineWidth = 1;
        }
      }
      ctx2d.fillStyle = braking ? SIM_RED : theme.ink;
      ctx2d.fillText(braking ? `RAM brake → limit: ${limit}` : `adaptive · limit: ${limit}`, A_WORKER_X - 52, slotY(A_MAX_SLOTS - 1) + 32);
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText(`in flight ${inFlightN}/${limit} · heartbeats as WorkerStatus`, A_WORKER_X - 92, slotY(A_MAX_SLOTS - 1) + 48);

      drawBox(ctx2d, theme, A_DONE.x - 28, A_DONE.y - 34, 92, 68, theme.border);
      ctx2d.fillStyle = SIM_GREEN;
      ctx2d.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillText(String(doneCount), A_DONE.x - 12, A_DONE.y + 2);
      ctx2d.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx2d.fillStyle = theme.muted;
      ctx2d.fillText('completed', A_DONE.x - 12, A_DONE.y + 22);

      drawPulses(ctx2d, pulses, dt);

      for (const dot of dots) {
        if (dot.phase === 'gone') continue;
        const moving = dot.phase === 'toQueue' || dot.phase === 'toSlot' || dot.phase === 'toDone';
        const color = dot.phase === 'toDone' ? SIM_GREEN : dot.phase === 'queued' ? SIM_AMBER : theme.accent;
        drawDot(ctx2d, dot.x, dot.y, dot.phase === 'working' ? 6.5 : 5, color, moving ? dot.trail : undefined, moving);
      }
    }

    if (reduced) {
      for (let i = 0; i < 4; i++) spawn();
      dots.forEach((d, i) => {
        if (i < 2) {
          d.phase = 'working';
          d.slot = i;
          d.x = A_WORKER_X;
          d.y = slotY(i);
          d.t = 0.5;
        } else {
          const pos = queuePosOf(i - 2);
          d.phase = 'queued';
          d.x = pos.x;
          d.y = pos.y;
        }
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
      height={A_H}
      wrapRef={wrapRef}
      canvasRef={canvasRef}
      ariaLabel="Simulation: an adaptive worker's concurrency limit grows as backlog builds under healthy latency and slams down when the RAM brake fires, then recovers."
      controls={
        <>
          <button type="button" style={simBtn} onClick={() => { burstRef.current += 20; }}>
            📈 spike load +20
          </button>
          <button type="button" style={{ ...simBtn, borderColor: SIM_RED }} onClick={() => { brakeRef.current = 1; }}>
            🧠 RAM brake
          </button>
          <button type="button" style={{ ...simBtn, marginLeft: 'auto' }} onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ resume' : '⏸ pause'}
          </button>
        </>
      }
      caption={
        <>
          Live model of <code>concurrency: 'adaptive'</code>: the worker's slot count <b>breathes</b> — it
          grows into the dashed headroom while backlog builds and latency stays healthy, and the{' '}
          <b style={{ color: SIM_RED }}>RAM brake</b> slams it down before memory melts, recovering once
          pressure clears. The live limit is what the worker heartbeats as <code>WorkerStatus</code> (see
          the Telescope Workers panel).
        </>
      }
    />
  );
}
