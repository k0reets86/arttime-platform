'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, RotateCcw, Loader2, CreditCard, Landmark } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  currency: string
  status: string
  provider: string
  created_at: string
  stripe_payment_intent_id?: string | null
}

interface Props {
  applicationId: string
  appStatus: string
  paymentStatus: string
  payments: Payment[]
  locale: string
}

export default function PaymentAdminPanel({
  applicationId,
  appStatus,
  paymentStatus,
  payments,
  locale,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [showForm, setShowForm] = useState(false)

  const isPaid = paymentStatus === 'paid'
  const isApproved = appStatus === 'approved'

  const call = async (action: 'mark_paid' | 'mark_unpaid') => {
    setLoading(action)
    try {
      const body: Record<string, unknown> = { action }
      if (action === 'mark_paid' && amount) {
        body.amount = parseFloat(amount)
        body.currency = 'EUR'
      }
      if (note) body.note = note

      const res = await fetch(`/api/admin/applications/${applicationId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setShowForm(false)
        setAmount('')
        setNote('')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка')
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Список платежей */}
      {payments.length === 0 && (
        <p className="text-sm text-on-surface-variant">Нет платежей</p>
      )}
      {payments.map((pay) => (
        <div key={pay.id} className="p-2.5 bg-surface-container-low rounded-lg">
          <div className="flex justify-between items-center gap-2">
            <Badge variant={pay.status === 'paid' ? 'success' : 'warning'}>
              {pay.status === 'paid' ? 'Оплачено' : 'Ожидает'}
            </Badge>
            <span className="font-medium text-sm text-on-surface">
              {Number(pay.amount).toFixed(2)} {pay.currency?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {pay.provider === 'stripe' || pay.stripe_payment_intent_id?.startsWith('cs_') ? (
              <CreditCard className="w-3 h-3 text-on-surface-variant" />
            ) : (
              <Landmark className="w-3 h-3 text-on-surface-variant" />
            )}
            <p className="text-xs text-on-surface-variant">
              {pay.provider === 'bank_transfer' ? 'Банковский перевод' : pay.provider}
              {' · '}
              {new Date(pay.created_at).toLocaleDateString('ru')}
            </p>
          </div>
          {pay.stripe_payment_intent_id && (
            <p className="text-xs text-on-surface-variant font-mono mt-0.5 truncate">
              {pay.stripe_payment_intent_id}
            </p>
          )}
        </div>
      ))}

      {/* Управление оплатой — только для одобренных заявок */}
      {isApproved && (
        <div className="border-t border-outline-variant/20 pt-3 space-y-2">
          {!isPaid ? (
            <>
              {!showForm ? (
                <Button
                  size="sm"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setShowForm(true)}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Отметить как оплачено (IBAN)
                </Button>
              ) : (
                <div className="space-y-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs font-medium text-emerald-800">Подтверждение IBAN-перевода</p>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Сумма (EUR)"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full h-8 px-2 text-sm rounded border border-outline-variant/40 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Примечание (необязательно)"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full h-8 px-2 text-sm rounded border border-outline-variant/40 bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => call('mark_paid')}
                      disabled={!!loading}
                    >
                      {loading === 'mark_paid'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle className="w-4 h-4 mr-1" />
                      }
                      Подтвердить
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setShowForm(false); setAmount(''); setNote('') }}
                      disabled={!!loading}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={() => {
                if (confirm('Вернуть статус "Ожидает оплаты"?')) call('mark_unpaid')
              }}
              disabled={!!loading}
            >
              {loading === 'mark_unpaid'
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : <RotateCcw className="w-4 h-4 mr-1.5" />
              }
              Сбросить оплату
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
