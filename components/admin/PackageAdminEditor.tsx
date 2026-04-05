'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Trash2, Loader2, Receipt, CreditCard,
  Landmark, Package, CheckCircle, ExternalLink
} from 'lucide-react'

interface Pkg {
  id: string
  name_i18n: Record<string, string>
  price: number
  currency: string
  description_i18n?: Record<string, string> | null
}

interface AppPackage {
  id: string
  quantity: number
  paid_amount: number | null
  packages: Pkg | null
}

interface Props {
  applicationId: string
  appStatus: string
  initialPackages: AppPackage[]
}

const getI18n = (field: Record<string, string> | null | undefined, fallback = '—') => {
  if (!field) return fallback
  return field.ru || field.en || Object.values(field)[0] || fallback
}

export default function PackageAdminEditor({ applicationId, appStatus, initialPackages }: Props) {
  const router = useRouter()
  const [packages, setPackages] = useState<AppPackage[]>(initialPackages)
  const [availablePackages, setAvailablePackages] = useState<Pkg[]>([])
  const [loadingPkgs, setLoadingPkgs] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [selectedPkgId, setSelectedPkgId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [showAddForm, setShowAddForm] = useState(false)

  // Invoice state
  const [invoiceMode, setInvoiceMode] = useState<'none' | 'select' | 'creating' | 'done'>('none')
  const [invoiceSelected, setInvoiceSelected] = useState<Set<string>>(new Set())
  const [invoiceMethod, setInvoiceMethod] = useState<'bank_transfer' | 'stripe'>('bank_transfer')
  const [invoiceResult, setInvoiceResult] = useState<{
    paymentId: string; checkoutUrl: string | null; totalAmount: number; warning?: string
  } | null>(null)
  const [creatingInvoice, setCreatingInvoice] = useState(false)

  useEffect(() => {
    const loadPkgs = async () => {
      setLoadingPkgs(true)
      try {
        const res = await fetch(`/api/admin/applications/${applicationId}/packages`)
        const data = await res.json()
        setAvailablePackages(data.packages ?? [])
      } finally {
        setLoadingPkgs(false)
      }
    }
    loadPkgs()
  }, [applicationId])

  const handleAdd = async () => {
    if (!selectedPkgId) return
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: selectedPkgId, quantity }),
      })
      if (res.ok) {
        setShowAddForm(false)
        setSelectedPkgId('')
        setQuantity(1)
        router.refresh()
      } else {
        const d = await res.json()
        alert(d.error || 'Ошибка добавления')
      }
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (appPackageId: string) => {
    if (!confirm('Удалить этот пакет из заявки?')) return
    setRemoving(appPackageId)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/packages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appPackageId }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const d = await res.json()
        alert(d.error || 'Ошибка удаления')
      }
    } finally {
      setRemoving(null)
    }
  }

  const handleCreateInvoice = async () => {
    if (invoiceSelected.size === 0) {
      alert('Выберите хотя бы один пакет для выставления счёта')
      return
    }
    setCreatingInvoice(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_ids: Array.from(invoiceSelected),
          method: invoiceMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Ошибка создания счёта')
        return
      }
      setInvoiceResult(data)
      setInvoiceMode('done')
      router.refresh()
    } finally {
      setCreatingInvoice(false)
    }
  }

  const unpaidPackages = packages.filter(p => !p.paid_amount)
  const paidPackages = packages.filter(p => p.paid_amount && p.paid_amount > 0)
  const totalPaid = paidPackages.reduce((s, p) => s + (p.paid_amount ?? 0), 0)
  const totalUnpaid = unpaidPackages.reduce(
    (s, p) => s + ((p.packages?.price ?? 0) * p.quantity), 0
  )

  return (
    <div className="space-y-4">

      {/* Existing packages list */}
      {packages.length === 0 && (
        <p className="text-sm text-on-surface-variant">Пакеты не добавлены</p>
      )}

      {packages.length > 0 && (
        <div className="space-y-2">
          {packages.map(ap => {
            const pkg = ap.packages
            const isPaid = ap.paid_amount && ap.paid_amount > 0
            return (
              <div
                key={ap.id}
                className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 border ${
                  isPaid
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-surface-container-low border-outline-variant/20'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-on-surface truncate">
                      {getI18n(pkg?.name_i18n)}
                    </p>
                    {isPaid ? (
                      <Badge variant="success" className="text-xs shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" /> Оплачено
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs shrink-0">Не оплачено</Badge>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    × {ap.quantity} · {isPaid
                      ? `${Number(ap.paid_amount).toFixed(2)} €`
                      : `${((pkg?.price ?? 0) * ap.quantity).toFixed(2)} €`
                    }
                  </p>
                </div>
                {!isPaid && (
                  <button
                    onClick={() => handleRemove(ap.id)}
                    disabled={removing === ap.id}
                    className="text-red-400 hover:text-red-600 transition-colors shrink-0"
                  >
                    {removing === ap.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                )}
              </div>
            )
          })}

          {/* Totals */}
          {(totalPaid > 0 || totalUnpaid > 0) && (
            <div className="pt-2 border-t border-outline-variant/20 space-y-0.5">
              {totalPaid > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Оплачено</span>
                  <span className="font-semibold">{totalPaid.toFixed(2)} €</span>
                </div>
              )}
              {totalUnpaid > 0 && (
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Ожидает оплаты</span>
                  <span className="font-semibold">{totalUnpaid.toFixed(2)} €</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add package form */}
      {showAddForm && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
          <p className="text-xs font-medium text-on-surface">Добавить пакет</p>
          {loadingPkgs ? (
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Загрузка...
            </div>
          ) : (
            <select
              value={selectedPkgId}
              onChange={e => setSelectedPkgId(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant/40 bg-white px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">— Выберите пакет —</option>
              {availablePackages.map(p => (
                <option key={p.id} value={p.id}>
                  {getI18n(p.name_i18n)} — {p.price} €
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs text-on-surface-variant w-20 shrink-0">Количество</label>
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="w-20 h-8 px-2 text-sm rounded border border-outline-variant/40 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="primary-gradient text-on-primary flex-1"
              onClick={handleAdd}
              disabled={adding || !selectedPkgId}
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              Добавить
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowAddForm(false); setSelectedPkgId(''); setQuantity(1) }}
              disabled={adding}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Add package button */}
      {!showAddForm && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Добавить пакет
        </Button>
      )}

      {/* Invoice section — only if unpaid packages exist */}
      {unpaidPackages.length > 0 && invoiceMode === 'none' && (
        <Button
          size="sm"
          onClick={() => {
            setInvoiceMode('select')
            setInvoiceSelected(new Set(unpaidPackages.map(p => p.id)))
          }}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white"
        >
          <Receipt className="w-4 h-4 mr-1.5" />
          Выставить доп. счёт ({unpaidPackages.length} пакет{unpaidPackages.length > 1 ? 'а' : ''} · {totalUnpaid.toFixed(2)} €)
        </Button>
      )}

      {/* Invoice selection */}
      {invoiceMode === 'select' && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
          <p className="text-sm font-semibold text-amber-900">Создание дополнительного счёта</p>

          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-800">Пакеты для включения в счёт:</p>
            {unpaidPackages.map(ap => (
              <label key={ap.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoiceSelected.has(ap.id)}
                  onChange={e => {
                    const next = new Set(invoiceSelected)
                    if (e.target.checked) next.add(ap.id)
                    else next.delete(ap.id)
                    setInvoiceSelected(next)
                  }}
                  className="rounded border-outline-variant/60 text-primary"
                />
                <span className="text-sm text-on-surface">
                  {getI18n(ap.packages?.name_i18n)} × {ap.quantity}
                  {' '}— {((ap.packages?.price ?? 0) * ap.quantity).toFixed(2)} €
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-amber-800">Способ оплаты:</p>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="bank_transfer"
                  checked={invoiceMethod === 'bank_transfer'}
                  onChange={() => setInvoiceMethod('bank_transfer')}
                  className="text-primary"
                />
                <Landmark className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">IBAN / банк</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="stripe"
                  checked={invoiceMethod === 'stripe'}
                  onChange={() => setInvoiceMethod('stripe')}
                  className="text-primary"
                />
                <CreditCard className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm text-on-surface">Stripe (онлайн)</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleCreateInvoice}
              disabled={creatingInvoice || invoiceSelected.size === 0}
            >
              {creatingInvoice
                ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                : <Receipt className="w-4 h-4 mr-1.5" />
              }
              Создать счёт
            </Button>
            <Button size="sm" variant="outline" onClick={() => setInvoiceMode('none')} disabled={creatingInvoice}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Invoice result */}
      {invoiceMode === 'done' && invoiceResult && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-900">
              Счёт создан · {invoiceResult.totalAmount.toFixed(2)} €
            </p>
          </div>
          {invoiceResult.warning && (
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              ⚠️ {invoiceResult.warning}
            </p>
          )}
          {invoiceResult.checkoutUrl && (
            <div className="space-y-1">
              <p className="text-xs text-emerald-700">Ссылка на оплату для участника:</p>
              <a
                href={invoiceResult.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline break-all"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {invoiceResult.checkoutUrl}
              </a>
              <p className="text-xs text-on-surface-variant">
                Скопируйте ссылку и отправьте участнику.
              </p>
            </div>
          )}
          {!invoiceResult.checkoutUrl && (
            <p className="text-xs text-on-surface-variant">
              Платёж ожидает ручного подтверждения (IBAN-перевод). После получения средств отметьте как оплачено в разделе «Платежи».
            </p>
          )}
          <Button size="sm" variant="outline" onClick={() => setInvoiceMode('none')}>
            Закрыть
          </Button>
        </div>
      )}
    </div>
  )
}
