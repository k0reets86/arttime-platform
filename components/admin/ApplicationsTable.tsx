'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronUp, ChevronDown, Trash2, Loader2 } from 'lucide-react'

interface Application {
  id: string
  name: string
  contact_email: string
  status: string
  payment_status: string
  performance_number: number | null
  created_at: string
  categories: { name_i18n: Record<string, string> } | null
  nominations: { name_i18n: Record<string, string> } | null
}

interface SortLink {
  field: string
  label: string
  href_asc: string
  href_desc: string
}

interface Props {
  apps: Application[]
  locale: string
  currentSort: string
  currentDir: string
  sortLinks: SortLink[]
  detailBase: string
}

const statusBadge = (status: string) => {
  const map: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    submitted: 'default', approved: 'success', rejected: 'destructive', waitlist: 'secondary',
  }
  const labels: Record<string, string> = {
    submitted: 'На рассм.', approved: 'Одобрена', rejected: 'Откл.', waitlist: 'Ожидание',
  }
  return <Badge variant={map[status] ?? 'outline'}>{labels[status] ?? status}</Badge>
}

const paymentBadge = (appStatus: string, payStatus: string) => {
  // Для отклонённых — не показываем статус оплаты
  if (appStatus === 'rejected') return null
  // 'free' для одобренной — это "ожидает оплаты" (нет пакетов, но взнос всё равно нужен)
  const isPaid = payStatus === 'paid'
  return (
    <Badge variant={isPaid ? 'success' : 'warning'}>
      {isPaid ? 'Оплачено' : 'Ожидает'}
    </Badge>
  )
}

const getCatName = (cat: { name_i18n: Record<string, string> } | null) => {
  if (!cat) return '—'
  return cat.name_i18n?.ru || cat.name_i18n?.en || Object.values(cat.name_i18n)[0] || '—'
}

export default function ApplicationsTable({
  apps, locale, currentSort, currentDir, sortLinks, detailBase,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === apps.length) setSelected(new Set())
    else setSelected(new Set(apps.map(a => a.id)))
  }

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return
    const confirmed = window.confirm(
      `Удалить ${selected.size} заявк${selected.size === 1 ? 'у' : selected.size < 5 ? 'и' : ''}? Это действие нельзя отменить.`
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch('/api/admin/applications/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (res.ok) {
        setSelected(new Set())
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка удаления')
      }
    } finally {
      setDeleting(false)
    }
  }, [selected, locale, router])

  const SortHeader = ({ field, label }: { field: string; label: string }) => {
    const link = sortLinks.find(s => s.field === field)
    const isActive = currentSort === field
    const href = link ? (currentDir === 'asc' && isActive ? link.href_desc : link.href_asc) : '#'
    const Icon = isActive ? (currentDir === 'asc' ? ChevronUp : ChevronDown) : null

    return (
      <Link href={href} className="flex items-center gap-1 hover:text-primary transition-colors whitespace-nowrap">
        {label}
        {Icon && <Icon className="w-3.5 h-3.5" />}
      </Link>
    )
  }

  const allSelected = apps.length > 0 && selected.size === apps.length
  const someSelected = selected.size > 0 && !allSelected

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
          <span className="text-sm font-medium text-red-700">
            Выбрано: {selected.size}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              : <Trash2 className="w-4 h-4 mr-1.5" />
            }
            Удалить выбранные
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-red-500 hover:underline ml-auto"
          >
            Снять выделение
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/10 text-on-surface-variant">
              {/* Checkbox all */}
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleAll}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: (allSelected || someSelected) ? '#5d3fd3' : '#9ca3af',
                    backgroundColor: allSelected ? '#5d3fd3' : someSelected ? '#a391ff' : '#fff',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                  }}
                >
                  {(allSelected || someSelected) && (
                    <svg viewBox="0 0 10 10" className="w-3 h-3">
                      <path d="M1 5l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortHeader field="performance_number" label="№" />
              </th>
              <th className="text-left px-4 py-3 font-medium">
                <SortHeader field="name" label="Участник" />
              </th>
              <th className="text-left px-4 py-3 font-medium">Категория / Номинация</th>
              <th className="text-left px-4 py-3 font-medium">
                <SortHeader field="status" label="Статус" />
              </th>
              <th className="text-left px-4 py-3 font-medium">Оплата</th>
              <th className="text-left px-4 py-3 font-medium">
                <SortHeader field="created_at" label="Дата" />
              </th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {apps.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-on-surface-variant">
                  <p>Заявок не найдено</p>
                </td>
              </tr>
            )}
            {apps.map(app => {
              const isChecked = selected.has(app.id)
              return (
                <tr
                  key={app.id}
                  className={`transition-colors group cursor-pointer ${isChecked ? 'bg-primary/10 ring-1 ring-inset ring-primary/20' : 'hover:bg-surface-container-low'}`}
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleOne(app.id) }}>
                    <div
                      className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer"
                      style={{
                        borderColor: isChecked ? '#5d3fd3' : '#9ca3af',
                        backgroundColor: isChecked ? '#5d3fd3' : '#fff',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                      }}
                    >
                      {isChecked && (
                        <svg viewBox="0 0 10 10" className="w-3 h-3">
                          <path d="M1 5l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                    <Link href={`${detailBase}/${app.id}`} className="block w-full h-full py-1">
                      {app.performance_number ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${detailBase}/${app.id}`} className="block">
                      <div className="font-medium text-on-surface group-hover:text-primary transition-colors">{app.name}</div>
                      <div className="text-xs text-on-surface-variant">{app.contact_email}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${detailBase}/${app.id}`} className="block">
                      <div className="text-on-surface">{getCatName(app.categories)}</div>
                      <div className="text-xs text-on-surface-variant">{getCatName(app.nominations)}</div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${detailBase}/${app.id}`} className="block">
                      {statusBadge(app.status)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${detailBase}/${app.id}`} className="block">
                      {paymentBadge(app.status, app.payment_status)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    <Link href={`${detailBase}/${app.id}`} className="block">
                      {new Date(app.created_at).toLocaleDateString('ru')}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`${detailBase}/${app.id}`}>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
