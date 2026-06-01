import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#09090b',
        borderRadius: 96,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui',
        fontWeight: 900,
        fontSize: 340,
        color: '#10b981',
        lineHeight: 1,
        paddingBottom: 20,
      }}
    >
      F
    </div>,
    { ...size }
  );
}
