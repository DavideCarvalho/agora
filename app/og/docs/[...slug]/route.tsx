import { getPageImage, source } from '@/lib/source';
import { getEmblem } from '@/lib/emblems';
import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';

export const revalidate = false;

// Clamp long descriptions so they never overrun the card footer.
function clamp(text: string, max = 150) {
  if (!text || text.length <= max) return text ?? '';
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : max).trimEnd()}…`;
}

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const libSlug = page.slugs[0];
  const emblem = getEmblem(libSlug);
  const title = page.data.title;
  const description = clamp(page.data.description ?? '', emblem ? 130 : 150);
  const kicker = emblem ? `@agora/${libSlug}` : '@agora · for AdonisJS';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 76px',
        background:
          'radial-gradient(900px 520px at 50% -8%, rgba(90,69,255,0.34), rgba(90,69,255,0) 70%), radial-gradient(700px 420px at 14% 12%, rgba(124,58,170,0.20), rgba(124,58,170,0) 70%), #0c0a0e',
        color: '#ECE7E1',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          fontFamily: 'monospace',
          fontSize: 26,
          letterSpacing: 2,
          color: '#5a45ff',
        }}
      >
        <div style={{ display: 'flex', width: 13, height: 13, borderRadius: 999, background: '#5a45ff' }} />
        {kicker}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 48 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: emblem ? 640 : 1000 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 700, lineHeight: 1.05, color: '#ECE7E1' }}>
            {title}
          </div>
          {description ? (
            <div style={{ display: 'flex', fontSize: 31, lineHeight: 1.35, color: '#B9B2AA' }}>{description}</div>
          ) : null}
        </div>

        {emblem ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 268,
              padding: '22px 18px 18px',
              borderRadius: 18,
              border: '1px solid rgba(90,69,255,0.35)',
              background: 'rgba(12,10,14,0.4)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                fontFamily: 'monospace',
                fontSize: 17,
                letterSpacing: 2,
                color: '#8A847C',
              }}
            >
              <div style={{ display: 'flex' }}>PLATE</div>
              <div style={{ display: 'flex', color: '#B9B2AA' }}>No. {emblem.plate}</div>
            </div>
            <svg width="208" height="150" viewBox="-104 -62 208 150" style={{ marginTop: 6 }}>
              {emblem.art}
            </svg>
            <div
              style={{
                display: 'flex',
                marginTop: 6,
                fontFamily: 'monospace',
                fontSize: 22,
                letterSpacing: 8,
                color: '#5a45ff',
              }}
            >
              {emblem.name.toUpperCase()}
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 27,
          color: '#8A847C',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', fontSize: 33, fontWeight: 700, color: '#ECE7E1' }}>Agora</div>
          <div style={{ display: 'flex' }}>— libraries for the AdonisJS ecosystem</div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: getPageImage(page).segments,
  }));
}
