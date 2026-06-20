import type { ReactElement } from 'react';

// Per-library Agora emblems — Greek/architectural motifs, one per library,
// echoing the agora (the public gathering place). Drawn as satori-safe SVG
// (explicit presentation attrs on each shape — no reliance on group
// inheritance) so they render inside `next/og` ImageResponse.

const C = '#5a45ff'; // brand violet
const INK = '#0C0A0E';
const BONE = '#ECE7E1';

const art: Record<string, ReactElement> = {
  // Column — the foundation everything rests on.
  Column: (
    <g>
      <rect x="-34" y="-50" width="68" height="12" fill={C} />
      <rect x="-28" y="-38" width="56" height="6" fill={C} />
      <rect x="-22" y="-32" width="44" height="74" fill={C} />
      <rect x="-12" y="-30" width="3" height="70" fill={INK} />
      <rect x="-1.5" y="-30" width="3" height="70" fill={INK} />
      <rect x="9" y="-30" width="3" height="70" fill={INK} />
      <rect x="-28" y="42" width="56" height="8" fill={C} />
      <rect x="-36" y="50" width="72" height="10" fill={C} />
    </g>
  ),
  // Amphora — a vessel that carries events from one place to another.
  Amphora: (
    <g>
      <path
        d="M-26 -6 C-30 26 -16 50 0 50 C16 50 30 26 26 -6 C24 -20 14 -26 0 -26 C-14 -26 -24 -20 -26 -6 Z"
        fill={C}
      />
      <rect x="-10" y="-40" width="20" height="16" fill={C} />
      <rect x="-16" y="-44" width="32" height="6" fill={C} />
      <path d="M-14 -38 C-34 -36 -34 -10 -22 -4" stroke={C} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M14 -38 C34 -36 34 -10 22 -4" stroke={C} strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="-6" cy="12" r="3" fill={BONE} />
      <circle cx="7" cy="6" r="3" fill={BONE} />
      <circle cx="2" cy="22" r="3" fill={BONE} />
    </g>
  ),
  // Shield — the hoplon with a lambda blazon: bends but holds.
  Shield: (
    <g>
      <circle cx="0" cy="6" r="46" fill={C} />
      <circle cx="0" cy="6" r="34" fill="none" stroke={BONE} strokeWidth="3" />
      <path
        d="M-14 30 L0 -14 L14 30"
        stroke={BONE}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  ),
  // Temple — built to endure, the agora itself.
  Temple: (
    <g>
      <path d="M-58 -18 L0 -52 L58 -18 Z" fill={C} />
      <rect x="-58" y="-18" width="116" height="10" fill={C} />
      <rect x="-50" y="-8" width="12" height="48" fill={C} />
      <rect x="-22" y="-8" width="12" height="48" fill={C} />
      <rect x="10" y="-8" width="12" height="48" fill={C} />
      <rect x="38" y="-8" width="12" height="48" fill={C} />
      <rect x="-60" y="40" width="120" height="8" fill={C} />
      <rect x="-66" y="48" width="132" height="10" fill={C} />
    </g>
  ),
  // Eye — observe anywhere; the apotropaic eye of the trireme.
  Eye: (
    <g>
      <path d="M-56 6 C-28 -28 28 -28 56 6 C28 40 -28 40 -56 6 Z" fill={C} />
      <path d="M-44 6 C-24 -18 24 -18 44 6 C24 30 -24 30 -44 6 Z" fill={BONE} />
      <circle cx="0" cy="6" r="16" fill={C} />
      <circle cx="0" cy="6" r="6" fill={INK} />
      <path
        d="M0 -40 L0 -52 M-40 -22 L-50 -30 M40 -22 L50 -30"
        stroke={C}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </g>
  ),
};

// slug → { emblem name, plate number }
const meta: Record<string, { name: keyof typeof art; plate: string }> = {
  context: { name: 'Column', plate: '01' },
  diagnostics: { name: 'Amphora', plate: '02' },
  resilience: { name: 'Shield', plate: '03' },
  durable: { name: 'Temple', plate: '04' },
  telescope: { name: 'Eye', plate: '05' },
};

export interface Emblem {
  name: string;
  plate: string;
  art: ReactElement;
}

/** Resolve a docs slug's first segment to its Agora emblem, if any. */
export function getEmblem(libSlug: string | undefined): Emblem | null {
  if (!libSlug) return null;
  const m = meta[libSlug];
  if (!m) return null;
  return { name: m.name, plate: m.plate, art: art[m.name] };
}
