import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt =
  'Contact Your Representatives - Find and write to your senators and congressman';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 50%, #38bdf8 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* Eyebrow label */}
        <div
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.75)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '20px',
          }}
        >
          Free Civic Engagement Tool
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            marginBottom: '20px',
            textShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}
        >
          Contact Your Representatives
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: '26px',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: '780px',
            lineHeight: 1.5,
            marginBottom: '40px',
          }}
        >
          Find your senators and congressman by ZIP code and write to Congress about the issues that
          matter to you.
        </div>

        {/* CTA pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            color: '#0284c7',
            fontSize: '22px',
            fontWeight: 700,
            padding: '16px 40px',
            borderRadius: '50px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          Enter your ZIP code to get started →
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
