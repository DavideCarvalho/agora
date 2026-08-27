// The charge → approval → webhook scene for the payments docs. It replaces the ASCII diagram in the
// payments overview and says the three things that diagram said: `charge()` only opens a PENDING
// record (no money has moved), the customer then acts out-of-band, and the webhook coming back is
// what actually confirms it — running five ordered steps, each labelled with the guarantee it buys.
//
// No JS at all (a server component): a hand-authored HTML scene with fixed-size inline SVG glyphs
// for the wires, so labels stay at real font sizes instead of shrinking with a scaled viewBox. It
// reads top-to-bottom and each band wraps, so narrow screens stack rather than scroll sideways.
// Theme-aware via Fumadocs' `--color-fd-*` variables; the one motion cue (the webhook wire) is
// disabled under `prefers-reduced-motion`.

const ink = 'var(--color-fd-foreground)';
const muted = 'var(--color-fd-muted-foreground)';
const border = 'var(--color-fd-border)';
const accent = 'var(--color-fd-primary)';
const cardBg = 'var(--color-fd-card)';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// Semantic colors — "pending" and "confirmed" must read the same on every theme, so they are fixed
// hues rather than --color-fd-primary (which each site re-themes).
const AMBER = '#f5a524';
const GREEN = '#30a46c';

// Layered surface tints — opaque over the card so they read on any theme.
const tintAccentSoft = 'color-mix(in srgb, var(--color-fd-primary) 7%, var(--color-fd-card))';
const tintAmber = `color-mix(in srgb, ${AMBER} 13%, var(--color-fd-card))`;
const tintGreen = `color-mix(in srgb, ${GREEN} 12%, var(--color-fd-card))`;
const neutral = 'color-mix(in srgb, var(--color-fd-foreground) 4%, var(--color-fd-card))';

/** An actor chip — one of the two parties on a wire. */
function Actor({ label, sub }: { label: string; sub?: string }) {
  return (
    <span
      className="pf-actor"
      style={{
        background: cardBg,
        borderColor: border,
        color: ink,
        fontFamily: mono,
      }}
    >
      {label}
      {sub ? (
        <span className="pf-actor-sub" style={{ color: muted }}>
          {sub}
        </span>
      ) : null}
    </span>
  );
}

/** A fixed-size arrowhead glyph, so it stays crisp however wide the wire stretches. */
function Head({ dir, color }: { dir: 'right' | 'left'; color: string }) {
  return (
    <svg width={9} height={10} viewBox="0 0 9 10" aria-hidden="true" focusable="false">
      <path
        d={dir === 'right' ? 'M0,0 L9,5 L0,10 z' : 'M9,0 L0,5 L9,10 z'}
        style={{ fill: color }}
      />
    </svg>
  );
}

/**
 * A labelled wire between two actors. The line flexes to fill whatever room is left and the label
 * sits above it, so the whole row wraps cleanly instead of overflowing on a narrow column.
 */
function Wire({
  label,
  dir,
  color,
  flowing,
}: {
  label: string;
  dir: 'right' | 'left';
  color: string;
  flowing?: boolean;
}) {
  return (
    <span className="pf-wire" style={{ color }}>
      <span className="pf-wire-label" style={{ fontFamily: mono }}>
        {label}
      </span>
      <span className="pf-wire-rail">
        {dir === 'left' ? <Head dir="left" color={color} /> : null}
        <span
          className={flowing ? 'pf-line pf-line-flow' : 'pf-line'}
          data-dir={dir}
          style={{ background: color }}
        />
        {dir === 'right' ? <Head dir="right" color={color} /> : null}
      </span>
    </span>
  );
}

/** The dashed drop between two bands — time passing, not a call. */
function Drop({ note }: { note: string }) {
  return (
    <div className="pf-drop">
      <span className="pf-drop-line" style={{ borderColor: border }} />
      <span className="pf-drop-note" style={{ color: muted }}>
        {note}
      </span>
      <span className="pf-drop-line" style={{ borderColor: border }} />
    </div>
  );
}

/** One band of the flow: an ordinal, a title, and whatever the band shows. */
function Band({
  index,
  title,
  tone,
  fill,
  dashed,
  children,
}: {
  index: string;
  title: string;
  tone: string;
  fill: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className="pf-band"
      style={{
        background: fill,
        borderColor: dashed ? border : tone,
        borderStyle: dashed ? 'dashed' : 'solid',
      }}
    >
      <header className="pf-band-head">
        <span className="pf-band-index" style={{ background: tone, color: cardBg }}>
          {index}
        </span>
        <h4 className="pf-band-title" style={{ color: ink }}>
          {title}
        </h4>
      </header>
      {children}
    </section>
  );
}

/** The five things the webhook processor does, in order, and what each one guarantees. */
const STEPS: { what: string; why: string; whyMono?: boolean }[] = [
  { what: 'validate the signature', why: 'forged callbacks rejected' },
  { what: 'ledger the event', why: 'redeliveries stop here' },
  {
    what: 'sync the billing tables',
    why: 'billing_payments / billing_subscriptions',
    whyMono: true,
  },
  { what: 'run your handler', why: 'grant credits, activate the subscription' },
];

const DEFAULT_CAPTION =
  'Nothing has been paid until the webhook arrives — charge() only opens a pending record. The five steps are what make trusting that callback safe.';

/**
 * The payments happy path, end to end: charge → the customer acting out-of-band → the webhook that
 * confirms it. `event` names the confirmation event the last step publishes; `caption` overrides the
 * figcaption. Both optional — it is used as a bare `<PaymentFlow />` in MDX.
 */
export function PaymentFlow({
  event = 'payment.succeeded',
  caption = DEFAULT_CAPTION,
}: {
  event?: string;
  caption?: string;
}) {
  const steps = [
    ...STEPS,
    {
      what: 'publish diagnostics',
      why: `agora:payments:${event}`,
      whyMono: true,
    },
  ];

  return (
    <figure
      className="my-6 rounded-2xl border border-fd-border p-3 sm:p-4"
      style={{ background: tintAccentSoft }}
    >
      <style>{`
        .pf-flow { display: flex; flex-direction: column; }
        .pf-band { border-width: 1px; border-radius: 14px; padding: 12px 14px 14px; }
        .pf-band-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .pf-band-index { display: inline-flex; align-items: center; justify-content: center; width: 19px; height: 19px; border-radius: 999px; font-size: 11px; font-weight: 700; flex: none; }
        .pf-band-title { margin: 0; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
        .pf-row { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 10px; }
        .pf-actor { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 2px 7px; max-width: 100%; border-width: 1px; border-style: solid; border-radius: 9px; padding: 6px 11px; font-size: 12.5px; font-weight: 600; }
        .pf-actor-sub { font-size: 10.5px; font-weight: 400; }
        .pf-wire { flex: 1 1 118px; min-width: 96px; display: flex; flex-direction: column; gap: 3px; padding-bottom: 8px; }
        .pf-wire-label { font-size: 10.5px; text-align: center; letter-spacing: .01em; }
        .pf-wire-rail { display: flex; align-items: center; }
        .pf-line { flex: 1 1 auto; height: 2px; border-radius: 1px; }
        .pf-line-flow { background-image: repeating-linear-gradient(90deg, currentColor 0 6px, transparent 6px 11px) !important; background-color: transparent !important; background-size: 11px 2px; animation: pf-flow-left .62s linear infinite; }
        .pf-line-flow[data-dir='right'] { animation-name: pf-flow-right; }
        @keyframes pf-flow-right { to { background-position: 11px 0 } }
        @keyframes pf-flow-left { to { background-position: -11px 0 } }
        .pf-note { margin: 10px 0 0; font-size: 12px; line-height: 1.5; }
        .pf-badge { display: inline-flex; align-items: center; gap: 6px; border-width: 1px; border-style: solid; border-radius: 8px; padding: 4px 9px; font-size: 11.5px; font-weight: 600; }
        .pf-drop { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 6px 0; }
        .pf-drop-line { display: block; width: 0; height: 14px; border-left-width: 1.5px; border-left-style: dashed; }
        .pf-drop-note { font-size: 10.5px; text-align: center; }
        .pf-steps { list-style: none; margin: 12px 0 0; padding: 2px 0 0 12px; border-left-width: 1px; border-left-style: solid; display: flex; flex-direction: column; gap: 8px; }
        .pf-steps > li { margin: 0; padding-inline-start: 0; }
        .pf-step { display: grid; grid-template-columns: 1.4rem minmax(0, 1fr); column-gap: 9px; row-gap: 1px; }
        .pf-step-n { grid-column: 1; font-size: 10.5px; font-weight: 700; line-height: 1.5; }
        .pf-step-what { grid-column: 2; font-size: 12.5px; font-weight: 600; line-height: 1.5; overflow-wrap: anywhere; }
        .pf-step-why { grid-column: 2; font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
        @media (min-width: 640px) {
          .pf-step { grid-template-columns: 1.4rem minmax(0, 13.5rem) minmax(0, 1fr); align-items: baseline; }
          .pf-step-why { grid-column: 3; }
        }
        @media (prefers-reduced-motion: reduce) { .pf-line-flow { animation: none } }
      `}</style>

      <div className="pf-flow">
        <Band index="1" title="you open a charge" tone={accent} fill={neutral}>
          <div className="pf-row">
            <Actor label="your app" />
            <Wire label="charge()" dir="right" color={accent} />
            <Actor label="gateway" sub="Stripe · Pix · Asaas" />
          </div>
          <p className="pf-note" style={{ color: muted }}>
            <span
              className="pf-badge"
              style={{
                background: tintAmber,
                borderColor: AMBER,
                color: ink,
                fontFamily: mono,
              }}
            >
              payment.status = &apos;pending&apos;
            </span>{' '}
            <span style={{ color: muted }}>
              — the record exists, but nothing has been paid. Never grant anything here.
            </span>
          </p>
        </Band>

        <Drop note="out-of-band — seconds, or days" />

        <Band index="2" title="the customer acts" tone={muted} fill={neutral} dashed>
          <p className="pf-note" style={{ color: ink, marginTop: 0 }}>
            The customer scans the Pix QR, or approves the card — outside your process, on their own
            clock. Your app is not in this step and cannot observe it.
          </p>
        </Band>

        <Drop note="the gateway calls you back" />

        <Band index="3" title="the webhook confirms it" tone={GREEN} fill={tintGreen}>
          <div className="pf-row">
            <Actor label="your app" sub="/payments/webhook" />
            <Wire label="webhook" dir="left" color={GREEN} flowing />
            <Actor label="gateway" sub="paid" />
          </div>
          <p className="pf-note" style={{ color: muted }}>
            One request, five ordered steps — each one is a guarantee:
          </p>
          <ol className="pf-steps" style={{ borderLeftColor: border }}>
            {steps.map((step, i) => (
              <li className="pf-step" key={step.what}>
                <span className="pf-step-n" style={{ color: GREEN, fontFamily: mono }}>
                  {i + 1}
                </span>
                <span className="pf-step-what" style={{ color: ink }}>
                  {step.what}
                </span>
                <span
                  className="pf-step-why"
                  style={{
                    color: muted,
                    fontFamily: step.whyMono ? mono : undefined,
                  }}
                >
                  {step.why}
                </span>
              </li>
            ))}
          </ol>
        </Band>
      </div>

      <figcaption className="mt-3 border-t border-fd-border px-1 pt-2.5 text-xs text-fd-muted-foreground">
        {caption}
      </figcaption>
    </figure>
  );
}
