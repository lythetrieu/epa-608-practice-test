import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com https://*.paypal.com https://*.paypalobjects.com https://www.googletagmanager.com https://www.google-analytics.com"
                : "script-src 'self' 'unsafe-inline' https://cdn.paddle.com https://*.paypal.com https://*.paypalobjects.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://*.paypalobjects.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 https://openrouter.ai https://sandbox-api.paddle.com https://api.paddle.com https://*.paypal.com https://*.paypalobjects.com https://www.google-analytics.com https://analytics.google.com",
              "frame-src https://sandbox-buy.paddle.com https://buy.paddle.com https://*.paypal.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
