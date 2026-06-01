import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui',
        fontWeight: 900,
        fontSize: 120,
        color: '#10b981',
        lineHeight: 1,
        paddingBottom: 8,
      }}
    >
      F
    </div>,
    { ...size }
  );
}
