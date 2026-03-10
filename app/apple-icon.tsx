import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
          borderRadius: '36px',
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Capitol dome */}
          <path
            d="M12 2L12 4M12 4C9 4 7 6 7 8L7 10L17 10L17 8C17 6 15 4 12 4Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Dome top */}
          <circle cx="12" cy="3" r="1" fill="white" />
          {/* Building base columns */}
          <path d="M6 10L6 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M10 10L10 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 10L14 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 10L18 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          {/* Top and bottom bars */}
          <path d="M5 10L19 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4 18L20 18" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          {/* Steps */}
          <path d="M3 20L21 20" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
