'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard, Search, CheckCircle, Clock, Hash,
  Receipt, Loader2, ChevronRight, AlertTriangle, Banknote
} from 'lucide-react'

interface Application {
  id: string; name: string; contact_email: string; contact_phone: string | null
  status: string; payment_status: string; performance_number: number | null
  categories: any; nominations: any
  application_packages: Array<{ id: string; quantity: number; unit_price_at_purchase: number; packages: any }>
  payments: Array<{ id: string; amount: number; currency: string; status: string; provider: string; created_at: string }>
}
interface Payment {
  id: string; amount: number; currency: string; status: string; provider: string
  created_at: string; notes: string | null
  applications: { id: string; name: string; performance_number: number | null } | null
}

interface Props {
  festivalId: string
  cashierName: string
  unpaidApps: Application[]
  recentPayments: Payment[]
  locale: string
}

export default function CashierApp({ festivalId, cashierName, unpaidApps, recentPayments, locale }: Props) {
  const router = useRouter()
  const [searchQ, setSearchQ] = useState('')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const getI18n = (f: any) => f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const filteredApps = unpaidApps.filter(a =>
    !searchQ || a.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    a.contact_email.toLowerCase().includes(searchQ.toLowerCase()) ||
    (a.performance_number && String(a.performance_number).includes(searchQ))
  )

  const getTotalDue = (app: Application) => {
    const total = app.application_packages.reduce((s, p) => s + p.quantity * p.unit_price_at_purchase, 0)
    const paid = app.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
    return Math.max(0, total - paid)
  }

  const selectApp = (app: Application) => {
    setSelectedApp(app)
    setPaymentAmount(getTotalDue(app).toFixed(2))
    setError(''); setSuccess('')
  }

  const handlePayment = async () => {
    if (!selectedApp) return
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/cashier/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: selectedApp.id,
          festival_id: festivalId,
          amount: parseFloat(paymentAmount),
          currency: 'EUR',
          provider: paymentMethod,
          notes: notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setSuccess(`Платёж ${parseFloat(paymentAmount).toFixed(2)} EUR принят!`)
      setSelectedApp(null)
      setPaymentAmount('')
      setNotes('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const PAYMENT_METHODS = [
    { value: 'cash', label: 'Наличные', icon: '💵' },
    { value: 'card', label: 'Карта', icon: '💳' },
    { value: 'transfer', label: 'Перевод', icon: '🏦' },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left: App list */}
      <div className="lg:col-span-3 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <Input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="pl-9"
            placeholder="Поиск по имени, email или номеру..."
          />
        </div>

        {/* Unpaid apps list */}
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant/10 flex items-center justify-between">
            <h2 className="font-headline font-semibold text-on-surface text-sm">
              Ожидают оплаты ({filteredApps.length})
            </h2>
          </div>
          <div className="divide-y divide-outline-variant/10 max-h-96 overflow-y-auto">
            {filteredApps.length === 0 && (
              <div className="px-5 py-8 text-center text-on-surface-variant text-sm">
                {unpaidApps.length === 0 ? 'Все заявки оплачены 🎉' : 'Ничего не найдено'}
              </div>
            )}
            {filteredApps.map(app => {
              const due = getTotalDue(app)
              const isSelected = selectedApp?.id === app.id
              return (
                <button
                  key={app.id}
                  onClick={() => selectApp(app)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                    isSelected ? 'bg-primary/8' : 'hover:bg-surface-container-low'
                  }`}
                >
                  {app.performance_number && (
                    <span className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface-variant text-xs flex items-center justify-center font-mono shrink-0">
                      {app.performance_number}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {app.name}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">{app.contact_email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-on-surface text-sm">{due.toFixed(2)} €</p>
                    <Badge variant="warning" className="text-[10px]">Не оплачено</Badge>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
          <div className="px-5 py-3 border-b border-outline-variant/10">
            <h2 className="font-headline font-semibold text-on-surface text-sm">Последние платежи</h2>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {recentPayments.length === 0 && (
              <div className="px-5 py-6 text-center text-on-surface-variant text-sm">Нет платежей</div>
            )}
            {recentPayments.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                <Receipt className="w-4 h-4 text-on-surface-variant shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface">{p.applications?.name ?? '—'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(p.created_at).toLocaleString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {p.notes ? ` · ${p.notes}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-on-surface">{p.amount} {p.currency}</p>
                  <p className="text-xs text-on-surface-variant">{p.provider}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Payment form */}
      <div className="lg:col-span-2">
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden sticky top-6">
          <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-on-surface-variant" />
            <h2 className="font-headline font-semibold text-on-surface">Принять платёж</h2>
          </div>

          <div className="p-5 space-y-4">
            {!selectedApp ? (
              <div className="py-8 text-center text-on-surface-variant text-sm">
                Выберите заявку из списка
              </div>
            ) : (
              <>
                {/* Selected app info */}
                <div className="bg-surface-container-low rounded-xl p-3">
                  <p className="font-medium text-on-surface">{selectedApp.name}</p>
                  <p className="text-sm text-on-surface-variant">{selectedApp.contact_email}</p>
                  {selectedApp.contact_phone && (
                    <p className="text-sm text-on-surface-variant">{selectedApp.contact_phone}</p>
                  )}

                  {/* Package breakdown */}
                  <div className="mt-3 space-y-1.5">
                    {selectedApp.application_packages.map(pkg => (
                      <div key={pkg.id} className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">
                          {getI18n(pkg.packages?.name_i18n)} ×{pkg.quantity}
                        </span>
                        <span className="text-on-surface">{(pkg.unit_price_at_purchase * pkg.quantity).toFixed(2)} €</span>
                      </div>
                    ))}
                    {selectedApp.payments.filter(p => p.status === 'paid').length > 0 && (
                      <div className="flex justify-between text-xs pt-1 border-t border-outline-variant/10">
                        <span className="text-green-600">Уже оплачено</span>
                        <span className="text-green-600 font-medium">
                          -{selectedApp.payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0).toFixed(2)} €
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold pt-1 border-t border-outline-variant/10">
                      <span className="text-on-surface">К оплате</span>
                      <span className="text-primary">{getTotalDue(selectedApp).toFixed(2)} €</span>
                    </div>
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Способ оплаты</label>
                  <div className="flex gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button
                        key={m.value}
                        onClick={() => setPaymentMethod(m.value as any)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                          paymentMethod === m.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        <span className="block text-lg mb-0.5">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Сумма (EUR)</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    step="0.01"
                    min="0.01"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-on-surface">Заметка (необязательно)</label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Дата, квитанция и т.п."
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 shrink-0" /> {success}
                  </div>
                )}

                <Button
                  onClick={handlePayment}
                  disabled={loading || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="w-full primary-gradient text-on-primary"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    : <Banknote className="w-4 h-4 mr-2" />
                  }
                  Подтвердить оплату {paymentAmount ? `${parseFloat(paymentAmount).toFixed(2)} €` : ''}
                </Button>

                <button
                  onClick={() => { setSelectedApp(null); setPaymentAmount(''); setNotes('') }}
                  className="w-full text-sm text-on-surface-variant hover:text-on-surface"
                >
                  Отмена
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
