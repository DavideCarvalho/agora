import { ArrowRight, Plug, Settings2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { AgoraMark, GitHubMark } from '@/components/logo';
import { libs, stageLabel, totalPackages } from '@/lib/libs';
import { gitConfig, npmScope } from '@/lib/shared';

export default function HomePage() {
  return (
    <main className="agora-home flex-1">
      <div className="agora-sky" aria-hidden />

      <div className="agora-content mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ---------------------------------------------------------- Hero */}
        <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 text-center">
          <p className="agora-kicker agora-rise" style={{ animationDelay: '0ms' }}>
            {npmScope} &middot; libraries for AdonisJS
          </p>

          <h1
            className="agora-rise mx-auto mt-6 max-w-3xl text-balance text-4xl font-medium leading-[1.05] sm:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            The AdonisJS ecosystem,{' '}
            <span className="italic" style={{ color: 'var(--agora-primary)' }}>
              composed.
            </span>
          </h1>

          <p
            className="agora-rise mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-fd-muted-foreground sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            {libs.length} production-grade libraries for AdonisJS — context, diagnostics, resilience,
            durable workflows, observability and authorization. Install one, or compose them all: they
            share context, emit to one diagnostics bus, and surface in one console.
          </p>

          <div
            className="agora-rise mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <Link href="/docs" className="agora-cta">
              Read the docs
              <ArrowRight className="size-4" />
            </Link>
            <a
              href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
              className="agora-ghost"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubMark className="size-4" />
              GitHub
            </a>
          </div>

          <div
            className="agora-rise mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-fd-muted-foreground"
            style={{ animationDelay: '240ms' }}
          >
            <Stat value={String(libs.length)} label="libraries" />
            <Dot />
            <Stat value={`${totalPackages}+`} label="packages, one scope" />
            <Dot />
            <Stat value="0" label="hard deps between them" />
          </div>
        </section>

        <div className="agora-rule" />

        {/* ------------------------------------------------- Two principles */}
        <section className="grid gap-5 py-14 md:grid-cols-2">
          <Philosophy
            icon={<Plug className="size-5" />}
            kicker="Get going fast"
            title="Plug-n-play"
            body="node ace add @adonis-agora/<lib> and you're running with opinionated, typed defaults. Conventions over configuration, wired through the AdonisJS provider — shipping in minutes, not a config marathon."
          />
          <Philosophy
            icon={<Settings2 className="size-5" />}
            kicker="Tune everything"
            title="Configurable to the core"
            body="Swap stores, transports, adapters and validators at will. Every seam is a documented public API, so the easy path and the deep path are the same path."
          />
        </section>

        {/* ----------------------------------------------------- Library grid */}
        <section className="pb-24">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="agora-kicker">The libraries</p>
              <h2 className="mt-2 text-2xl font-medium sm:text-3xl">Everything in Agora</h2>
            </div>
            <p className="hidden max-w-xs text-right text-sm text-fd-muted-foreground sm:block">
              Each library ships on its own and documents itself. Pick one and dive in.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {libs.map((lib, i) => (
              <Link
                key={lib.slug}
                href={`/docs/${lib.slug}`}
                className="library agora-rise group"
                style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <span className="library-icon">
                    <lib.icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="library-no">No. {String(i + 1).padStart(2, '0')}</span>
                </div>

                <div>
                  <h3 className="text-lg font-medium">{lib.name}</h3>
                  <code className="font-mono text-[0.74rem] text-fd-muted-foreground">
                    {npmScope}/{lib.pkg}
                  </code>
                </div>

                <p className="text-sm leading-relaxed text-fd-muted-foreground">{lib.blurb}</p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="role-tag">{lib.role}</span>
                  <span className="flex items-center gap-2">
                    <span className="agora-badge">{lib.packages} pkg</span>
                    <span className="agora-badge">{stageLabel[lib.stage]}</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ----------------------------------------------------------- Footer */}
        <footer className="border-t border-fd-border py-10">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="inline-flex items-center gap-2 text-sm text-fd-muted-foreground">
              <AgoraMark className="size-5" />
              <span className="font-display">Agora</span>
              <span>— libraries for the AdonisJS ecosystem.</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-fd-muted-foreground">
              <Sparkles className="size-3.5" style={{ color: 'var(--agora-primary)' }} />
              Built for AdonisJS
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-display text-xl text-fd-foreground">{value}</span>
      <span>{label}</span>
    </span>
  );
}

function Dot() {
  return <span className="hidden size-1 rounded-full bg-fd-border sm:inline-block" />;
}

function Philosophy({
  icon,
  kicker,
  title,
  body,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-fd-border bg-fd-card p-7">
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 place-items-center rounded-xl"
          style={{
            color: 'var(--agora-primary)',
            background: 'var(--agora-primary-soft)',
            border: '1px solid hsl(250 90% 64% / 0.22)',
          }}
        >
          {icon}
        </span>
        <p className="agora-kicker">{kicker}</p>
      </div>
      <h3 className="mt-5 font-display text-2xl font-medium">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">{body}</p>
    </div>
  );
}
