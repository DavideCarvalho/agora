import type { Backer } from '@/lib/sponsors';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** A partner or sponsor: their logo when they gave one, their name otherwise. */
export function BackerLogo({
  backer,
  size = 'h-8',
}: {
  backer: Backer;
  /** tailwind height class for the logo */
  size?: string;
}) {
  return (
    <a
      href={backer.url}
      target="_blank"
      rel="noreferrer"
      title={backer.name}
      className="block opacity-70 transition-opacity hover:opacity-100"
    >
      {backer.logo ? (
        // biome-ignore lint/performance/noImgElement: static export (GitHub Pages) has no image optimizer, and logos come in arbitrary sizes
        <img
          src={`${basePath}${backer.logo}`}
          alt={backer.name}
          className={`${size} w-auto`}
          loading="lazy"
        />
      ) : (
        <span className="font-display text-lg text-fd-foreground">
          {backer.name}
        </span>
      )}
    </a>
  );
}
