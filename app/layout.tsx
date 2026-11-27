import type { Metadata } from 'next';
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Provider } from '@/components/provider';
import { appName, gitConfig } from '@/lib/shared';
import {
  absoluteUrl,
  seoDescription,
  seoKeywords,
  seoTitle,
  siteUrl,
} from '@/lib/site';
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

const ogImageAlt = 'Agora: start with one app, grow to a platform';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: seoTitle,
    template: `%s · ${appName}`,
  },
  description: seoDescription,
  applicationName: appName,
  authors: [
    { name: gitConfig.user, url: `https://github.com/${gitConfig.user}` },
  ],
  creator: gitConfig.user,
  keywords: seoKeywords,
  alternates: { canonical: absoluteUrl('/') },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Link previews: Open Graph drives WhatsApp / Facebook / Discord / LinkedIn /
  // Slack; the Twitter card drives X. Both use `/og.png` from
  // `app/og.png/route.tsx`.
  openGraph: {
    type: 'website',
    siteName: appName,
    url: absoluteUrl('/'),
    title: seoTitle,
    description: seoDescription,
    locale: 'en_US',
    images: [
      {
        url: `${absoluteUrl('/og.png')}?v=4`,
        width: 1200,
        height: 630,
        alt: ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: `${absoluteUrl('/og.png')}?v=4`, alt: ogImageAlt }],
    title: seoTitle,
    description: seoDescription,
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
