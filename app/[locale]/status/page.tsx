/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from 'next-intl/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, ChevronLeft, Search } from 'lucide-react'
import StatusSearch from '@/components/apply/StatusSearch'
import { redirect } from 'next/navigation'

export default async function StatusPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { id?: string; email?: string; payment?: string }
}) {
  // Редирект старого формата ?id= на новый /status/[token]
  if (searchParams.id) {
    const suffix = searchParams.payment ? `?payment=${searchParams.payment}` : ''
    redirect(`/${locale}/status/${searchParams.id}${suffix}`)
  }

  const t = await getTranslations({ locale, namespace: 'status' })

  let applications: any[] = []
  if (searchParams.email) {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('applications')
      .select(`
        id, name, contact_email, status, payment_status, created_at,
        performance_title, performance_duration_sec,
        categories(name_i18n),
        nominations(name_i18n)
      `)
      .eq('contact_email', searchParams.email)
      .order('created_at', { ascending: false })
    applications = data ?? []
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

        {/* Список заявок по email */}
        {searchParams.email && applications.length > 0 && (
          <div className="mt-8 space-y-3">
            <p className="text-sm text-on-surface-variant">
              Найдено заявок: <strong>{applications.length}</strong>
            </p>
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/${locale}/status/${app.id}`}
                className="block bg-surface-container-lowest rounded-xl p-5 shadow-radiant hover:shadow-lg transition-shadow group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="font-headline text-base font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {app.name}
                    </h2>
                    {app.performance_title && (
                      <p className="text-sm text-on-surface-variant mt-0.5 truncate">
                        {app.performance_title}
                      </p>
                    )}
                    <p className="text-xs text-on-surface-variant mt-1">
                      Подана {new Date(app.created_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(app.status)}
                      <Badge variant={getStatusVariant(app.status)}>
                        {t(`status_${app.status}` as any)}
                      </Badge>
                    </div>
                    {app.status !== 'rejected' && (
                      <Badge variant={app.payment_status === 'paid' ? 'success' : 'warning'}>
                        {t(`payment_${app.payment_status}` as any)}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-primary mt-3 group-hover:underline">
                  Открыть заявку и чат →
                </p>
              </Link>
            ))}
          </div>
        )}

        {/* Email введён, но ничего не нашли */}
        {searchParams.email && applications.length === 0 && (
          <div className="mt-8 text-center space-y-4">
            <Search className="w-12 h-12 text-on-surface-variant mx-auto" />
            <p className="text-on-surface-variant">{t('not_found')}</p>
          </div>
        )}

        {/* Not found by ID (старый формат) */}
        {searchParams.id && applications.length === 0 && (
          <div className="mt-8 text-center space-y-4">
            <Search className="w-12 h-12 text-on-surface-variant mx-auto" />
            <p className="text-on-surface-variant">{t('not_found')}</p>
          </div>
        )}
      </div>
    </main>
  )
}
