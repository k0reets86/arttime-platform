import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import '../globals.css'

const locales = ['ru', 'en', 'de', 'uk']

export const metadata: Metadata = {
  title: 'ArtTime World Talent Festival',
  description: 'International talent competition — dance, vocal, original genre',
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
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
