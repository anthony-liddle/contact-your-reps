import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Contact Your Representatives - Find and write to your senators and congressman';
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
        <div
          style={{
            fontSize: '80px',
            marginBottom: '20px',
          }}
        >
          🏛️
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: '24px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          Contact Your Representatives
        </div>
        <div
          style={{
            fontSize: '28px',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.5,
          }}
        >
          Find your senators and representative by ZIP code and write to Congress about the issues
          that matter to you.
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
