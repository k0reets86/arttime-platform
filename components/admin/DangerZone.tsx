'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react'

interface Props {
  festivalId: string
  locale: string
}

export default function DangerZone({ festivalId, locale }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ applications: number } | null>(null)

  async function handleClear() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/festival/clear-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: input }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      setDone(data.deleted)
      setOpen(false)
      setInput('')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 border-2 border-red-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <div>
          <h3 className="font-semibold text-red-700 text-sm">Опасная зона</h3>
          <p className="text-xs text-red-500">Только для супер-администратора. Необратимые действия.</p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {done && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✓ Удалено заявок: {done.applications}. Данные фестиваля очищены.
          </div>
        )}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-medium text-on-surface text-sm">Очистить все данные фестиваля</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Удалит все заявки, файлы, треки, программу, платежи и оценки. Настройки фестиваля сохранятся.
            </p>
          </div>
          <button
            onClick={() => { setOpen(true); setDone(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Очистить данные
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="font-headline font-bold text-on-surface text-lg">Вы уверены?</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Это действие <strong>необратимо</strong>. Будут удалены все заявки, файлы, фонограммы, программа и платежи фестиваля.
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-on-surface block mb-2">
                Для подтверждения введите слово <code className="text-red-600 bg-red-50 px-1 rounded">ОЧИСТИТЬ</code>
              </label>
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="ОЧИСТИТЬ"
                className="w-full border-2 border-outline-variant/40 rounded-xl px-4 py-2.5 text-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:border-red-400 font-mono"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setOpen(false); setInput(''); setError('') }}
                className="flex-1 py-2.5 rounded-xl border-2 border-outline-variant/30 text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleClear}
                disabled={loading || input !== 'ОЧИСТИТЬ'}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {loading ? 'Удаление...' : 'Удалить всё'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
