'use client';

import { useId, useState } from 'react';

// Three ways to run the same libraries, drawn as one diagram whose pieces move between modes:
// - standalone: every app owns its libraries, data and console;
// - federated: apps keep their libraries and data, and one console reaches into each of them
//   over signed, authenticated console commands;
// - hub: one app runs every control plane and the others switch the libraries to `tenant`.

type Mode = 'standalone' | 'federated' | 'hub';

const modes: { id: Mode; label: string; title: string; body: string }[] = [
  {
    id: 'standalone',
    label: 'Standalone',
    title: 'Every app on its own',
    body: 'Each app runs its libraries in process, keeps their tables in its own database and mounts its own console. The default in every library.',
  },
  {
    id: 'federated',
    label: 'Federated',
    title: 'One console, data stays put',
    body: 'Apps keep their libraries and their data. One console browses and acts on all of them through signed, authenticated commands.',
  },
  {
    id: 'hub',
    label: 'Hub',
    title: 'One control plane for every app',
    body: 'One app runs the control planes: login, config, keys, flags, workflows and traces. The others switch to tenant and keep their own database.',
  },
];

const LIBS = ['Durable', 'Flags', 'Telescope', 'Config'] as const;

// Geometry (viewBox 960 x 540).
const CHIP_W = 160;
const CHIP_H = 40;
const APP_Y = 300;
const APPS = [
  { name: 'shop', x: 40 },
  { name: 'billing', x: 540 },
];
const HUB = { x: 290, y: 24, w: 380, h: 196 };

/** Where library `i` sits inside an app whose box starts at `appX`. */
function inApp(appX: number, i: number) {
  return {
    x: appX + 20 + (i % 2) * 180,
    y: APP_Y + 50 + Math.floor(i / 2) * 52,
  };
}
/** Where library `i` sits inside the Hub. */
function inHub(i: number) {
  return {
    x: HUB.x + 20 + (i % 2) * 180,
    y: HUB.y + 46 + Math.floor(i / 2) * 52,
  };
}

function Chip({
  x,
  y,
  w = CHIP_W,
  label,
  tone = 'plain',
  opacity = 1,
}: {
  x: number;
  y: number;
  w?: number;
  label: string;
  tone?: 'plain' | 'accent' | 'ghost';
  opacity?: number;
}) {
  return (
    <g
      className="ag-topo-move"
      style={{ transform: `translate(${x}px, ${y}px)`, opacity }}
    >
      <rect
        width={w}
        height={CHIP_H}
        rx={10}
        className={
          tone === 'accent'
            ? 'ag-topo-chip-accent'
            : tone === 'ghost'
              ? 'ag-topo-chip-ghost'
              : 'ag-topo-chip'
        }
      />
      <text
        x={w / 2}
        y={CHIP_H / 2 + 5}
        textAnchor="middle"
        className={tone === 'accent' ? 'ag-topo-label-accent' : 'ag-topo-label'}
      >
        {label}
      </text>
    </g>
  );
}

export function TopologyExplorer() {
  const [mode, setMode] = useState<Mode>('standalone');
  const base = useId();
  const current = modes.find((m) => m.id === mode) ?? modes[0];
  const hubShown = mode !== 'standalone';
  const libsInHub = mode === 'hub';

  return (
    <div className="ag-codecard">
      <div
        role="tablist"
        aria-label="Topology"
        className="flex flex-wrap gap-1 border-b border-[var(--ag-line)] p-2"
      >
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`${base}-${m.id}`}
            aria-selected={m.id === mode}
            aria-controls={`${base}-panel`}
            onClick={() => setMode(m.id)}
            className="ag-tab"
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-${mode}`}
        className="grid gap-0 lg:grid-cols-[1fr_20rem]"
      >
        <div className="overflow-x-auto">
          <svg
            viewBox="0 0 960 540"
            className="block w-full min-w-[720px]"
            role="img"
            aria-label={`${current.title}. ${current.body}`}
          >
            {/* Links between the Hub and each app */}
            {APPS.map((app) => {
              const d = `M ${HUB.x + HUB.w / 2} ${HUB.y + HUB.h} C ${HUB.x + HUB.w / 2} ${HUB.y + HUB.h + 50}, ${app.x + 190} ${APP_Y - 50}, ${app.x + 190} ${APP_Y}`;
              return (
                <path
                  key={app.name}
                  d={d}
                  className={`ag-topo-link ${mode === 'hub' ? 'ag-topo-link-solid' : ''}`}
                  style={{ opacity: hubShown ? 1 : 0 }}
                />
              );
            })}
            <text
              x={480}
              y={258}
              textAnchor="middle"
              className="ag-topo-caption ag-topo-fade"
              style={{ opacity: hubShown ? 1 : 0 }}
            >
              {mode === 'hub'
                ? 'tokens, traces, config, keys, runs'
                : 'signed console commands'}
            </text>

            {/* The Hub */}
            <g
              className="ag-topo-fade"
              style={{
                opacity: hubShown ? 1 : 0,
                transform: hubShown ? 'none' : 'translateY(-12px)',
              }}
            >
              <rect
                x={HUB.x}
                y={HUB.y}
                width={HUB.w}
                height={HUB.h}
                rx={18}
                className="ag-topo-box ag-topo-box-hub"
              />
              <text x={HUB.x + 20} y={HUB.y + 30} className="ag-topo-title">
                hub
              </text>
              <text
                x={HUB.x + HUB.w - 20}
                y={HUB.y + 30}
                textAnchor="end"
                className="ag-topo-meta"
              >
                {mode === 'hub' ? "topology: 'control-plane'" : 'console only'}
              </text>
            </g>
            <Chip
              x={mode === 'hub' ? HUB.x + 20 : HUB.x + (HUB.w - CHIP_W) / 2}
              y={mode === 'hub' ? HUB.y + 150 : HUB.y + 98}
              label="Console for every app"
              tone="accent"
              opacity={hubShown ? 1 : 0}
            />
            <Chip
              x={HUB.x + 200}
              y={HUB.y + 150}
              label="Hub database"
              opacity={mode === 'hub' ? 1 : 0}
            />

            {/* The apps */}
            {APPS.map((app) => (
              <g key={app.name}>
                <rect
                  x={app.x}
                  y={APP_Y}
                  width={380}
                  height={220}
                  rx={18}
                  className="ag-topo-box"
                />
                <text x={app.x + 20} y={APP_Y + 30} className="ag-topo-title">
                  {app.name}
                </text>
                <text
                  x={app.x + 360}
                  y={APP_Y + 30}
                  textAnchor="end"
                  className="ag-topo-meta"
                >
                  {mode === 'hub'
                    ? "topology: 'tenant'"
                    : "topology: 'standalone'"}
                </text>

                {/* What stays behind when the libraries move to the Hub */}
                {LIBS.map((lib, i) => {
                  const p = inApp(app.x, i);
                  return (
                    <Chip
                      key={`${app.name}-${lib}-ghost`}
                      x={p.x}
                      y={p.y}
                      label={`${lib} client`}
                      tone="ghost"
                      opacity={libsInHub ? 1 : 0}
                    />
                  );
                })}

                <Chip
                  x={app.x + 20}
                  y={APP_Y + 154}
                  label="Own console"
                  opacity={mode === 'standalone' ? 1 : 0}
                />
                <Chip x={app.x + 200} y={APP_Y + 154} label="App database" />
              </g>
            ))}

            {/* The libraries: they live in each app, and fly to the Hub in hub mode */}
            {APPS.map((app) =>
              LIBS.map((lib, i) => {
                const p = libsInHub ? inHub(i) : inApp(app.x, i);
                return (
                  <Chip
                    key={`${app.name}-${lib}`}
                    x={p.x}
                    y={p.y}
                    label={lib}
                  />
                );
              }),
            )}
          </svg>
        </div>

        <div
          key={mode}
          className="ag-swap flex flex-col justify-center gap-3 border-t border-[var(--ag-line)] p-6 lg:border-t-0 lg:border-l"
        >
          <h3 className="text-lg font-semibold tracking-tight">
            {current.title}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--ag-muted)]">
            {current.body}
          </p>
        </div>
      </div>
    </div>
  );
}
