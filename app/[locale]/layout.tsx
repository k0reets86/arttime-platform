import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import PwaProvider from '@/components/judge/PwaProvider'
import '../globals.css'

const locales = ['ru', 'en', 'de', 'uk']

export const metadata: Metadata = {
  title: 'ArtTime World Talent Festival',
  description: 'International talent competition — dance, vocal, original genre',
  manifest: '/manifest.json',
  themeColor: '#6750A4',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ArtTime',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    apple: '/icon-192.png',
  },
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale)) notFound()
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <body className="font-sans bg-background text-on-surface antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
          <PwaProvider />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
