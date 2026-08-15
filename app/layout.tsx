import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { SiteConsent } from '@/components/site-consent'
import './globals.css'
import 'consentium/styles.css'

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'БасТур — туристическая компания | Автобусные и авиатуры',
  description:
    'БасТур — туристическая компания. Автобусные туры, авиатуры, горящие туры и аренда автобусов. За 11 лет с нами отдохнуло более 9500 туристов.',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f0b336',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className={`${nunito.variable} light bg-background`} suppressHydrationWarning>
      <body className="font-sans antialiased text-ink" suppressHydrationWarning>
        <SiteConsent>
          {children}
        </SiteConsent>
      </body>
    </html>
  )
}
