'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  GripVertical, Plus, Trash2, Clock, Music,
  Save, Loader2, Video, ChevronDown, ChevronUp,
  Download, CalendarDays, Play, Pause, ExternalLink
} from 'lucide-react'

interface ProgramSlot {
  id: string; slot_number: number; start_time: string | null; end_time: string | null
  technical_comment: string | null; day_label: string | null; stage_label: string | null
  applications: {
    id: string; name: string; performance_number: number | null; performance_title: string | null
    performance_duration_sec: number | null; nomination_id: string; video_link?: string | null
    nominations: { name_i18n: Record<string, string>; categories: any } | null
  } | null
}
interface Application {
  id: string; name: string; performance_number: number | null; performance_title: string | null
  performance_duration_sec: number | null; nomination_id: string; video_link?: string | null
}
interface Nomination { id: string; name_i18n: Record<string, string>; categories: any }

interface Props {
  festivalId: string
  programSlots: ProgramSlot[]
  nominations: Nomination[]
  approvedApps: Application[]
  locale: string
}

// ── Полноценный плеер для фонограммы ──────────────────────────────────
function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function MusicPlayer({ applicationId, locale }: { applicationId: string; locale: string }) {
  const [phase, setPhase] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle')
  const [musicUrl, setMusicUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const load = async () => {
    setPhase('loading')
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/files?locale=${locale}`)
      const data = await res.json()
      const f = (data.files ?? []).find((f: any) => f.type === 'music' && f.signedUrl)
      if (!f) { setPhase('error'); return }
      setMusicUrl(f.signedUrl)
      setFileName(f.original_name)
      setPhase('ready')
    } catch { setPhase('error') }
  }

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause() }
    else {
      document.querySelectorAll('audio').forEach(el => { if (el !== a) { el.pause() } })
      a.play()
    }
  }

  const seek = (val: number) => {
    const a = audioRef.current
    if (a) { a.currentTime = val; setCurrent(val) }
  }

  // Авто-воспроизведение после загрузки URL
  useEffect(() => {
    const a = audioRef.current
    if (!a || !musicUrl || phase !== 'ready') return
    a.load()
    const onCanPlay = () => { a.play().catch(() => null) }
    a.addEventListener('canplay', onCanPlay, { once: true })
    return () => a.removeEventListener('canplay', onCanPlay)
  }, [musicUrl, phase])

  // Биндинг событий audio-элемента
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setCurrent(0) }
    const onTimeUpdate = () => setCurrent(a.currentTime)
    const onDurationChange = () => setDuration(a.duration)
    a.addEventListener('play', onPlay)
    a.addEventListener('pause', onPause)
    a.addEventListener('ended', onEnded)
    a.addEventListener('timeupdate', onTimeUpdate)
    a.addEventListener('durationchange', onDurationChange)
    return () => {
      a.removeEventListener('play', onPlay)
      a.removeEventListener('pause', onPause)
      a.removeEventListener('ended', onEnded)
      a.removeEventListener('timeupdate', onTimeUpdate)
      a.removeEventListener('durationchange', onDurationChange)
    }
  }, [])

  if (phase === 'idle') {
    return (
      <button
        onClick={load}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs font-medium transition-colors"
      >
        <Music className="w-3.5 h-3.5" /> Слушать
      </button>
    )
  }
  if (phase === 'loading') {
    return <span className="text-xs text-purple-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Загрузка...</span>
  }
  if (phase === 'error') {
    return <span className="text-xs text-red-400 flex items-center gap-1"><Music className="w-3 h-3" /> Нет файла</span>
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl px-2.5 py-1.5 min-w-[220px] max-w-[320px]">
      {musicUrl && <audio ref={audioRef} src={musicUrl} preload="auto" />}

      {/* Play/Pause */}
      <button
        onClick={toggle}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors shrink-0"
      >
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </button>

      {/* Progress + time */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[10px] text-purple-600 truncate leading-none" title={fileName}>{fileName}</p>
        <div className="flex items-center gap-1.5">
          {/* Seekable range */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={current}
            onChange={e => seek(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-purple-600 cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(147,51,234) ${pct}%, #e9d5ff ${pct}%)`
            }}
          />
          <span className="text-[10px] text-purple-500 tabular-nums shrink-0 leading-none">
            {fmt(current)}{duration > 0 ? ` / ${fmt(duration)}` : ''}
          </span>
        </div>
      </div>

      {/* Download */}
      {musicUrl && (
        <a
          href={musicUrl}
          download={fileName}
          className="text-purple-400 hover:text-purple-700 transition-colors shrink-0"
          title="Скачать"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}

export default function ProgramEditor({ festivalId, programSlots: initial, nominations, approvedApps, locale }: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<ProgramSlot[]>(initial)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState('')
  const [dayLabel, setDayLabel] = useState('День 1')
  const [stageLabel, setStageLabel] = useState('Главная сцена')

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const fmtDuration = (sec: number | null) => {
    if (!sec) return '—'
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  // Drag-and-drop reorder
  const onDragStart = (idx: number) => setDragIdx(idx)
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const newSlots = [...slots]
    const [moved] = newSlots.splice(dragIdx, 1)
    newSlots.splice(idx, 0, moved)
    // Renumber
    const renumbered = newSlots.map((s, i) => ({ ...s, slot_number: i + 1 }))
    setSlots(renumbered)
    setDragIdx(idx)
  }
  const onDragEnd = () => setDragIdx(null)

  const moveSlot = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= slots.length) return
    const newSlots = [...slots]
    ;[newSlots[idx], newSlots[newIdx]] = [newSlots[newIdx], newSlots[idx]]
    setSlots(newSlots.map((s, i) => ({ ...s, slot_number: i + 1 })))
  }

  const addSlot = () => {
    if (!selectedAppId) return
    const app = approvedApps.find(a => a.id === selectedAppId)
    if (!app) return
    const nom = nominations.find(n => n.id === app.nomination_id)
    const newSlot: ProgramSlot = {
      id: `new-${Date.now()}`,
      slot_number: slots.length + 1,
      start_time: null, end_time: null, technical_comment: null,
      day_label: dayLabel || null,
      stage_label: stageLabel || null,
      applications: {
        ...app,
        nominations: nom ? { name_i18n: nom.name_i18n, categories: nom.categories } : null,
      },
    }
    setSlots(prev => [...prev, newSlot])
    setSelectedAppId('')
    setShowAddPanel(false)
  }

  const removeSlot = (idx: number) => {
    setSlots(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, slot_number: i + 1 })))
  }

  const updateSlotField = (idx: number, field: keyof ProgramSlot, value: string | null) => {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  const saveProgram = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/program', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          festival_id: festivalId,
          slots: slots.map(s => ({
            id: s.id.startsWith('new-') ? undefined : s.id,
            slot_number: s.slot_number,
            application_id: s.applications?.id ?? null,
            start_time: s.start_time, end_time: s.end_time,
            technical_comment: s.technical_comment,
            day_label: s.day_label, stage_label: s.stage_label,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const exportProgram = () => {
    window.open('/api/admin/export?type=program', '_blank')
  }

  // Compute running time
  const totalDuration = slots.reduce((sum, s) => sum + (s.applications?.performance_duration_sec ?? 0), 0)

  // Apps not yet in program
  const scheduledIds = new Set(slots.map(s => s.applications?.id).filter(Boolean))
  const unscheduledApps = approvedApps.filter(a => !scheduledIds.has(a.id))

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={() => setShowAddPanel(!showAddPanel)} variant="outline">
          <Plus className="w-4 h-4 mr-1.5" /> Добавить выступление
        </Button>
        <Button onClick={saveProgram} disabled={saving} className="primary-gradient text-on-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить программу
        </Button>
        <Button variant="outline" onClick={exportProgram}>
          <Download className="w-4 h-4 mr-1.5" /> Экспорт
        </Button>
        <div className="ml-auto text-sm text-on-surface-variant flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          Всего: {Math.floor(totalDuration / 60)} мин · {slots.length} выступлений ·{' '}
          {unscheduledApps.length} не включено
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Add panel */}
      {showAddPanel && (
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant border border-outline-variant/20">
          <h3 className="font-medium text-on-surface mb-3">Добавить в программу</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <select
                value={selectedAppId}
                onChange={e => setSelectedAppId(e.target.value)}
                className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Выберите участника...</option>
                {unscheduledApps.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.performance_number ? `№${a.performance_number} · ` : ''}{a.name}
                    {a.performance_title ? ` — «${a.performance_title}»` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Input value={dayLabel} onChange={e => setDayLabel(e.target.value)} placeholder="День 1" />
            </div>
            <div>
              <Input value={stageLabel} onChange={e => setStageLabel(e.target.value)} placeholder="Главная сцена" />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={addSlot} disabled={!selectedAppId} className="primary-gradient text-on-primary">
              Добавить
            </Button>
            <Button variant="outline" onClick={() => setShowAddPanel(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {/* Program list */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        {slots.length === 0 && (
          <div className="px-6 py-16 text-center text-on-surface-variant">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Программа пуста. Добавьте выступления.</p>
          </div>
        )}
        <div className="divide-y divide-outline-variant/10">
          {slots.map((slot, idx) => (
            <div
              key={slot.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDragEnd={onDragEnd}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${dragIdx === idx ? 'bg-primary/5 opacity-60' : 'hover:bg-surface-container-low'}`}
            >
              {/* Drag handle */}
              <div className="flex flex-col items-center gap-1 pt-2 shrink-0 cursor-grab">
                <GripVertical className="w-4 h-4 text-on-surface-variant" />
                <span className="text-xs font-mono text-on-surface-variant">
                  {slot.applications?.performance_number ?? slot.slot_number}
                </span>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-on-surface text-sm">{slot.applications?.name ?? '(нет участника)'}</p>
                    {slot.applications?.performance_title && (
                      <p className="text-xs text-on-surface-variant italic">«{slot.applications.performance_title}»</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {slot.applications?.nominations && (
                        <span className="text-xs text-on-surface-variant">
                          {getI18n(slot.applications.nominations.categories?.name_i18n ?? null)} /
                          {getI18n(slot.applications.nominations.name_i18n)}
                        </span>
                      )}
                      <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {fmtDuration(slot.applications?.performance_duration_sec ?? null)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {slot.day_label && <Badge variant="secondary" className="text-[10px]">{slot.day_label}</Badge>}
                    {slot.stage_label && <Badge variant="outline" className="text-[10px]">{slot.stage_label}</Badge>}
                  </div>
                </div>

                {/* ── Медиа: фонограмма + YouTube ── */}
                {slot.applications && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <MusicPlayer applicationId={slot.applications.id} locale={locale} />
                    {slot.applications.video_link && (
                      <a
                        href={slot.applications.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                        title="YouTube / видео"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Видео
                      </a>
                    )}
                  </div>
                )}

                {/* Time and comment inputs */}
                <div className="flex gap-2 flex-wrap">
                  <Input
                    type="time"
                    value={slot.start_time ?? ''}
                    onChange={e => updateSlotField(idx, 'start_time', e.target.value || null)}
                    className="w-28 h-7 text-xs"
                    placeholder="Начало"
                  />
                  <Input
                    type="time"
                    value={slot.end_time ?? ''}
                    onChange={e => updateSlotField(idx, 'end_time', e.target.value || null)}
                    className="w-28 h-7 text-xs"
                    placeholder="Конец"
                  />
                  <Input
                    value={slot.technical_comment ?? ''}
                    onChange={e => updateSlotField(idx, 'technical_comment', e.target.value || null)}
                    className="flex-1 min-w-[120px] h-7 text-xs"
                    placeholder="Технический комментарий..."
                  />
                </div>
              </div>

              {/* Move buttons + delete */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveSlot(idx, -1)} disabled={idx === 0} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveSlot(idx, 1)} disabled={idx === slots.length - 1} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => removeSlot(idx)} className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
