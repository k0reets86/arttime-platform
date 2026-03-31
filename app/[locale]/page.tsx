import { getTranslations } from 'next-intl/server'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/types'
import { Music, Star, Award, Globe, ChevronRight, Calendar, MapPin } from 'lucide-react'

type Festival = Tables<'festivals'>

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  return { title: `ArtTime — ${t('festival_name')}` }
}

async function getActiveFestival(): Promise<Festival | null> {
  try {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('festivals')
      .select('*')
      .in('status', ['registration_open', 'registration_closed', 'active'])
      .order('year', { ascending: false })
      .limit(1)
      .single()
    return data
  } catch {
    return null
  }
}

export default async function LandingPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const festival = await getActiveFestival()
  const isRegistrationOpen = festival?.status === 'registration_open'

  return (
    <main className="min-h-screen bg-surface">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-4 glass sticky top-0 z-50">
        <span className="font-headline text-xl font-bold text-primary">ArtTime</span>
        <div className="flex items-center gap-4">
          <Link href={`/${locale}/status`} className="text-sm text-on-surface-variant hover:text-primary transition-colors">
            {nav('status')}
          </Link>
          <LanguageSwitcher />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center">
        {/* Background glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] left-[5%] w-[700px] h-[700px] rounded-full bg-primary opacity-[0.04] blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[0%] w-[500px] h-[500px] rounded-full" style={{ background: '#ffd709', opacity: 0.06, filter: 'blur(120px)' }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Year badge */}
            {festival && (
              <div className="flex justify-center">
                <Badge variant="secondary" className="text-sm px-4 py-1.5 gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  {festival.year}
                  {festival.location && (
                    <>
                      <span className="opacity-40">·</span>
                      <MapPin className="w-3.5 h-3.5" />
                      {festival.location}
                    </>
                  )}
                </Badge>
              </div>
            )}

            {/* Spotlight label */}
            <div className="spotlight px-6 py-2 inline-block">
              <span className="text-primary font-semibold text-sm uppercase tracking-widest">
                World Talent Festival
              </span>
            </div>

            {/* Main headline */}
            <h1 className="font-headline text-5xl sm:text-6xl lg:text-7xl font-black text-on-surface tracking-tight leading-tight -mt-2">
              Where Art
              <br />
              <span className="text-primary italic">Transcends</span> Time.
            </h1>

            <p className="text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
              {t('festival_name')}
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              {isRegistrationOpen ? (
                <Button asChild size="lg" className="primary-gradient text-on-primary shadow-radiant">
                  <Link href={`/${locale}/apply`}>
                    {nav('apply')}
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" disabled variant="outline">
                  {t('registration_closed')}
                </Button>
              )}
              <Button asChild size="lg" variant="outline">
                <Link href={`/${locale}/status`}>
                  {nav('status')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface-container-low">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl sm:text-4xl font-bold text-on-surface mb-4">
              {t('why_arttime')}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Music, titleKey: 'feature_music', descKey: 'feature_music_desc' },
              { icon: Star, titleKey: 'feature_judging', descKey: 'feature_judging_desc' },
              { icon: Award, titleKey: 'feature_awards', descKey: 'feature_awards_desc' },
              { icon: Globe, titleKey: 'feature_international', descKey: 'feature_international_desc' },
            ].map(({ icon: Icon, titleKey, descKey }) => (
              <div key={titleKey} className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-headline text-lg font-semibold text-on-surface">
                  {t(titleKey as Parameters<typeof t>[0])}
                </h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  {t(descKey as Parameters<typeof t>[0])}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', labelKey: 'stat_participants' },
              { value: '30+', labelKey: 'stat_countries' },
              { value: '15', labelKey: 'stat_categories' },
              { value: '10', labelKey: 'stat_years' },
            ].map(({ value, labelKey }) => (
              <div key={labelKey} className="space-y-2">
                <div className="font-headline text-4xl font-bold text-primary">{value}</div>
                <div className="text-sm text-on-surface-variant">
                  {t(labelKey as Parameters<typeof t>[0])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      {isRegistrationOpen && (
        <section className="py-20 bg-surface-container-low">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="font-headline text-3xl font-bold text-on-surface">
              {t('ready_to_perform')}
            </h2>
            <Button asChild size="lg" className="primary-gradient text-on-primary shadow-radiant">
              <Link href={`/${locale}/apply`}>
                {nav('apply')}
                <ChevronRight className="w-5 h-5" />
              </Link>
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}
