'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Save, X, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  applicationId: string
  initialData: {
    contact_name: string | null
    contact_email: string | null
    contact_phone: string | null
    city: string | null
    country: string | null
    performance_title: string | null
    performance_duration_sec: number | null
    video_link: string | null
    notes: string | null
  }
}

export default function ApplicationEditForm({ applicationId, initialData }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ ...initialData })

  const set = (key: string, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Конвертируем duration
      const payload = {
        ...form,
        performance_duration_sec: form.performance_duration_sec
          ? Number(form.performance_duration_sec)
          : null,
      }

      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка сохранения')
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({ ...initialData })
    setEditing(false)
    setError('')
  }

  const formatDuration = (sec: number | null) => {
    if (!sec) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const parseDuration = (val: string): number | null => {
    if (!val.trim()) return null
    const parts = val.split(':')
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10)
      const s = parseInt(parts[1], 10)
      if (!isNaN(m) && !isNaN(s)) return m * 60 + s
    }
    const n = parseInt(val, 10)
    return isNaN(n) ? null : n
  }

  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-radiant">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-wide">
          Редактирование заявки
        </h2>
        <div className="flex gap-2 items-center">
          {saved && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Сохранено
            </span>
          )}
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Редактировать
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Отмена
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="primary-gradient text-on-primary">
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  : <Save className="w-3.5 h-3.5 mr-1.5" />
                }
                Сохранить
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-3 p-2 bg-red-50 rounded-lg">{error}</p>
      )}

      <div className="space-y-4">
        {/* Контактная информация */}
        <fieldset className="space-y-3">
          <legend className="text-xs text-on-surface-variant font-medium mb-2">Контактная информация</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Контактное лицо">
              {editing
                ? <Input value={form.contact_name ?? ''} onChange={e => set('contact_name', e.target.value)} placeholder="Имя" />
                : <ReadVal value={form.contact_name} />
              }
            </Field>
            <Field label="Email">
              {editing
                ? <Input type="email" value={form.contact_email ?? ''} onChange={e => set('contact_email', e.target.value)} placeholder="email@example.com" />
                : <ReadVal value={form.contact_email} />
              }
            </Field>
            <Field label="Телефон">
              {editing
                ? <Input value={form.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} placeholder="+380..." />
                : <ReadVal value={form.contact_phone} />
              }
            </Field>
            <Field label="Город / Страна">
              {editing
                ? (
                  <div className="flex gap-2">
                    <Input value={form.city ?? ''} onChange={e => set('city', e.target.value)} placeholder="Город" />
                    <Input value={form.country ?? ''} onChange={e => set('country', e.target.value)} placeholder="Страна" className="w-28" />
                  </div>
                )
                : <ReadVal value={[form.city, form.country].filter(Boolean).join(', ')} />
              }
            </Field>
          </div>
        </fieldset>

        {/* Выступление */}
        <fieldset className="space-y-3 border-t border-outline-variant/10 pt-4">
          <legend className="text-xs text-on-surface-variant font-medium mb-2">Выступление</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Название выступления">
              {editing
                ? <Input value={form.performance_title ?? ''} onChange={e => set('performance_title', e.target.value)} placeholder="Название" />
                : <ReadVal value={form.performance_title} />
              }
            </Field>
            <Field label="Длительность (мм:сс)">
              {editing
                ? <Input
                    value={form.performance_duration_sec ? formatDuration(form.performance_duration_sec) : ''}
                    onChange={e => setForm(prev => ({ ...prev, performance_duration_sec: parseDuration(e.target.value) }))}
                    placeholder="3:30"
                  />
                : <ReadVal value={form.performance_duration_sec ? formatDuration(form.performance_duration_sec) : null} />
              }
            </Field>
          </div>
          <Field label="Ссылка на видео">
            {editing
              ? <Input value={form.video_link ?? ''} onChange={e => set('video_link', e.target.value)} placeholder="https://youtube.com/..." />
              : form.video_link
                ? <a href={form.video_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{form.video_link}</a>
                : <ReadVal value={null} />
            }
          </Field>
          <Field label="Технические требования">
            {editing
              ? <textarea
                  value={form.notes ?? ''}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Технический райдер..."
                />
              : <ReadVal value={form.notes} multiline />
            }
          </Field>
        </fieldset>

      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant mb-1">{label}</p>
      {children}
    </div>
  )
}

function ReadVal({ value, multiline }: { value: string | null | undefined; multiline?: boolean }) {
  if (!value) return <p className="text-sm text-on-surface-variant/50 italic">—</p>
  return multiline
    ? <p className="text-sm text-on-surface whitespace-pre-wrap bg-surface-container-low rounded-lg p-2">{value}</p>
    : <p className="text-sm text-on-surface">{value}</p>
}
