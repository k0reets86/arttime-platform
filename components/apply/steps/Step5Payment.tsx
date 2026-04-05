'use client'

import { useTranslations } from 'next-intl'
import type { WizardData } from '../ApplyWizard'
import { CheckCircle, CreditCard, FileText, Building2 } from 'lucide-react'

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Step5Payment({ data, updateData: _u, errors }: Props) {
  const t = useTranslations('application')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step5')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step5_desc')}</p>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">
          {t('review_summary')}
        </h3>

        <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-on-surface">{data.name || '—'}</p>
              <p className="text-xs text-on-surface-variant">{data.contactEmail}</p>
            </div>
          </div>

          {data.performanceTitle && (
            <div className="pl-11 text-sm text-on-surface-variant">
              🎭 {data.performanceTitle}
              {data.performanceDurationSec > 0 && (
                <span className="ml-2 text-xs">
                  ({Math.floor(data.performanceDurationSec / 60)}m{data.performanceDurationSec % 60}s)
                </span>
              )}
            </div>
          )}

          {data.selectedPackages.length > 0 && (
            <div className="pl-11 text-sm text-on-surface-variant">
              📦 {data.selectedPackages.length} {t('packages_selected')}
            </div>
          )}
        </div>
      </div>

      {/* Payment info */}
      <div className="space-y-3">
        <h3 className="font-semibold text-on-surface text-sm uppercase tracking-wide text-on-surface-variant">
          Способ оплаты
        </h3>
        <p className="text-xs text-on-surface-variant">
          Оплата производится <strong>после одобрения заявки</strong> администратором.
          Вы получите уведомление со ссылкой для оплаты.
        </p>

        {/* Stripe */}
        <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-on-surface">{t('payment_stripe')}</p>
            <p className="text-xs text-on-surface-variant">{t('payment_stripe_desc')}</p>
          </div>
        </div>

        {/* IBAN / Банковский перевод */}
        <div className="bg-surface-container-low rounded-xl p-4 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-on-surface">Банк / IBAN-перевод</p>
            <p className="text-xs text-on-surface-variant">
              Оплата банковским переводом на расчётный счёт организатора.
              Реквизиты придут в письме после одобрения. После оплаты — отправьте скриншот / квитанцию организатору.
            </p>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-lg">
          <CheckCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('terms_agreement')}
          </p>
        </div>
      </div>

      {errors.applicationId && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {errors.applicationId}
        </div>
      )}
    </div>
  )
}
