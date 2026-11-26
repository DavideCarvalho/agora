import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Geist, Geist_Mono } from 'next/font/google';
import { baseOptions } from '@/lib/layout.shared';

// Landing typography (the docs keep their own fonts from the root layout).
const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout {...baseOptions()}>
      <div className={`${geist.variable} ${geistMono.variable} contents`}>
        {children}
      </div>
    </HomeLayout>
  );
}
