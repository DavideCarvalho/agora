'use client';

import { useId, useState } from 'react';

// The same library at three sizes. The snippets are real configs from the Agora Hub guide
// (docs/agora-hub): only `topology` and the block next to it change.
const stages = [
  {
    id: 'one-app',
    label: 'One app',
    file: 'config/flags.ts',
    note: 'Runs inside your app. Stores in your database, console at /flags.',
    code: [
      "import { defineConfig, flag } from '@adonis-agora/flags'",
      '',
      'export default defineConfig({',
      "  topology: 'standalone',",
      '  flags: {',
      '    new_checkout: flag.boolean({ default: false }),',
      '  },',
      '})',
    ],
  },
  {
    id: 'every-app',
    label: 'Every app',
    file: 'config/flags.ts (shop)',
    note: 'Reads its ruleset from the Hub and keeps serving from a snapshot if the Hub is down.',
    code: [
      "import { defineConfig, flag } from '@adonis-agora/flags'",
      '',
      'export default defineConfig({',
      "  topology: 'tenant',",
      '  flags: {',
      '    new_checkout: flag.boolean({ default: false }),',
      '  },',
      '  tenant: {',
      "    url: hubUrl('urn:agora:flags'),",
      '    partition: APP_PARTITION,',
      "    token: hubToken('urn:agora:flags'),",
      '  },',
      '})',
    ],
  },
  {
    id: 'hub',
    label: 'The Hub',
    file: 'config/flags.ts (hub)',
    note: 'One app owns the rulesets, the console and the events for every other app.',
    code: [
      "import { defineConfig, stores } from '@adonis-agora/flags'",
      '',
      'export default defineConfig({',
      "  topology: 'control-plane',",
      '  flags: {},',
      '  verifyTenant: authkitTenantVerifier({',
      '    audience: HUB_RESOURCES.flags,',
      '  }),',
      "  store: stores.lucid({ connection: 'hub' }),",
      '})',
    ],
  },
] as const;

/** Splits a line into string literals and the rest, so strings can be tinted. */
function Line({ text }: { text: string }) {
  const parts = text.split(/('[^']*')/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("'") ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static, order never changes
          <span key={i} className="ag-code-str">
            {part}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static, order never changes
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function TopologyCard() {
  const [active, setActive] = useState(0);
  const base = useId();
  const stage = stages[active];

  return (
    <figure className="ag-codecard">
      <div
        role="tablist"
        aria-label="Topology"
        className="flex gap-1 border-b border-[var(--ag-line)] p-2"
      >
        {stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`${base}-tab-${s.id}`}
            aria-selected={i === active}
            aria-controls={`${base}-panel`}
            onClick={() => setActive(i)}
            className="ag-tab"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div
        id={`${base}-panel`}
        role="tabpanel"
        aria-labelledby={`${base}-tab-${stage.id}`}
        key={stage.id}
        className="ag-swap"
      >
        <p className="px-5 pt-4 font-mono text-[0.72rem] text-[var(--ag-muted)]">
          {stage.file}
        </p>
        <pre className="overflow-x-auto px-5 pt-3 pb-5 font-mono text-[0.8rem] leading-[1.7]">
          <code>
            {stage.code.map((line, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: static snippet lines
                key={i}
                className={
                  line.includes('topology:')
                    ? 'ag-code-line ag-code-hit'
                    : 'ag-code-line'
                }
              >
                <Line text={line || ' '} />
              </span>
            ))}
          </code>
        </pre>
        <figcaption className="border-t border-[var(--ag-line)] px-5 py-3 text-sm text-[var(--ag-muted)]">
          {stage.note}
        </figcaption>
      </div>
    </figure>
  );
}
