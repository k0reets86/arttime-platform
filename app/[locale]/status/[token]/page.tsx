/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from 'next-intl/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, ChevronLeft } from 'lucide-react'
import PaymentSection from '@/components/apply/PaymentSection'
import ParticipantChat from '@/components/apply/ParticipantChat'

export default async function StatusTokenPage({
  params: { locale, token },
  searchParams,
}: {
  params: { locale: string; token: string }
  searchParams: { payment?: string }
}) {
  const t = await getTranslations({ locale, namespace: 'status' })
  const supabase = createAdminSupabaseClient()

  const [{ data: application }, { data: festival }] = await Promise.all([
    supabase
      .from('applications')
      .select(`
        *,
        categories(name_i18n),
        nominations(name_i18n),
        payments(id, amount, currency, status)
      `)
      .eq('id', token)
      .single(),
    supabase
      .from('festivals')
      .select('settings_json')
      .limit(1)
      .single(),
  ])

  const bankDetails = (festival as any)?.settings_json?.bank ?? null
  const registrationFee = (festival as any)?.settings_json?.registration_fee ?? null

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />
      default:         return <Clock className="w-5 h-5 text-primary" />
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

  const appStatus    = (application as any)?.status
  const payStatus    = (application as any)?.payment_status
  const isApproved   = appStatus === 'approved'
  const isRejected   = appStatus === 'rejected'
  const isPaid       = payStatus === 'paid'
  const needsPayment = isApproved && !isPaid

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

        {/* Оплата прошла успешно */}
        {searchParams.payment === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <p className="text-green-700 text-sm">{t('payment_success')}</p>
          </div>
        )}

        {application ? (
          <div className="space-y-4">

            {/* ── Баннер: заявка одобрена + выбор оплаты ── */}
            {isApproved && !isPaid && (
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="font-semibold text-green-800">Заявка одобрена!</p>
                </div>
                <p className="text-sm text-green-700">
                  Для подтверждения участия необходимо оплатить регистрационный взнос.
                </p>
                <PaymentSection
                  applicationId={(application as any).id}
                  amount={registrationFee?.amount}
                  currency={registrationFee?.currency ?? 'EUR'}
                  bankDetails={bankDetails}
                />
              </div>
            )}

            {/* ── Баннер: оплачено ── */}
            {isPaid && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-green-700 text-sm font-medium">Оплата получена. Участие подтверждено!</p>
              </div>
            )}

            {/* ── Баннер: отклонено ── */}
            {isRejected && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="text-red-700 text-sm">
                  К сожалению, ваша заявка была отклонена. По вопросам обращайтесь к организаторам через чат ниже.
                </p>
              </div>
            )}

            {/* ── Карточка заявки ── */}
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
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusIcon(appStatus)}
                  <Badge variant={getStatusVariant(appStatus)}>
                    {t(`status_${appStatus}` as any)}
                  </Badge>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                <div>
                  <p className="text-xs text-on-surface-variant">{t('performance')}</p>
                  <p className="text-sm text-on-surface font-medium">
                    {(application as any).performance_title || '—'}
                  </p>
                </div>

                {/* Статус оплаты — НЕ показываем для отклонённых */}
                {!isRejected && (
                  <div>
                    <p className="text-xs text-on-surface-variant">{t('payment_status')}</p>
                    <Badge
                      variant={isPaid ? 'success' : needsPayment ? 'warning' : 'secondary'}
                      className="mt-1"
                    >
                      {isPaid ? t('payment_paid') : t('payment_pending')}
                    </Badge>
                  </div>
                )}

                <div>
                  <p className="text-xs text-on-surface-variant">{t('submitted_at')}</p>
                  <p className="text-sm text-on-surface">
                    {new Date((application as any).created_at).toLocaleDateString(locale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('id')}</p>
                  <p className="text-xs text-on-surface-variant font-mono break-all leading-relaxed">
                    {(application as any).id}
                  </p>
                </div>
              </div>

              {/* Категория + Номинация */}
              {((application as any).nominations || (application as any).categories) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                  {(application as any).categories && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Категория</p>
                      <p className="text-sm text-on-surface font-medium">
                        {(application as any).categories?.name_i18n?.[locale] ||
                         (application as any).categories?.name_i18n?.ru || '—'}
                      </p>
                    </div>
                  )}
                  {(application as any).nominations && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Номинация</p>
                      <p className="text-sm text-on-surface font-medium">
                        {(application as any).nominations?.name_i18n?.[locale] ||
                         (application as any).nominations?.name_i18n?.ru || '—'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Чат с оргкомитетом ── */}
            <ParticipantChat
              applicationId={(application as any).id}
              participantName={(application as any).contact_name || 'Участник'}
            />

            <div className="text-center mt-6">
              <Link
                href={`/${locale}/status`}
                className="text-sm text-on-surface-variant hover:text-primary transition-colors"
              >
                ← Найти другую заявку
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center space-y-4 bg-surface-container-lowest rounded-xl p-8 shadow-radiant">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-high mx-auto flex items-center justify-center">
              <XCircle className="w-8 h-8 text-on-surface-variant" />
            </div>
            <p className="font-medium text-on-surface">{t('not_found')}</p>
            <Link
              href={`/${locale}/status`}
              className="inline-block mt-2 text-sm text-primary hover:underline"
            >
              Поиск по ID или email
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
