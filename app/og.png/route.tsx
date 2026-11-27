import { ImageResponse } from 'next/og';
import { libs, totalPackages } from '@/lib/libs';

// Served as a real `/og.png` file, not via the file-based
// `opengraph-image.tsx` convention: under `output: export` that convention
// writes an extensionless `opengraph-image` file, which GitHub Pages serves as
// `application/octet-stream`, and X then drops the card image.
export const dynamic = 'force-static';

// Social link preview card. Kept to satori-safe inline styles (every element
// with multiple children declares display:flex). No custom font fetch so it
// stays reliable under static export.
export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px 80px',
        background:
          'radial-gradient(900px 520px at 78% -10%, rgba(125,159,255,0.30), rgba(125,159,255,0) 70%), #0c0c0f',
        color: '#ECECF1',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 26,
          letterSpacing: 6,
          textTransform: 'uppercase',
          color: '#9C9CAA',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 16,
            height: 16,
            borderRadius: 999,
            background: '#7d9fff',
          }}
        />
        @adonis-agora · for AdonisJS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.02,
          }}
        >
          Start with one app.
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 92,
            fontWeight: 700,
            lineHeight: 1.02,
            color: '#7d9fff',
          }}
        >
          Grow to a platform.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 30,
          color: '#9C9CAA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 700,
              color: '#ECECF1',
            }}
          >
            Agora
          </div>
          <div style={{ display: 'flex' }}>
            production-grade libraries for AdonisJS
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#7A7A88' }}>
          {libs.length} libraries, {totalPackages}+ packages
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
