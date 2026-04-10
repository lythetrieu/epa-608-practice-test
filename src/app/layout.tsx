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
    title: 'EPA 608 Practice Test | Free HVAC Certification Prep',
    description:
      'Free EPA 608 practice tests for HVAC technicians. Core, Type I, Type II, Type III, and Universal exams. Track your progress and pass on your first try.',
    url: 'https://epa608practicetest.net',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EPA 608 Practice Test - Free HVAC Certification Prep',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EPA 608 Practice Test | Free HVAC Certification Prep',
    description:
      'Free EPA 608 practice tests for HVAC technicians. Core, Type I, Type II, Type III, and Universal exams.',
    images: ['/og-image.png'],
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('epa608-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')})()` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e40af" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
