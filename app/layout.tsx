import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/provider';
import { appName, appTagline, gitConfig } from '@/lib/shared';
import './global.css';

// Editorial "docs" display serif — characterful, never generic.
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

// Warm, humanist body grotesk (deliberately not Inter/Arial/system).
const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

// e.g. https://dudousxd.github.io/agora  (basePath is empty in dev / on a custom domain)
const siteUrl = `https://${gitConfig.user}.github.io${process.env.NEXT_PUBLIC_BASE_PATH || ''}`;

const description =
  'Agora is a collection of plug-n-play, fully-configurable libraries for AdonisJS, published under @agora. One docs site for the whole ecosystem — many libraries, gathered.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${appName} — ${appTagline}`,
    template: `%s · ${appName}`,
  },
  description,
  applicationName: appName,
  authors: [{ name: 'dudousxd' }],
  keywords: ['AdonisJS', 'TypeScript', 'Laravel-style', 'dudousxd', 'Agora', 'monorepo', 'libraries'],
  // Link previews: Open Graph drives WhatsApp / Facebook / Discord / LinkedIn /
  // Slack; the Twitter card drives X. The preview image comes from the
  // file-based `app/opengraph-image.tsx` (+ `twitter-image.tsx`), which Next
  // injects with absolute URLs derived from `metadataBase`.
  openGraph: {
    type: 'website',
    siteName: appName,
    url: siteUrl,
    title: `${appName} — ${appTagline}`,
    description,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${appName} — ${appTagline}`,
    description,
  },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${hanken.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen font-sans antialiased">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
