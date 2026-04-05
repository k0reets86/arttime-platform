/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from 'next-intl/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, XCircle, ChevronLeft, Copy } from 'lucide-react'
import PayButton from '@/components/apply/PayButton'
import ParticipantChat from '@/components/apply/ParticipantChat'

// Авто-обновление при ожидании подтверждения оплаты
function PaymentPolling() {
  return (
    <script dangerouslySetInnerHTML={{ __html: `
      (function() {
        var url = new URL(window.location.href);
        if (url.searchParams.get('payment') === 'success') {
          setTimeout(function() { window.location.reload(); }, 5000);
        }
      })();
    ` }} />
  )
}

export default async function StatusTokenPage({
  params: { locale, token },
  searchParams,
}: {
  params: { locale: string; token: string }
  searchParams: { payment?: string }
}) {
  const t = await getTranslations({ locale, namespace: 'status' })
  const supabase = createAdminSupabaseClient()

  const { data: application } = await supabase
    .from('applications')
    .select(`
      *,
      categories(name_i18n),
      nominations(name_i18n),
      application_packages(*, packages(*)),
      payments(id, amount, currency, status)
    `)
    .eq('id', token)
    .single()

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

  // Проверяем, нужна ли кнопка оплаты
  // Если ?payment=success — платёж только что прошёл, ждём подтверждения вебхука
  const justPaid = searchParams.payment === 'success'
  const needsPayment = application
    && (application as any).status === 'approved'
    && (application as any).payment_status === 'pending'
    && !justPaid

  const pendingPayment = needsPayment
    ? ((application as any).payments ?? []).find((p: any) => p.status === 'pending')
    : null

  return (
    <main className="min-h-screen bg-surface">
      <nav className="flex items-center justify-between px-8 py-4 glass sticky top-0 z-50">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="font-headline text-xl font-bold text-primary">ArtTime</span>
        </Link>
        <LanguageSwitcher />
      </nav>

      <PaymentPolling />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-2xl">
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-2 text-center">
          {t('title')}
        </h1>
        <p className="text-on-surface-variant text-center mb-8">{t('subtitle')}</p>

        {/* ── Единый банер статуса оплаты (только один из вариантов) ── */}
        {justPaid && (application as any)?.payment_status === 'paid' ? (
          /* Вебхук уже обработан — оплата подтверждена */
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="text-green-700 text-sm font-medium">Оплата прошла успешно! Ваша заявка принята к рассмотрению.</p>
              <p className="text-green-600 text-xs mt-0.5">Организаторы свяжутся с вами в ближайшее время.</p>
            </div>
          </div>
        ) : justPaid ? (
          /* Платёж прошёл, вебхук ещё обрабатывается */
          <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <p className="font-semibold text-blue-800">Оплата обрабатывается</p>
            </div>
            <p className="text-sm text-blue-700">
              Платёж получен и проходит проверку. Статус обновится автоматически — обновите страницу через минуту.
            </p>
          </div>
        ) : null}

        {application ? (
          <div className="space-y-4">
            {/* ── Банер одобрения + оплата ── */}
            {needsPayment && (
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-semibold text-green-800">Заявка одобрена!</p>
                </div>
                <p className="text-sm text-green-700">
                  Для подтверждения участия необходимо оплатить регистрационный взнос.
                </p>
                {pendingPayment && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                      Сумма: <strong>{pendingPayment.amount} {pendingPayment.currency}</strong>
                    </span>
                    <PayButton applicationId={(application as any).id} />
                  </div>
                )}
              </div>
            )}

            {/* ── Банер оплачено (только если не пришли с ?payment=success — там уже показали баннер выше) ── */}
            {!justPaid && (application as any).payment_status === 'paid' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                <p className="text-green-700 text-sm font-medium">Оплата получена. Ваша заявка на рассмотрении у организаторов.</p>
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
                  {getStatusIcon((application as any).status)}
                  <Badge variant={getStatusVariant((application as any).status)}>
                    {t(`status_${(application as any).status}` as any)}
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
                <div>
                  <p className="text-xs text-on-surface-variant">{t('payment_status')}</p>
                  {(application as any).status === 'rejected' ? (
                    /* Отклонённая заявка — оплата не требуется */
                    <Badge variant="secondary" className="mt-1">—</Badge>
                  ) : justPaid && (application as any).payment_status !== 'paid' ? (
                    <Badge variant="secondary" className="mt-1">
                      Ожидает подтверждения
                    </Badge>
                  ) : (
                    <Badge
                      variant={(application as any).payment_status === 'paid' ? 'success' : 'warning'}
                      className="mt-1"
                    >
                      {t(`payment_${(application as any).payment_status}` as any)}
                    </Badge>
                  )}
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('submitted_at')}</p>
                  <p className="text-sm text-on-surface">
                    {new Date((application as any).created_at).toLocaleDateString(locale)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">{t('id')}</p>
                  {/* Полный ID — для поиска */}
                  <p className="text-xs text-on-surface-variant font-mono break-all leading-relaxed">
                    {(application as any).id}
                  </p>
                </div>
              </div>

              {/* Nomination + Category */}
              {((application as any).nominations || (application as any).categories) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                  {(application as any).categories && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Категория</p>
                      <p className="text-sm text-on-surface font-medium">
                        {(application as any).categories?.name_i18n?.ru || '—'}
                      </p>
                    </div>
                  )}
                  {(application as any).nominations && (
                    <div>
                      <p className="text-xs text-on-surface-variant">Номинация</p>
                      <p className="text-sm text-on-surface font-medium">
                        {(application as any).nominations?.name_i18n?.ru || '—'}
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

            {/* Back to search */}
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
          /* Not found */
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
