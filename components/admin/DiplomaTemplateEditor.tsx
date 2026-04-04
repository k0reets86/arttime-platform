'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Save, Upload, Eye, Award } from 'lucide-react'

interface DiplomaTemplate {
  id?: string
  title: string
  subtitle: string
  body_text: string
  director_name: string
  jury_chair_name: string
  primary_color: string
  secondary_color: string
  logo_url: string | null
}

interface Props {
  festivalId: string
  initialTemplate?: DiplomaTemplate | null
  locale: string
}

const DEFAULT_TEMPLATE: DiplomaTemplate = {
  title: 'ДИПЛОМ',
  subtitle: 'ArtTime World Talent Festival',
  body_text:
    'Настоящим подтверждается, что {name} принял(а) участие в номинации «{nomination}» и набрал(а) {score} баллов.',
  director_name: '',
  jury_chair_name: '',
  primary_color: '#5d3fd3',
  secondary_color: '#ffd709',
  logo_url: null,
}

export default function DiplomaTemplateEditor({ festivalId, initialTemplate, locale }: Props) {
  const [form, setForm] = useState<DiplomaTemplate>(initialTemplate ?? DEFAULT_TEMPLATE)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof DiplomaTemplate, value: string) =>
    setForm((p) => ({ ...p, [field]: value }))

  // Preview text: replace placeholders with sample values
  const previewText = form.body_text
    .replace(/{name}/g, 'Иванова Мария')
    .replace(/{nomination}/g, 'Классический танец')
    .replace(/{score}/g, '94.5')

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'diploma-logos')
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      set('logo_url', data.url)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/admin/diploma-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ festival_id: festivalId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setForm((p) => ({ ...p, id: data.id }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Заголовок (title)</label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="ДИПЛОМ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Подзаголовок</label>
            <Input value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="ArtTime World Talent Festival" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">
              Текст диплома
              <span className="ml-1.5 text-xs text-on-surface-variant font-normal">
                плейсхолдеры: {'{name}'} {'{nomination}'} {'{score}'}
              </span>
            </label>
            <Textarea
              rows={4}
              value={form.body_text}
              onChange={(e) => set('body_text', e.target.value)}
              placeholder="Настоящим подтверждается, что {name}..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Директор (подпись)</label>
            <Input value={form.director_name} onChange={(e) => set('director_name', e.target.value)} placeholder="Иванов Иван Иванович" />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Председатель жюри (подпись)</label>
            <Input value={form.jury_chair_name} onChange={(e) => set('jury_chair_name', e.target.value)} placeholder="Петрова Анна Сергеевна" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-on-surface mb-1">Основной цвет</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer"
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-on-surface mb-1">Акцентный цвет</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={(e) => set('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer"
                />
                <Input
                  value={form.secondary_color}
                  onChange={(e) => set('secondary_color', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-1">Логотип</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <div className="flex items-center gap-3">
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="w-16 h-16 object-contain rounded-lg border border-outline-variant" />
              ) : (
                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-outline-variant flex items-center justify-center">
                  <Award className="w-6 h-6 text-on-surface-variant opacity-40" />
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {form.logo_url ? 'Заменить' : 'Загрузить'}
              </Button>
            </div>
          </div>

          {/* Mini preview card */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Предпросмотр</label>
            <div
              className="rounded-xl p-5 text-white text-center space-y-2 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.secondary_color}30)`, backgroundColor: form.primary_color }}
            >
              {form.logo_url && (
                <img src={form.logo_url} alt="logo" className="w-10 h-10 object-contain mx-auto opacity-90" />
              )}
              <div className="text-xl font-bold tracking-widest uppercase">{form.title || 'ДИПЛОМ'}</div>
              <div className="text-xs opacity-75">{form.subtitle}</div>
              <div
                className="text-xs opacity-60 leading-relaxed border-t border-white/20 pt-2 mt-2"
              >
                {previewText}
              </div>
              {(form.director_name || form.jury_chair_name) && (
                <div className="flex justify-around text-xs opacity-70 border-t border-white/20 pt-2 mt-2">
                  {form.director_name && <span>Директор: {form.director_name}</span>}
                  {form.jury_chair_name && <span>Пред. жюри: {form.jury_chair_name}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить шаблон
        </Button>
        {saved && <span className="text-sm text-green-600">✓ Сохранено</span>}
      </div>
    </div>
  )
}
