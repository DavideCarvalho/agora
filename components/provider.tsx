'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import SearchDialog from '@/components/search';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      theme={{ defaultTheme: 'dark', enableSystem: true }}
      search={{ SearchDialog }}
    >
      {children}
    </RootProvider>
  );
}
