import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ApplyWizard from '@/components/apply/ApplyWizard'
import { ChevronLeft } from 'lucide-react'

export default async function ApplyPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'application' })
  const nav = await getTranslations({ locale, namespace: 'nav' })

  const supabase = createServerSupabaseClient()
  const { data: festival } = await supabase
    .from('festivals')
    .select('id, name, status')
    .eq('status', 'registration_open')
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!festival) {
    // Registration not open
    return (
      <main className="min-h-screen bg-surface">
        <nav className="flex items-center justify-between px-8 py-4 glass sticky top-0 z-50">
          <span className="font-headline text-xl font-bold text-primary">ArtTime</span>
          <LanguageSwitcher />
        </nav>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center space-y-4">
            <h1 className="font-headline text-3xl font-bold text-on-surface">
              {t('registration_closed_title')}
            </h1>
            <p className="text-on-surface-variant">{t('registration_closed_desc')}</p>
            <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-primary hover:underline">
              <ChevronLeft className="w-4 h-4" />
              {nav('home')}
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface">
      <nav className="flex items-center justify-between px-8 py-4 glass sticky top-0 z-50">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="font-headline text-xl font-bold text-primary">ArtTime</span>
        </Link>
        <LanguageSwitcher />
      </nav>

      <div className="w-full px-6 md:px-10 lg:px-16 py-12">
        <ApplyWizard festivalId={festival.id} locale={locale} />
      </div>
    </main>
  )
}
