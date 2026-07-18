import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // Client router cache: reuse RSC payloads for 30s so switching between the
    // app's bottom tabs is instant instead of a full server round-trip per tap
    // (Next 15 defaults dynamic to 0 = always refetch).
    staleTimes: { dynamic: 30, static: 180 },
  },
  // Security headers applied to every route
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // HSTS covers both hosts (marketing root + app subdomain).
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-inline' kept for Next.js + Google Tag Manager/Analytics
              // inline bootstrap. Payment processor = Polar only.
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://www.clarity.ms https://c.clarity.ms https://va.vercel-scripts.com"
                : "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://www.clarity.ms https://c.clarity.ms https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co http://127.0.0.1:54321 https://openrouter.ai https://www.google-analytics.com https://analytics.google.com https://polar.sh https://*.polar.sh https://api.polar.sh https://*.clarity.ms https://va.vercel-scripts.com https://vitals.vercel-insights.com",
              "frame-src https://buy.polar.sh https://polar.sh https://*.polar.sh",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
