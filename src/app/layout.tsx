import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
    images: [{ url: 'https://epa608practicetest.net/images/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EPA 608 Practice Test | Free HVAC Certification Prep',
    description:
      'Free EPA 608 practice tests for HVAC technicians. Core, Type I, Type II, Type III, and Universal exams.',
    images: ['https://epa608practicetest.net/images/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = { themeColor: '#1e40af', viewportFit: 'cover' }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Google Tag Manager — the GTM container (GTM-KSX9M3DD) fires GA4.
            The previously-duplicated direct gtag.js + inline gtag config for
            G-KJ8X1DQ1GT were removed: configure that GA4 tag inside GTM instead
            of loading a second, parallel analytics pipeline on every page. */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-KSX9M3DD');` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(localStorage.getItem('epa608-theme')==='dark')document.documentElement.classList.add('dark')})()` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-KSX9M3DD" height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} /></noscript>
        {children}
      </body>
    </html>
  )
}
