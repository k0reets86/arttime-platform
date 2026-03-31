'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Settings } from 'lucide-react'

const FESTIVAL_STATUSES = [
  { value: 'draft', label: 'Черновик' },
  { value: 'registration_open', label: 'Регистрация открыта' },
  { value: 'registration_closed', label: 'Регистрация закрыта' },
  { value: 'active', label: 'Активный (идёт фестиваль)' },
  { value: 'completed', label: 'Завершён' },
]

interface Props {
  festival: any
  locale: string
}

export default function FestivalSettingsForm({ festival, locale }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: festival?.name ?? '',
    year: festival?.year ?? new Date().getFullYear(),
    status: festival?.status ?? 'draft',
    city: festival?.city ?? '',
    country: festival?.country ?? '',
    description: festival?.description?.ru ?? '',
    registration_deadline: festival?.registration_deadline
      ? festival.registration_deadline.split('T')[0]
      : '',
    max_participants: festival?.max_participants ?? '',
    currency: festival?.currency ?? 'EUR',
    contact_email: festival?.contact_email ?? '',
    website: festival?.website ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSaved(false)
    const res = await fetch('/api/admin/festival', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        description: { ru: form.description },
        year: parseInt(String(form.year), 10),
        max_participants: form.max_participants ? parseInt(String(form.max_participants), 10) : null,
        registration_deadline: form.registration_deadline || null,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Ошибка'); return }
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
        <Settings className="w-4 h-4 text-on-surface-variant" />
        <h2 className="font-headline font-semibold text-on-surface">Параметры фестиваля</h2>
      </div>
      <form onSubmit={handleSave} className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Название фестиваля</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="ArtTime World Talent Festival"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Год</label>
            <Input
              type="number"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
              min={2020} max={2099}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Статус</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {FESTIVAL_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Город</label>
            <Input
              value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="Берлин"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Страна</label>
            <Input
              value={form.country}
              onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              placeholder="Германия"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Дедлайн регистрации</label>
            <Input
              type="date"
              value={form.registration_deadline}
              onChange={e => setForm(f => ({ ...f, registration_deadline: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Макс. участников</label>
            <Input
              type="number"
              value={form.max_participants}
              onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
              placeholder="Без ограничений"
              min={1}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Email контакта</label>
            <Input
              type="email"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              placeholder="info@arttime.art"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Валюта</label>
            <select
              value={form.currency}
              onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="EUR">EUR €</option>
              <option value="USD">USD $</option>
              <option value="RUB">RUB ₽</option>
              <option value="UAH">UAH ₴</option>
            </select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-medium text-on-surface">Описание (RU)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="Краткое описание фестиваля..."
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-green-600">✓ Настройки сохранены</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="primary-gradient text-on-primary">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Сохранить изменения
          </Button>
        </div>
      </form>
    </div>
  )
}
