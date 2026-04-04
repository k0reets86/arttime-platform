'use client'

import { useState } from 'react'
import { CreditCard, Loader2, Building2, Copy, CheckCheck } from 'lucide-react'

interface BankDetails {
  iban: string
  bic: string
  recipient: string
  bank_name: string
}

interface Props {
  applicationId: string
  amount?: number
  currency?: string
  bankDetails?: BankDetails
}

export default function PaymentSection({ applicationId, amount, currency = 'EUR', bankDetails }: Props) {
  const [mode, setMode] = useState<'choose' | 'stripe' | 'iban'>('choose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const handleStripe = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка оплаты')
      if (data.checkoutUrl) window.location.href = data.checkoutUrl
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
      setLoading(false)
    }
  }

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const referenceCode = `ARTTIME-${applicationId.substring(0, 8).toUpperCase()}`

  // IBAN детали
  if (mode === 'iban' && bankDetails) {
    const fields = [
      { label: 'Получатель', value: bankDetails.recipient },
      { label: 'IBAN',       value: bankDetails.iban },
      { label: 'BIC / SWIFT', value: bankDetails.bic },
      { label: 'Банк',       value: bankDetails.bank_name },
      { label: 'Назначение платежа', value: referenceCode, highlight: true },
    ]

    return (
      <div className="space-y-3">
        <p className="text-sm font-semibold text-green-800">Банковский перевод</p>

        <div className="bg-white rounded-xl border border-green-200 divide-y divide-green-100">
          {fields.map(({ label, value, highlight }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className={`text-sm font-mono break-all ${highlight ? 'font-bold text-green-700' : 'text-gray-800'}`}>
                  {value}
                </p>
              </div>
              <button
                onClick={() => copyText(value, label)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                title="Скопировать"
              >
                {copied === label
                  ? <CheckCheck className="w-4 h-4 text-green-500" />
                  : <Copy className="w-4 h-4 text-gray-400" />
                }
              </button>
            </div>
          ))}

          {amount && (
            <div className="px-4 py-3 bg-green-50 rounded-b-xl">
              <p className="text-xs text-gray-500 mb-0.5">Сумма перевода</p>
              <p className="text-base font-bold text-green-800">{amount} {currency}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-green-700">
          Укажите «Назначение платежа» точно как указано выше — это поможет нам идентифицировать ваш платёж.
          После получения перевода мы подтвердим участие в течение 1–2 рабочих дней.
        </p>

        <button
          onClick={() => setMode('choose')}
          className="text-xs text-green-700 underline hover:no-underline"
        >
          ← Выбрать другой способ
        </button>
      </div>
    )
  }

  // Выбор способа оплаты
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-green-800">Выберите способ оплаты:</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Stripe */}
        <button
          onClick={handleStripe}
          disabled={loading}
          className="flex flex-col items-center gap-2.5 p-5 bg-white border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
            : <CreditCard className="w-7 h-7 text-green-600" />
          }
          <div className="text-center">
            <p className="text-sm font-semibold text-green-800">Карта</p>
            <p className="text-xs text-green-600 mt-0.5">Visa · Mastercard</p>
          </div>
        </button>

        {/* IBAN */}
        {bankDetails && (
          <button
            onClick={() => setMode('iban')}
            className="flex flex-col items-center gap-2.5 p-5 bg-white border-2 border-green-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <Building2 className="w-7 h-7 text-green-600" />
            <div className="text-center">
              <p className="text-sm font-semibold text-green-800">Банк</p>
              <p className="text-xs text-green-600 mt-0.5">IBAN / перевод</p>
            </div>
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
