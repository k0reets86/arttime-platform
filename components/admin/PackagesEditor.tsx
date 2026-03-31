'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Package } from 'lucide-react'

interface PkgItem {
  id: string; name_i18n: Record<string, string>; description_i18n: Record<string, string>
  price: number; currency: string; active: boolean; sort_order: number; max_quantity: number
}
interface Props { festivalId: string; packages: PkgItem[]; locale: string }

export default function PackagesEditor({ festivalId, packages, locale }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PkgItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name_ru: '', name_en: '', desc_ru: '', price: '', currency: 'EUR',
    max_quantity: '1', active: true, sort_order: 0,
  })

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const openNew = () => {
    setForm({ name_ru: '', name_en: '', desc_ru: '', price: '', currency: 'EUR', max_quantity: '1', active: true, sort_order: packages.length })
    setEditing(null); setOpen(true)
  }
  const openEdit = (p: PkgItem) => {
    setForm({
      name_ru: p.name_i18n.ru || '', name_en: p.name_i18n.en || '',
      desc_ru: p.description_i18n?.ru || '',
      price: String(p.price), currency: p.currency || 'EUR',
      max_quantity: String(p.max_quantity || 1),
      active: p.active, sort_order: p.sort_order,
    })
    setEditing(p); setOpen(true)
  }

  const handleSave = async () => {
    setLoading(true); setError('')
    const body = {
      festival_id: festivalId,
      name_i18n: { ru: form.name_ru, en: form.name_en },
      description_i18n: { ru: form.desc_ru },
      price: parseFloat(form.price) || 0,
      currency: form.currency,
      max_quantity: parseInt(form.max_quantity, 10) || 1,
      active: form.active,
      sort_order: form.sort_order,
    }
    const url = editing ? `/api/admin/packages?id=${editing.id}` : '/api/admin/packages'
    const method = editing ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Ошибка'); return }
    setOpen(false); setEditing(null); router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить пакет?')) return
    setLoading(true)
    await fetch(`/api/admin/packages?id=${id}`, { method: 'DELETE' })
    setLoading(false); router.refresh()
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-on-surface-variant" />
          <h2 className="font-headline font-semibold text-on-surface">Пакеты участия</h2>
        </div>
        <Button size="sm" onClick={openNew} className="primary-gradient text-on-primary">
          <Plus className="w-4 h-4 mr-1.5" /> Добавить пакет
        </Button>
      </div>

      <div className="divide-y divide-outline-variant/10">
        {packages.length === 0 && (
          <div className="px-6 py-10 text-center text-on-surface-variant text-sm">
            Пакетов пока нет
          </div>
        )}
        {packages.map(pkg => (
          <div key={pkg.id} className="flex items-center gap-4 px-6 py-4 hover:bg-surface-container-low group">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-on-surface">{getI18n(pkg.name_i18n)}</p>
                <Badge variant={pkg.active ? 'success' : 'secondary'}>
                  {pkg.active ? 'Активен' : 'Скрыт'}
                </Badge>
              </div>
              {pkg.description_i18n?.ru && (
                <p className="text-xs text-on-surface-variant truncate mt-0.5">{pkg.description_i18n.ru}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-on-surface">{pkg.price} {pkg.currency}</p>
              <p className="text-xs text-on-surface-variant">макс. ×{pkg.max_quantity}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(pkg)} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => handleDelete(pkg.id)} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Редактировать пакет' : 'Новый пакет'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Название (RU)</label>
                <Input value={form.name_ru} onChange={e => setForm(f => ({ ...f, name_ru: e.target.value }))} placeholder="Базовый пакет" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Название (EN)</label>
                <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} placeholder="Basic package" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Описание (RU)</label>
              <textarea
                value={form.desc_ru}
                onChange={e => setForm(f => ({ ...f, desc_ru: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                placeholder="Что включает..."
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <label className="text-sm font-medium">Цена</label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="25.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Валюта</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm">
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Макс. количество на заявку</label>
              <Input type="number" min="1" value={form.max_quantity} onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="pkg-active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="rounded" />
              <label htmlFor="pkg-active" className="text-sm">Активен (виден участникам)</label>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
