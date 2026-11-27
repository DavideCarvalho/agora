import {
  ArrowRight,
  ArrowUpRight,
  FileLock2,
  Fingerprint,
  GitPullRequestArrow,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { BackerLogo } from '@/components/backers';
import { TopologyCard } from '@/components/home/topology-card';
import { TopologyExplorer } from '@/components/home/topology-explorer';
import { AgoraMark, GitHubMark } from '@/components/logo';
import { adopters, adoptersIssue } from '@/lib/adopters';
import { type AgoraLib, libs, stageLabel, totalPackages } from '@/lib/libs';
import { gitConfig, npmScope } from '@/lib/shared';
import {
  absoluteUrl,
  seoDescription,
  repoUrl as siteRepoUrl,
} from '@/lib/site';
import { partners, sponsors } from '@/lib/sponsors';
import './home.css';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

const bySlug = (slug: string) => libs.find((l) => l.slug === slug);

/** The path from one app to many. Each step names the libraries that carry it. */
const steps: { title: string; body: string; libs: string[] }[] = [
  {
    title: 'Ship one app',
    body: 'node ace add, and the library runs in process: tables in your database, its console mounted in your app. No extra service to run.',
    libs: ['durable', 'telescope', 'flags', 'media', 'payments'],
  },
  {
    title: 'Add workers and replicas',
    body: 'Point stores and transports at Redis. Workflows resume after a crash, circuit breakers share state, and every process reports to one bus.',
    libs: ['durable', 'resilience', 'diagnostics', 'collaboration'],
  },
  {
    title: 'Run every app from one Hub',
    body: 'Switch your apps to tenant and give one app the control plane: one login, one console, one place for config, keys, flags, workflows and traces.',
    libs: ['authkit', 'config', 'crypto', 'flags', 'telescope'],
  },
  {
    title: 'Pass the security review',
    body: 'Single sign-on with MFA, roles per tenant, audited keys, sealed secrets and approvals on risky changes, already in the libraries you run.',
    libs: ['authkit', 'authz', 'crypto', 'agent'],
  },
];

/** Grouping for the library index. Every lib appears exactly once. */
const groups: { title: string; slugs: string[] }[] = [
  {
    title: 'Foundations',
    slugs: ['context', 'diagnostics', 'resilience', 'sail'],
  },
  {
    title: 'Building blocks',
    slugs: [
      'durable',
      'media',
      'filter',
      'payments',
      'collaboration',
      'cms',
      'agent',
    ],
  },
  {
    title: 'Platform',
    slugs: ['authkit', 'authz', 'config', 'crypto', 'flags', 'telescope'],
  },
];

/** WebSite + the library catalogue as structured data for search engines. */
function HomeJsonLd() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Agora',
      url: absoluteUrl('/'),
      description: seoDescription,
      inLanguage: 'en',
      sameAs: [siteRepoUrl],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Agora libraries for AdonisJS',
      itemListElement: libs.map((lib, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'SoftwareSourceCode',
          name: `${npmScope}/${lib.pkg}`,
          description: lib.blurb,
          url: absoluteUrl(`/docs/${lib.slug}`),
          programmingLanguage: 'TypeScript',
          runtimePlatform: 'Node.js',
          license: 'https://opensource.org/licenses/MIT',
        },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline; content is our own data, `<` escaped
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export default function HomePage() {
  return (
    <main className="ag-home flex-1">
      <HomeJsonLd />
      {/* ------------------------------------------------------------ Hero */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pt-14 pb-20 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="min-w-0">
          <p
            className="ag-in font-mono text-xs uppercase tracking-[0.2em] text-[var(--ag-muted)]"
            style={{ '--i': 0 } as React.CSSProperties}
          >
            {npmScope} for AdonisJS
          </p>
          <h1
            className="ag-in ag-display mt-5 max-w-xl text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            Start with one app.{' '}
            <span className="text-[var(--ag-accent)]">Grow to a platform.</span>
          </h1>
          <p
            className="ag-in mt-6 max-w-[34rem] text-lg leading-relaxed text-[var(--ag-muted)]"
            style={{ '--i': 2 } as React.CSSProperties}
          >
            Production-grade libraries that run inside a single app today and
            become the control plane for all your apps tomorrow.
          </p>
          <div
            className="ag-in mt-9 flex flex-wrap items-center gap-3"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <Link href="/docs" className="ag-btn ag-btn-primary">
              Read the docs
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
            <a
              href={repoUrl}
              className="ag-btn ag-btn-ghost"
              target="_blank"
              rel="noreferrer"
            >
              <GitHubMark className="size-4" />
              GitHub
            </a>
          </div>
        </div>

        <div
          className="ag-in min-w-0"
          style={{ '--i': 2 } as React.CSSProperties}
        >
          <TopologyCard />
        </div>
      </section>

      {/* ----------------------------------------------------------- Facts */}
      <section className="border-y border-[var(--ag-line)]">
        <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-8 md:grid-cols-4">
          <Fact value={String(libs.length)} label="libraries, one scope" />
          <Fact value={`${totalPackages}+`} label="packages on npm" />
          <Fact value="0" label="hard dependencies between them" />
          <Fact value="MIT" label="license, free to run anywhere" />
        </dl>
      </section>

      {/* -------------------------------------------------------- Topologies */}
      <section className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-8 lg:pt-32">
        <h2 className="ag-display text-3xl leading-[1.1] sm:text-4xl">
          Same libraries, three shapes.
        </h2>
        <p className="mt-5 max-w-xl leading-relaxed text-[var(--ag-muted)]">
          Pick how your apps share their libraries. Switching is configuration,
          not a rewrite.
        </p>
        <div className="ag-reveal mt-10">
          <TopologyExplorer />
        </div>
      </section>

      {/* ------------------------------------------------------------ Path */}
      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-32">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="ag-display text-3xl leading-[1.1] sm:text-4xl">
            Grow without rewriting.
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-[var(--ag-muted)]">
            Every library starts standalone. Move one piece at a time to the
            Hub, each with its own rollback, and leave the rest where it is.
          </p>
          <Link
            href="/docs/agora-hub"
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--ag-accent)] underline-offset-4 hover:underline"
          >
            How the Hub works
            <ArrowRight className="size-3.5" strokeWidth={1.75} />
          </Link>
        </div>

        <ol className="grid gap-10">
          {steps.map((step) => (
            <li key={step.title} className="ag-step ag-reveal">
              <span className="ag-step-mark" aria-hidden />
              <h3 className="text-xl font-semibold tracking-tight">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[38rem] leading-relaxed text-[var(--ag-muted)]">
                {step.body}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {step.libs.map((slug) => {
                  const lib = bySlug(slug);
                  if (!lib) return null;
                  return (
                    <li key={slug}>
                      <Link
                        href={`/docs/${lib.slug}`}
                        className="ag-chip hover:text-[var(--ag-fg)]"
                      >
                        <lib.icon className="size-3.5" strokeWidth={1.75} />
                        {lib.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------ Enterprise */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8 lg:pb-32">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ag-muted)]">
          Enterprise grade
        </p>
        <h2 className="ag-display mt-4 max-w-2xl text-3xl leading-[1.1] sm:text-4xl">
          The controls your security team asks for, built in.
        </h2>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <Cell
            className="ag-cell-accent md:col-span-4 md:row-span-2 md:flex md:flex-col md:justify-between"
            icon={<Fingerprint className="size-5" strokeWidth={1.75} />}
            title="One login for every app"
            href="/docs/authkit"
            big
          >
            Your own OIDC and OAuth2 server: MFA, passwordless, device flow and
            DPoP, with admin and account consoles. Apps sign in through it and
            call each other with tokens it issues and checks.
          </Cell>
          <Cell
            className="ag-cell-dots md:col-span-2"
            icon={<Users className="size-5" strokeWidth={1.75} />}
            title="Roles that follow the tenant"
            href="/docs/authz"
          >
            Roles and permissions in your database, wildcard grants and
            multi-tenancy, feeding AdonisJS Bouncer.
          </Cell>
          <Cell
            className="md:col-span-2"
            icon={<FileLock2 className="size-5" strokeWidth={1.75} />}
            title="Keys stay in one place"
            href="/docs/crypto"
          >
            Named, versioned keys per app. Encrypt, rewrap and sign over HTTP,
            with every call audited.
          </Cell>
          <Cell
            className="ag-cell-tint md:col-span-3"
            icon={<GitPullRequestArrow className="size-5" strokeWidth={1.75} />}
            title="A second pair of eyes"
            href="/docs/flags"
          >
            Flag changes can wait for an approver, agent tool calls can wait for
            a human, and config keeps every version with its history.
          </Cell>
          <Cell
            className="md:col-span-3"
            icon={<ShieldCheck className="size-5" strokeWidth={1.75} />}
            title="Security handled in the open"
            href={repoUrl}
            external
          >
            Commands between apps are authenticated and replay-proof.
            Vulnerabilities are fixed on every supported line and disclosed as
            GitHub security advisories.
          </Cell>
        </div>
      </section>

      {/* ------------------------------------------------------- Libraries */}
      <section className="border-t border-[var(--ag-line)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 lg:py-32">
          <h2 className="ag-display text-3xl leading-[1.1] sm:text-4xl">
            Take one. Or all {libs.length}.
          </h2>
          <p className="mt-5 max-w-xl leading-relaxed text-[var(--ag-muted)]">
            Each library installs on its own and documents itself. Together they
            share one context, one diagnostics bus and one console.
          </p>

          <div className="mt-14 grid gap-12 md:grid-cols-2 lg:grid-cols-3 lg:gap-14">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-[var(--ag-muted)]">
                  {group.title}
                </h3>
                <ul className="mt-4 grid gap-1">
                  {group.slugs.map((slug) => {
                    const lib = bySlug(slug);
                    return lib ? (
                      <li key={slug}>
                        <LibRow lib={lib} />
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <UsedBy />
      <Backers />

      {/* ----------------------------------------------------------- Close */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-8">
        <div className="ag-cell ag-cell-tint flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between md:p-14">
          <h2 className="ag-display max-w-xl text-3xl leading-[1.1] sm:text-4xl">
            Start with the library you need today.
          </h2>
          <Link href="/docs" className="ag-btn ag-btn-primary">
            Read the docs
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--ag-line)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-[var(--ag-muted)] sm:flex-row sm:px-8">
          <span className="inline-flex items-center gap-2">
            <AgoraMark className="size-5" />
            <span className="font-semibold text-[var(--ag-fg)]">Agora</span>
            <span>Libraries for AdonisJS, MIT licensed.</span>
          </span>
          <span className="flex items-center gap-5">
            <Link href="/docs" className="hover:text-[var(--ag-fg)]">
              Docs
            </Link>
            <Link href="/partners" className="hover:text-[var(--ag-fg)]">
              Partners
            </Link>
            <a
              href={repoUrl}
              className="hover:text-[var(--ag-fg)]"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="order-2 text-sm text-[var(--ag-muted)]">{label}</dt>
      <dd className="ag-display order-1 text-3xl sm:text-4xl">{value}</dd>
    </div>
  );
}

function Cell({
  className = '',
  icon,
  title,
  href,
  external,
  big,
  children,
}: {
  className?: string;
  icon: ReactNode;
  title: string;
  href: string;
  external?: boolean;
  big?: boolean;
  children: ReactNode;
}) {
  const linkProps = external ? { target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Link
      href={href}
      {...linkProps}
      className={`ag-cell ag-reveal group block ${className}`}
    >
      <span className="inline-flex size-10 items-center justify-center rounded-[10px] border border-current/20">
        {icon}
      </span>
      <div className={big ? 'mt-16' : 'mt-8'}>
        <h3
          className={`flex items-center gap-2 font-semibold tracking-tight ${big ? 'ag-display text-3xl sm:text-4xl' : 'text-lg'}`}
        >
          {title}
          <ArrowUpRight
            className="size-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            strokeWidth={1.75}
          />
        </h3>
        <p
          className={`ag-cell-body mt-3 leading-relaxed ${big ? 'max-w-xl text-lg' : 'text-sm'}`}
        >
          {children}
        </p>
      </div>
    </Link>
  );
}

function LibRow({ lib }: { lib: AgoraLib }) {
  return (
    <Link href={`/docs/${lib.slug}`} className="ag-row">
      <span className="ag-icon">
        <lib.icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-medium">
          {lib.name}
          {lib.stage === 'wip' ? (
            <span className="rounded-md border border-[var(--ag-line)] px-1.5 text-[0.68rem] font-normal text-[var(--ag-muted)]">
              {stageLabel[lib.stage]}
            </span>
          ) : null}
        </span>
        <span className="block truncate font-mono text-[0.72rem] text-[var(--ag-muted)]">
          {npmScope}/{lib.pkg}
        </span>
      </span>
      <ArrowRight className="ag-row-arrow size-4" strokeWidth={1.75} />
    </Link>
  );
}

/** Who runs Agora: only those who agreed to be listed (see lib/adopters.ts). */
function UsedBy() {
  const invite = (
    <a
      href={adoptersIssue}
      className="inline-flex items-center gap-1.5 font-medium text-[var(--ag-accent)] underline-offset-4 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      Tell us about it
      <ArrowRight className="size-3.5" strokeWidth={1.75} />
    </a>
  );

  if (adopters.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 pb-12 text-center text-sm text-[var(--ag-muted)] sm:px-8">
        Running Agora in production? {invite}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 text-center sm:px-8">
      <h2 className="text-sm font-semibold text-[var(--ag-muted)]">
        Running in production at
      </h2>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {adopters.map((adopter) => (
          <li key={adopter.name}>
            <BackerLogo backer={adopter} />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-[var(--ag-muted)]">
        Running Agora in production? {invite}
      </p>
    </section>
  );
}

/** Partners and sponsors who fund the work (see lib/sponsors.ts). */
function Backers() {
  const invite = (
    <Link
      href="/partners"
      className="inline-flex items-center gap-1.5 font-medium text-[var(--ag-accent)] underline-offset-4 hover:underline"
    >
      Partner with Agora
      <ArrowRight className="size-3.5" strokeWidth={1.75} />
    </Link>
  );
  const backers = [...partners, ...sponsors];

  if (backers.length === 0) {
    return (
      <section className="mx-auto w-full max-w-7xl px-4 pb-20 text-center text-sm text-[var(--ag-muted)] sm:px-8">
        MIT, free forever, funded by partners and sponsors. {invite}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 text-center sm:px-8">
      <h2 className="text-sm font-semibold text-[var(--ag-muted)]">
        Funded by
      </h2>
      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
        {backers.map((backer) => (
          <li key={backer.name}>
            <BackerLogo backer={backer} />
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-[var(--ag-muted)]">{invite}</p>
    </section>
  );
}
