import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#0B1F3A',
          color: '#FFFFFF',
          display: 'flex',
          fontSize: 66,
          fontWeight: 700,
          height: '100%',
          justifyContent: 'center',
          letterSpacing: '-6px',
          paddingRight: 6,
          width: '100%',
        }}
      >
        MP
      </div>
    ),
    size,
  );
}

