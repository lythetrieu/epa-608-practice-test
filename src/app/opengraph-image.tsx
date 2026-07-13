import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'EPA 608 Practice Test — Free, AI-Powered Certification Prep'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #001d57 0%, #003087 50%, #1a4a9e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.1,
            marginBottom: 20,
          }}
        >
          EPA 608 Practice Test
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            color: '#93c5fd',
            textAlign: 'center',
            marginBottom: 40,
          }}
        >
          Free. 569 Questions. AI-Powered. Pass the First Time.
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['Core', 'Type I', 'Type II', 'Type III', 'Universal'].map((section) => (
            <div
              key={section}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 12,
                padding: '10px 24px',
                color: '#ffffff',
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {section}
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 20,
            color: '#93c5fd',
            fontWeight: 500,
          }}
        >
          epa608practicetest.net — No signup needed. Start practicing free.
        </div>
      </div>
    ),
    { ...size }
  )
}
