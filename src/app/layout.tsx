import type { Metadata } from 'next'
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
      <body className="font-sans">{children}</body>
    </html>
  )
}
