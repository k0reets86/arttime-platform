'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, BellOff, Plus, Check, Loader2, X, User } from 'lucide-react'

interface AttentionRecord {
  id: string
  note: string | null
  is_resolved: boolean
  created_at: string
  assignee: { id: string; display_name: string; role: string; email: string }
  assigner: { id: string; display_name: string } | null
}

interface AdminUser {
  id: string
  display_name: string
  role: string
  email: string
}

interface Props {
  applicationId: string
  adminUsers: AdminUser[]  // список администраторов, передаётся с сервера
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Супер-админ',
  organizer: 'Организатор',
  judge: 'Судья',
  cashier: 'Кассир',
  viewer: 'Просмотр',
}

export default function AdminAttention({ applicationId, adminUsers }: Props) {
  const [records, setRecords] = useState<AttentionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadAttention = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/attention`)
      if (!res.ok) return
      const data = await res.json()
      setRecords(data.attention ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    loadAttention()
  }, [loadAttention])

  const handleCreate = async () => {
    if (!selectedAdmin) {
      setError('Выберите администратора')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/applications/${applicationId}/attention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: selectedAdmin, note: note.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setShowForm(false)
      setSelectedAdmin('')
      setNote('')
      loadAttention()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleResolve = async (id: string, currentResolved: boolean) => {
    try {
      await fetch(`/api/applications/${applicationId}/attention`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attention_id: id, is_resolved: !currentResolved }),
      })
      loadAttention()
    } catch {
      // ignore
    }
  }

  const openRecords = records.filter(r => !r.is_resolved)
  const resolvedRecords = records.filter(r => r.is_resolved)

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-wide">
            Назначить внимание
          </h2>
          {openRecords.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">
              {openRecords.length}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => { setShowForm(!showForm); setError('') }}>
          {showForm ? <X className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          {showForm ? 'Отмена' : 'Назначить'}
        </Button>
      </div>

      {/* Форма назначения */}
      {showForm && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
          <p className="text-xs font-medium text-amber-700">Обратить внимание администратора на эту заявку</p>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Кому</label>
            <select
              value={selectedAdmin}
              onChange={e => setSelectedAdmin(e.target.value)}
              className="w-full h-9 rounded-lg border border-outline-variant/40 bg-white px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <option value="">— Выберите администратора —</option>
              {adminUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.display_name} ({ROLE_LABELS[u.role] ?? u.role})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-on-surface-variant mb-1 block">Комментарий (необязательно)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-outline-variant/40 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
              placeholder="Что именно нужно проверить..."
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button size="sm" onClick={handleCreate} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-white">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Bell className="w-3.5 h-3.5 mr-1.5" />}
            Назначить
          </Button>
        </div>
      )}

      {/* Открытые */}
      {loading && (
        <div className="flex items-center gap-2 text-on-surface-variant/50 text-sm py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Загрузка...
        </div>
      )}

      {!loading && records.length === 0 && (
        <p className="text-sm text-on-surface-variant/50 italic py-2">
          Нет активных назначений
        </p>
      )}

      <div className="space-y-2">
        {openRecords.map(r => (
          <AttentionItem key={r.id} record={r} onToggle={handleToggleResolve} />
        ))}
      </div>

      {/* Закрытые (свёрнуто) */}
      {resolvedRecords.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface select-none">
            Выполненные ({resolvedRecords.length})
          </summary>
          <div className="space-y-2 mt-2">
            {resolvedRecords.map(r => (
              <AttentionItem key={r.id} record={r} onToggle={handleToggleResolve} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

function AttentionItem({
  record,
  onToggle,
}: {
  record: AttentionRecord
  onToggle: (id: string, resolved: boolean) => void
}) {
  const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Супер-админ',
    organizer: 'Организатор',
    judge: 'Судья',
    cashier: 'Кассир',
    viewer: 'Просмотр',
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
      record.is_resolved
        ? 'bg-surface-container-low border-outline-variant/10 opacity-60'
        : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-on-surface">{record.assignee.display_name}</span>
          <span className="text-xs text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded">
            {ROLE_LABELS[record.assignee.role] ?? record.assignee.role}
          </span>
        </div>
        {record.note && (
          <p className="text-xs text-on-surface-variant mt-0.5 italic">{record.note}</p>
        )}
        <p className="text-xs text-on-surface-variant/50 mt-1">
          {record.assigner ? `от ${record.assigner.display_name} · ` : ''}
          {new Date(record.created_at).toLocaleDateString('ru')}
          {record.is_resolved && ' · Выполнено'}
        </p>
      </div>
      <button
        onClick={() => onToggle(record.id, record.is_resolved)}
        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          record.is_resolved
            ? 'bg-surface-container hover:bg-surface-container-low text-on-surface-variant'
            : 'bg-green-100 hover:bg-green-200 text-green-700'
        }`}
        title={record.is_resolved ? 'Переоткрыть' : 'Отметить выполненным'}
      >
        {record.is_resolved ? <BellOff className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
