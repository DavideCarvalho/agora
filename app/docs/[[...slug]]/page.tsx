import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { FlaskConical, History } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocsPartners } from '@/components/docs-partners';
import { getMDXComponents } from '@/components/mdx';
import { libs } from '@/lib/libs';
import { gitConfig } from '@/lib/shared';
import {
  getPageImage,
  getPageMarkdownUrl,
  getPageVersion,
  source,
} from '@/lib/source';
import { projectUrl } from '@/lib/versions';

/** The "you're on an older major" notice, linking to this page in the latest docs. */
function OlderVersionBanner({ page }: { page: (typeof source)['$inferPage'] }) {
  const versioned = getPageVersion(page);
  if (!versioned || versioned.version.latest) return null;
  const { lib, version } = versioned;
  const latest = lib.versions[0];
  return (
    <div
      role="note"
      className="not-prose mb-2 flex items-start gap-2.5 rounded-xl border border-fd-primary/30 bg-fd-primary/5 p-3 text-sm"
    >
      <History className="mt-0.5 size-4 shrink-0 text-fd-primary" />
      <p>
        You&apos;re viewing the docs for {lib.name} {version.label}. The latest
        is {latest.label}.{' '}
        <Link
          href={projectUrl(page.url, version, latest)}
          className="font-medium text-fd-primary underline underline-offset-4"
        >
          Go to the {latest.label} docs
        </Link>
      </p>
    </div>
  );
}

/**
 * The "this major is a release candidate" notice. A version labelled `… (rc)` in
 * scripts/docs-sources.mjs is published on npm's `rc` dist-tag while `latest` still points
 * at the previous major, so a plain install gets the older docs' package.
 */
function ReleaseCandidateBanner({
  page,
}: {
  page: (typeof source)['$inferPage'];
}) {
  const versioned = getPageVersion(page);
  if (!versioned || !/\(rc\)/i.test(versioned.version.label)) return null;
  const { lib, version } = versioned;
  const major = version.label.replace(/\s*\(rc\)/i, '');
  const pkg = `@adonis-agora/${libs.find((l) => l.slug === lib.slug)?.pkg ?? lib.slug}`;
  const older = lib.versions.find((v) => !v.latest);
  return (
    <div
      role="note"
      className="not-prose mb-2 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="space-y-1.5">
        <p>
          {lib.name} {major} is a <strong>release candidate</strong>. npm&apos;s{' '}
          <code>latest</code> tag still installs{' '}
          {older ? older.label : 'the previous major'}, so install these
          docs&apos; version from the <code>rc</code> tag:
        </p>
        <pre className="overflow-x-auto rounded-lg bg-fd-secondary px-2.5 py-1.5 text-xs">
          <code>{`npm i ${pkg}@rc\nnode ace configure ${pkg}`}</code>
        </pre>
        <p className="text-fd-muted-foreground">
          The same goes for every <code>@adonis-agora/*</code> package these
          docs install: add <code>@rc</code>, and where a page says{' '}
          <code>node ace add</code>, install with <code>@rc</code> first and
          then run <code>node ace configure</code>.
          {older ? (
            <>
              {' '}
              On {older.label}?{' '}
              <Link
                href={projectUrl(page.url, version, older)}
                className="font-medium text-fd-primary underline underline-offset-4"
              >
                Read the {older.label} docs
              </Link>
              .
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page).url;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ footer: <DocsPartners slug={params.slug?.[0]} /> }}
    >
      <OlderVersionBanner page={page} />
      <ReleaseCandidateBanner page={page} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">
        {page.data.description}
      </DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const versioned = getPageVersion(page);
  const older =
    versioned && !versioned.version.latest
      ? ` (${versioned.lib.name} ${versioned.version.label})`
      : '';
  const title = `${page.data.title}${older} · Agora`;
  // `?v=` busts the social proxies' image cache (Discord/Facebook cache the
  // image by URL); bump it whenever the OG card design changes. width/height
  // make scrapers render the full 1200×630 landscape card instead of cropping
  // to a square thumbnail (which cut off the emblem on the right).
  const image = {
    url: `${getPageImage(page).url}?v=3`,
    width: 1200,
    height: 630,
    alt: title,
  };

  return {
    title: `${page.data.title}${older}`,
    description: page.data.description,
    // Per-page Open Graph (WhatsApp / Discord / Facebook / LinkedIn / Telegram /
    // Slack) and Twitter card, so every platform shows this page's own title,
    // description and preview image instead of the site-wide one.
    openGraph: {
      type: 'article',
      title,
      description: page.data.description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: page.data.description,
      images: [image],
    },
  };
}
