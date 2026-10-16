/**
 * Companies and projects running Agora, shown in the "Used by" section of the
 * home page. Collected in the pinned "Who's using Agora in production?" issue.
 *
 * Only add someone who said yes to being listed there, and link that comment
 * in `consent` — a name or logo is never shown on the strength of "we use it"
 * alone. Drop the entry if they ask to be taken down.
 */
export interface Adopter {
  /** display name */
  name: string;
  /** their site */
  url: string;
  /**
   * Logo under `public/adopters/`, e.g. `/adopters/acme.svg` — only when they
   * agreed to the logo too. Without it, the name is shown as text.
   */
  logo?: string;
  /** slugs from `lib/libs.ts` they use */
  libs: string[];
  /** the issue comment where they agreed to be listed */
  consent: string;
}

export const adoptersIssue =
  'https://github.com/DavideCarvalho/agora/issues/61';

export const adopters: Adopter[] = [];
