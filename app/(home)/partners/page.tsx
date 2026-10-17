import { ArrowRight, Check, Heart } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { BackerLogo } from '@/components/backers';
import { libs } from '@/lib/libs';
import {
  partners,
  sponsors,
  sponsorsUrl,
  type Tier,
  tiers,
} from '@/lib/sponsors';

export const metadata: Metadata = {
  title: 'Partners & sponsors',
  description:
    'Every Agora library is MIT and stays that way. Partners and sponsors fund the work — and get featured where AdonisJS developers pick their stack.',
};

export default function PartnersPage() {
  return (
    <main className="agora-home flex-1">
      <div className="agora-sky" aria-hidden />

      <div className="agora-content mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ---------------------------------------------------------- Hero */}
        <section className="pt-32 pb-14 text-center sm:pt-40">
          <p className="agora-kicker agora-rise">Partners &amp; sponsors</p>
          <h1
            className="agora-rise mx-auto mt-6 max-w-3xl text-balance text-4xl font-medium leading-[1.05] sm:text-5xl"
            style={{ animationDelay: '60ms' }}
          >
            Free forever.{' '}
            <span className="italic" style={{ color: 'var(--agora-primary)' }}>
              Funded together.
            </span>
          </h1>
          <p
            className="agora-rise mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-fd-muted-foreground sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            Every one of the {libs.length} libraries is MIT, with no paid tier
            and no gated features — and it stays that way. The time that goes
            into them is paid for by the companies and people below.
          </p>
          <div
            className="agora-rise mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <a
              href={sponsorsUrl}
              className="agora-cta"
              target="_blank"
              rel="noreferrer"
            >
              <Heart className="size-4" />
              Sponsor on GitHub
            </a>
            <Link href="/docs" className="agora-ghost">
              Read the docs
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        <div className="agora-rule" />

        {/* ------------------------------------------------------ Partners */}
        <section className="py-14">
          <p className="agora-kicker">Partners</p>
          <h2 className="mt-2 text-2xl font-medium sm:text-3xl">
            The official integrations
          </h2>

          {partners.length === 0 ? (
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-fd-muted-foreground">
              No partners yet — the first seat is open. If your product is
              something an AdonisJS app plugs into (an LLM provider, a payment
              gateway, storage, a database, a host), Agora is where its
              developers meet it. <PartnerLink />
            </p>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((partner) => (
                <div key={partner.name} className="library">
                  <BackerLogo backer={partner} size="h-10" />
                  <p className="text-sm leading-relaxed text-fd-muted-foreground">
                    {partner.blurb}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    {partner.libs.map((slug) => (
                      <Link
                        key={slug}
                        href={`/docs/${slug}`}
                        className="agora-badge"
                      >
                        {libs.find((lib) => lib.slug === slug)?.name ?? slug}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------ Sponsors */}
        {sponsors.length > 0 && (
          <section className="pb-14">
            <p className="agora-kicker">Sponsors</p>
            <ul className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-6">
              {sponsors.map((sponsor) => (
                <li key={sponsor.name}>
                  <BackerLogo backer={sponsor} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="agora-rule" />

        {/* --------------------------------------------------------- Tiers */}
        <section className="py-14 pb-24">
          <p className="agora-kicker">Tiers</p>
          <h2 className="mt-2 text-2xl font-medium sm:text-3xl">
            Back the agora
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => (
              <TierCard key={tier.name} tier={tier} />
            ))}
          </div>
          <p className="mt-6 text-sm text-fd-muted-foreground">
            All tiers are monthly, through GitHub Sponsors. Want an invoice or a
            custom arrangement instead? <PartnerLink />
          </p>
        </section>
      </div>
    </main>
  );
}

function TierCard({ tier }: { tier: Tier }) {
  return (
    <div className="library">
      <p className="role-tag">{tier.name}</p>
      <p>
        <span className="font-display text-4xl text-fd-foreground">
          ${tier.price}
          {tier.orMore && '+'}
        </span>
        <span className="text-sm text-fd-muted-foreground"> / month</span>
      </p>
      <ul className="flex flex-col gap-2 text-sm text-fd-muted-foreground">
        {tier.perks.map((perk) => (
          <li key={perk} className="flex gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0"
              style={{ color: 'var(--agora-primary)' }}
            />
            {perk}
          </li>
        ))}
      </ul>
      <a
        href={sponsorsUrl}
        className="agora-ghost mt-auto justify-center"
        target="_blank"
        rel="noreferrer"
      >
        Choose {tier.name}
      </a>
    </div>
  );
}

function PartnerLink() {
  return (
    <a
      href={sponsorsUrl}
      className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
      style={{ color: 'var(--agora-primary)' }}
      target="_blank"
      rel="noreferrer"
    >
      Become a partner
      <ArrowRight className="size-3.5" />
    </a>
  );
}
