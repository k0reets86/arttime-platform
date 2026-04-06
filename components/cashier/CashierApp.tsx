'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CreditCard, Search, CheckCircle, Receipt,
  Loader2, ChevronRight, AlertTriangle,
  Banknote, Ticket, BarChart3, QrCode
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
interface TicketType {
  id: string; name_i18n: any; price: number; description_i18n: any
}
interface Props {
  festivalId: string
  cashierName: string
  unpaidApps: Application[]
  recentPayments: Payment[]
  ticketTypes: TicketType[]
  locale: string
}

const getI18n = (f: any) => f?.ru || f?.en || Object.values(f ?? {})[0] || '—'
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Наличные', icon: '💵' },
  { value: 'card', label: 'Карта', icon: '💳' },
  { value: 'transfer', label: 'Перевод', icon: '🏦' },
]

// ─── Tab 1: Продажа билетов ──────────────────────────────────────────────
function TicketSalesTab({ festivalId, ticketTypes }: { festivalId: string; ticketTypes: TicketType[] }) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<TicketType | null>(ticketTypes[0] ?? null)
  const [qty, setQty] = useState(1)
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [buyerName, setBuyerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [issuedQr, setIssuedQr] = useState<string | null>(null)
  const [issuedInfo, setIssuedInfo] = useState<{ name: string; amount: number; qty: number } | null>(null)

  const total = selectedType ? selectedType.price * qty : 0

  async function handleSell() {
    if (!selectedType) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/cashier/sell-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          festival_id: festivalId,
          ticket_type_id: selectedType.id,
          quantity: qty,
          provider: method,
          buyer_name: buyerName || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setIssuedQr(data.ticket_token)
      setIssuedInfo({ name: buyerName, amount: total, qty })
      setQty(1); setBuyerName('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (issuedQr) {
    const appUrl = (typeof window !== 'undefined' ? window.location.origin : '')
    const verifyUrl = `${appUrl}/verify/ticket/${issuedQr}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(verifyUrl)}`
    return (
      <div className="max-w-sm mx-auto text-center space-y-5 py-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface">Билет выдан!</h3>
          {issuedInfo?.name && (
            <p className="text-sm font-medium text-primary mt-0.5">{issuedInfo.name}</p>
          )}
          <p className="text-sm text-on-surface-variant mt-0.5">
            {issuedInfo?.qty && issuedInfo.qty > 1 ? `${issuedInfo.qty} билета · ` : ''}{issuedInfo?.amount.toFixed(2)} €
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl inline-block shadow-radiant border border-outline-variant/10">
          <img src={qrUrl} alt="QR код билета" className="w-52 h-52" />
          {issuedInfo?.qty && issuedInfo.qty > 1 && (
            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-sm font-bold rounded-full">
                <Ticket className="w-3.5 h-3.5" /> × {issuedInfo.qty}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-on-surface-variant">Покажите или распечатайте QR-код</p>
        <Button onClick={() => { setIssuedQr(null); setIssuedInfo(null) }} className="w-full">
          Следующий билет
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="font-medium text-on-surface text-sm">Тип билета</h3>
        {ticketTypes.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-8 text-center text-on-surface-variant text-sm">
            Нет доступных типов билетов.<br />Создайте пакеты в Настройках.
          </div>
        ) : (
          <div className="space-y-2">
            {ticketTypes.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-colors text-left ${
                  selectedType?.id === t.id ? 'border-primary bg-primary/8' : 'border-outline-variant/30 bg-surface-container-lowest hover:bg-surface-container-low'
                }`}>
                <div className="flex-1">
                  <p className={`font-medium text-sm ${selectedType?.id === t.id ? 'text-primary' : 'text-on-surface'}`}>{getI18n(t.name_i18n)}</p>
                  {t.description_i18n && <p className="text-xs text-on-surface-variant mt-0.5">{getI18n(t.description_i18n)}</p>}
                </div>
                <span className={`font-bold ${selectedType?.id === t.id ? 'text-primary' : 'text-on-surface'}`}>{t.price.toFixed(2)} €</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-on-surface mb-1.5 block">Имя покупателя (необязательно)</label>
          <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Иванов Иван" />
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface mb-1.5 block">Количество</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center font-bold text-lg text-on-surface">−</button>
            <span className="text-xl font-bold text-on-surface w-8 text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)}
              className="w-10 h-10 rounded-xl bg-surface-container-low hover:bg-surface-container-high flex items-center justify-center font-bold text-lg text-on-surface">+</button>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-on-surface mb-1.5 block">Способ оплаты</label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} onClick={() => setMethod(m.value as any)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                  method === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
                }`}>
                <span className="block text-lg mb-0.5">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
        </div>
        {selectedType && (
          <div className="bg-surface-container-low rounded-xl p-4 flex justify-between items-center">
            <span className="text-on-surface-variant">Итого:</span>
            <span className="text-xl font-bold text-primary">{total.toFixed(2)} €</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <Button onClick={handleSell} disabled={loading || !selectedType} className="w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <QrCode className="w-4 h-4 mr-2" />}
          Продать и выдать QR
        </Button>
      </div>
    </div>
  )
}

// ─── Tab 2: Баланс ───────────────────────────────────────────────────────
function BalanceTab({ recentPayments, cashierName }: { recentPayments: Payment[]; cashierName: string }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayPayments = recentPayments.filter(p => new Date(p.created_at) >= today && p.status === 'paid')
  const totalCash = todayPayments.filter(p => p.provider === 'cash').reduce((s, p) => s + p.amount, 0)
  const totalCard = todayPayments.filter(p => p.provider === 'card').reduce((s, p) => s + p.amount, 0)
  const totalTransfer = todayPayments.filter(p => p.provider === 'transfer').reduce((s, p) => s + p.amount, 0)
  const totalAll = totalCash + totalCard + totalTransfer
  const todayStr = today.toLocaleDateString('ru', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface">Дневной отчёт</h3>
          <p className="text-sm text-on-surface-variant">{todayStr} · Кассир: {cashierName}</p>
        </div>
        <button onClick={() => window.print()} className="text-sm text-primary hover:underline flex items-center gap-1">
          <Receipt className="w-4 h-4" /> Печать
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Наличные', value: totalCash, icon: '💵' },
          { label: 'Карта', value: totalCard, icon: '💳' },
          { label: 'Перевод', value: totalTransfer, icon: '🏦' },
          { label: 'ИТОГО', value: totalAll, icon: '📊' },
        ].map(item => (
          <div key={item.label} className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant text-center">
            <span className="text-2xl">{item.icon}</span>
            <p className="text-lg font-bold mt-1 text-primary">{item.value.toFixed(2)} €</p>
            <p className="text-xs text-on-surface-variant">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant/10">
          <h4 className="font-medium text-on-surface text-sm">Операции за сегодня ({todayPayments.length})</h4>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {todayPayments.length === 0 ? (
            <div className="px-5 py-8 text-center text-on-surface-variant text-sm">Сегодня платежей не было</div>
          ) : todayPayments.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <span className="text-xl">{PAYMENT_METHODS.find(m => m.value === p.provider)?.icon ?? '💰'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface">{p.applications?.name ?? 'Билет'}</p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(p.created_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                  {p.notes ? ` · ${p.notes}` : ''}
                </p>
              </div>
              <span className="font-bold text-on-surface">{p.amount.toFixed(2)} €</span>
            </div>
          ))}
        </div>
        {todayPayments.length > 0 && (
          <div className="px-5 py-3 border-t border-outline-variant/10 flex justify-between bg-surface-container-low">
            <span className="font-medium text-on-surface">Всего за день</span>
            <span className="font-bold text-primary text-lg">{totalAll.toFixed(2)} €</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 3: Поиск ────────────────────────────────────────────────────────
function SearchTab({ unpaidApps }: { unpaidApps: Application[] }) {
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Application | null | undefined>(undefined)

  function handleSearch() {
    const q = query.trim().toLowerCase()
    if (!q) return
    const result = unpaidApps.find(a =>
      a.name.toLowerCase().includes(q) ||
      a.contact_email.toLowerCase().includes(q) ||
      String(a.performance_number ?? '') === q
    ) ?? null
    setFound(result)
  }

  const statusLabel: Record<string, string> = { submitted: 'На рассмотрении', approved: 'Одобрена', rejected: 'Отклонена', waitlist: 'Лист ожидания' }
  const payStatusLabel: Record<string, string> = { pending: 'Не оплачено', partial: 'Частично', paid: 'Оплачено' }
  const payVariant: Record<string, any> = { pending: 'warning', partial: 'warning', paid: 'success' }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <label className="text-sm font-medium text-on-surface mb-1.5 block">Поиск заявки для подтверждения участия</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="pl-9" placeholder="Имя, email или № выступления" />
          </div>
          <Button onClick={handleSearch}>Найти</Button>
        </div>
        <p className="text-xs text-on-surface-variant mt-1.5">Введите имя, email или номер выступления (например: 42)</p>
      </div>
      {found === null && (
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant text-center">
          <Search className="w-8 h-8 mx-auto text-on-surface-variant mb-2 opacity-40" />
          <p className="text-on-surface-variant text-sm">Заявка не найдена</p>
        </div>
      )}
      {found && (
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
          <div className={`px-5 py-4 flex items-center gap-3 ${found.payment_status === 'paid' ? 'bg-green-50' : 'bg-amber-50'}`}>
            {found.payment_status === 'paid'
              ? <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
              : <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />}
            <div>
              <p className="font-bold text-on-surface">{found.name}</p>
              <p className={`text-sm ${found.payment_status === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
                {found.payment_status === 'paid' ? '✓ Участие подтверждено' : '⚠ Оплата не завершена'}
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-on-surface-variant">Email</span><p className="text-on-surface font-medium">{found.contact_email}</p></div>
              {found.contact_phone && <div><span className="text-on-surface-variant">Телефон</span><p className="text-on-surface font-medium">{found.contact_phone}</p></div>}
              {found.performance_number && <div><span className="text-on-surface-variant">№ выступления</span><p className="text-on-surface font-bold text-lg">#{found.performance_number}</p></div>}
              <div><span className="text-on-surface-variant">Статус</span><p><Badge variant={found.status === 'approved' ? 'success' : 'default'}>{statusLabel[found.status] ?? found.status}</Badge></p></div>
            </div>
            <div className="flex gap-2">
              <Badge variant={payVariant[found.payment_status] ?? 'outline'}>{payStatusLabel[found.payment_status] ?? found.payment_status}</Badge>
            </div>
            {found.application_packages.length > 0 && (
              <div className="border-t border-outline-variant/10 pt-3 space-y-1.5">
                <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">Пакеты</p>
                {found.application_packages.map(pkg => (
                  <div key={pkg.id} className="flex justify-between text-sm">
                    <span>{getI18n(pkg.packages?.name_i18n)} ×{pkg.quantity}</span>
                    <span className="font-medium">{(pkg.unit_price_at_purchase * pkg.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────
export default function CashierApp({ festivalId, cashierName, unpaidApps, recentPayments, ticketTypes, locale }: Props) {
  return (
    <Tabs defaultValue="tickets" className="space-y-6">
      <TabsList>
        <TabsTrigger value="tickets" className="flex items-center gap-1.5">
          <Ticket className="w-4 h-4" /> Продажа билетов
        </TabsTrigger>
        <TabsTrigger value="balance" className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4" /> Баланс
        </TabsTrigger>
        <TabsTrigger value="search" className="flex items-center gap-1.5">
          <Search className="w-4 h-4" /> Поиск
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tickets">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant border border-outline-variant/10">
          <TicketSalesTab festivalId={festivalId} ticketTypes={ticketTypes} />
        </div>
      </TabsContent>

      <TabsContent value="balance">
        <BalanceTab recentPayments={recentPayments} cashierName={cashierName} />
      </TabsContent>

      <TabsContent value="search">
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant border border-outline-variant/10">
          <SearchTab unpaidApps={unpaidApps} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
