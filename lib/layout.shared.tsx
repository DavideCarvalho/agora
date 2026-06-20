import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { AgoraWordmark } from '@/components/logo';
import { gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: <AgoraWordmark />,
      transparentMode: 'top',
    },
    links: [
      {
        text: 'Docs',
        url: '/docs',
        active: 'nested-url',
        // Top navbar only — the docs sidebar already reaches the hub via the
        // library dropdown, so don't duplicate it there.
        on: 'nav',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
