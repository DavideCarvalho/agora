import Link from 'next/link';
import { BackerLogo } from '@/components/backers';
import { libs } from '@/lib/libs';
import { partners } from '@/lib/sponsors';

/**
 * The partner slot in a library's docs, under the table of contents: the
 * partners integrating with that library, or an open invitation while there
 * are none. Pages outside a library (the /docs hub) get nothing.
 */
export function DocsPartners({ slug }: { slug: string | undefined }) {
  const lib = libs.find((candidate) => candidate.slug === slug);
  if (!lib) return null;

  const featured = partners.filter((partner) =>
    partner.libs.includes(lib.slug),
  );

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-xl border border-fd-border bg-fd-card p-4 text-xs">
      <p className="agora-kicker">
        {featured.length > 0 ? 'Partners' : 'Partner'}
      </p>
      {featured.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {featured.map((partner) => (
            <li key={partner.name} className="flex flex-col gap-1.5">
              <BackerLogo backer={partner} size="h-6" />
              <span className="text-fd-muted-foreground">{partner.blurb}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="leading-relaxed text-fd-muted-foreground">
          Your product as the official integration for {lib.name}, right here.
        </p>
      )}
      <Link
        href="/partners"
        className="underline-offset-4 hover:underline"
        style={{ color: 'var(--agora-primary)' }}
      >
        {featured.length > 0 ? 'Partner with Agora' : 'Become a partner'} →
      </Link>
    </div>
  );
}
