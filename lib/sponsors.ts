import { gitConfig } from './shared';

/**
 * Who funds Agora, shown on /partners and on the home page. Every library is
 * MIT and stays that way — the work is paid for by partners and sponsors, the
 * TanStack way, not by gated features.
 *
 * Only list someone with an active sponsorship (or a signed partner deal) who
 * agreed to be shown. Drop the entry when the sponsorship ends.
 */
export interface Backer {
  /** display name */
  name: string;
  /** their site */
  url: string;
  /**
   * Logo under `public/partners/`, e.g. `/partners/acme.svg`. Without it, the
   * name is shown as text.
   */
  logo?: string;
}

export interface Partner extends Backer {
  /** one line on what they do, shown under the logo */
  blurb: string;
  /** slugs from `lib/libs.ts` they integrate with, featured in those docs */
  libs: string[];
}

export const sponsorsUrl = `https://github.com/sponsors/${gitConfig.user}`;

export interface Tier {
  name: string;
  /** monthly, in USD */
  price: number;
  /** price is a floor, not a fixed amount */
  orMore?: boolean;
  perks: string[];
}

/** Mirror of the tiers on GitHub Sponsors — keep both in sync. */
export const tiers: Tier[] = [
  {
    name: 'Supporter',
    price: 5,
    perks: [
      'Sponsor badge on your GitHub profile',
      'Our thanks, in every release',
    ],
  },
  {
    name: 'Sponsor',
    price: 100,
    perks: [
      'Your logo on this site and in every library README',
      'Everything in Supporter',
    ],
  },
  {
    name: 'Partner',
    price: 500,
    orMore: true,
    perks: [
      'Featured as the official integration in the docs of the libraries you touch',
      'Your own section on this page',
      'A mention in release notes and launch posts',
      'Everything in Sponsor',
    ],
  },
];

export const partners: Partner[] = [];

export const sponsors: Backer[] = [];
