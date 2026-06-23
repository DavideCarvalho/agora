import { ImageResponse } from 'next/og';

export const alt = 'Agora — libraries for the AdonisJS ecosystem';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Required so the image is prerendered to a static file under `output: export`.
export const dynamic = 'force-static';

// Social link preview card. Kept to satori-safe inline styles (every element
// with multiple children declares display:flex). No custom font fetch so it
// stays reliable under static export.
export default function OpengraphImage() {
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
          'radial-gradient(900px 520px at 50% -8%, rgba(90,69,255,0.34), rgba(90,69,255,0) 70%), radial-gradient(700px 420px at 14% 12%, rgba(124,58,170,0.20), rgba(124,58,170,0) 70%), #0c0a0e',
        color: '#ECE7E1',
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
          color: '#B9B2AA',
        }}
      >
        <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 999, background: '#5a45ff' }} />
        @adonis-agora · for AdonisJS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, lineHeight: 1.02 }}>
          Libraries,
        </div>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 700, lineHeight: 1.02, color: '#5a45ff', fontStyle: 'italic' }}>
          gathered.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 30,
          color: '#B9B2AA',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700, color: '#ECE7E1' }}>Agora</div>
          <div style={{ display: 'flex' }}>— libraries for the AdonisJS ecosystem</div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#8A847C' }}>5 libraries · 6 packages</div>
      </div>
    </div>,
    { ...size },
  );
}
