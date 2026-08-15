import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { SiteConsent } from '@/components/site-consent'
import { CANONICAL_ORIGIN } from '@/lib/canonical-origin'
import './globals.css'
import 'consentium/styles.css'

const nunito = Nunito({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  // Единый источник canonical-origin (lib/canonical-origin.ts):
  // NEXT_PUBLIC_SITE_URL с безопасным дефолтом вместо localhost —
  // иначе при незаданном env все OG/canonical URL становились бы localhost.
  metadataBase: new URL(CANONICAL_ORIGIN),
  title: 'БасТур — туристическая компания | Автобусные и авиатуры',
  description:
    'БасТур — туристическая компания. Автобусные туры, авиатуры, горящие туры и аренда автобусов. За 11 лет с нами отдохнуло более 9500 туристов.',
  // Дефолтный OG для страниц без собственного buildMetadata
  // (страницы с ним переопределяют openGraph целиком).
  openGraph: {
    siteName: 'БасТур',
    locale: 'ru_RU',
    type: 'website',
  },
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
