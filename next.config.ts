import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: '/Users/trieu/Desktop/epa608-platform',
  // Security headers applied to every route
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com"
                : "script-src 'self' 'unsafe-inline' https://cdn.paddle.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 https://sandbox-api.paddle.com https://api.paddle.com",
              "frame-src https://sandbox-buy.paddle.com https://buy.paddle.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
