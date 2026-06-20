import { appName } from '@/lib/shared';

/**
 * Agora mark — a Greek temple front (a pediment over a colonnade): the agora,
 * the public gathering place the ecosystem is named for. Uses currentColor for
 * the columns and the brand violet for the pediment.
 */
export function AgoraMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={`${appName} logo`}
      className={className}
    >
      {/* pediment — brand violet */}
      <path d="M4 12 L16 4 L28 12 Z" fill="var(--agora-primary, #5a45ff)" />
      {/* architrave */}
      <rect x="5" y="12.5" width="22" height="3" fill="currentColor" />
      {/* columns */}
      <rect x="7" y="16" width="3.2" height="10" fill="currentColor" />
      <rect x="14.4" y="16" width="3.2" height="10" fill="currentColor" />
      <rect x="21.8" y="16" width="3.2" height="10" fill="currentColor" />
      {/* stylobate */}
      <rect x="4.5" y="26" width="23" height="3" fill="currentColor" />
    </svg>
  );
}

/** GitHub mark — lucide dropped brand glyphs in v1, so we inline it. */
export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

export function AgoraWordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <AgoraMark className="size-6 shrink-0" />
      <span className="font-display text-[1.35rem] leading-none font-medium tracking-tight">
        {appName}
      </span>
    </span>
  );
}
