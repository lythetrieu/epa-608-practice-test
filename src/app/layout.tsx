import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'EPA 608 Practice Test | Free HVAC Certification Prep',
    template: '%s | EPA 608 Practice Test',
  },
  description:
    'Free EPA 608 practice tests for HVAC technicians. Core, Type I, Type II, Type III, and Universal exams. Track your progress and pass on your first try.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://epa608practicetest.net'),
  openGraph: {
    siteName: 'EPA 608 Practice Test',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
