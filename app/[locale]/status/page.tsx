/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from 'next-intl/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, ChevronLeft, Search } from 'lucide-react'
import StatusSearch from '@/components/apply/StatusSearch'

export default async function StatusPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { id?: string; email?: string; payment?: string }
}) {
  const t = await getTranslations({ locale, namespace: 'status' })

  let application = null
  if (searchParams.id) {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('applications')
      .select(`
        *,
        categories(name_i18n),
        nominations(name_i18n),
        application_packages(*, packages(*)),
        payments(*)
      `)
      .eq('id', searchParams.id)
      .single()
    application = data
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5 text-primary" />
    }
  }

  const getStatusVariant = (status: string): 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' => {
    switch (status) {
      case 'approved': return 'success'
      case 'rejected': return 'destructive'
      case 'submitted': return 'default'
      default: return 'secondary'
    }
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-2xl">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 text-center">
          {t('title')}
        </h1>
        <p className="text-on-surface-variant text-center mb-8">{t('subtitle')}</p>

        {/* Payment success banner */}
        {searchParams.payment === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-green-700 text-sm">{t('payment_success')}</p>
          </div>
        )}

        {/* Search form */}
        <StatusSearch locale={locale} />

        {/* Application details */}
        {application && (
          <div className="mt-8 space-y-4">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-headline text-xl font-bold text-on-surface">
                    {(application as any).name}
                  </h2>
                  <p className="text-sm text-on-surface-variant mt-1">
                    {(application as any).contact_email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon((application as any).status)}
                  <Badge variant={getStatusVariant((application as any).status)}>
                    {t(`status_${(application as any).status}` as any)}
                  </Badge>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant border-opacity-10">
                <div>
                  <p className="text-xs text-on-surface-variant">{t('performance')}</p>
                  <p className="text-sm text-on-surface font-medium">
                    {(application as any).performance_title || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('payment_status')}</p>
                  <Badge variant={(application as any).payment_status === 'paid' ? 'success' : 'warning'} className="mt-1">
                    {t(`payment_${(application as any).payment_status}` as any)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('submitted_at')}</p>
                  <p className="text-sm text-on-surface">
                    {new Date((application as any).created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('id')}</p>
                  <p className="text-xs text-on-surface-variant font-mono">
                    {(application as any).id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Not found */}
        {searchParams.id && !application && (
          <div className="mt-8 text-center space-y-4">
            <Search className="w-12 h-12 text-on-surface-variant mx-auto" />
            <p className="text-on-surface-variant">{t('not_found')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
