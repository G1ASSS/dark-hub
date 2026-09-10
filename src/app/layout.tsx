import type { Metadata, Viewport } from 'next'
import { Outfit, Inter } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Dark Hubb — Premium Adult Streaming',
    template: '%s | Dark Hubb',
  },
  description:
    'Dark Hubb is a premium 18+ adult streaming platform featuring verified creators, HD content, and a secure viewing experience.',
  keywords: ['adult streaming', 'premium content', '18+', 'verified creators'],
  authors: [{ name: 'Dark Hubb' }],
  creator: 'Dark Hubb',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://darkhubb.com',
    siteName: 'Dark Hubb',
    title: 'Dark Hubb — Premium Adult Streaming',
    description: 'Premium 18+ streaming. Verified creators. Cinematic quality.',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Dark Hubb' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dark Hubb — Premium Adult Streaming',
    description: 'Premium 18+ streaming. Verified creators. Cinematic quality.',
    images: ['/og-image.jpg'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0A0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
