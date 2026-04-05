'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import type { WizardData, FileInfo } from '../ApplyWizard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Upload, X, Music, Image, FileText, Loader2 } from 'lucide-react'
const uuidv4 = () => crypto.randomUUID()

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
  onFileAdd?: (id: string, file: File) => void
  onFileRemove?: (id: string) => void
}

function secToMinSec(sec: number): { min: number; sec: number } {
  return { min: Math.floor(sec / 60), sec: sec % 60 }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const FILE_ICONS: Record<string, React.ElementType> = {
  photo: Image,
  music: Music,
  doc: FileText,
}

const FILE_LABELS: Record<string, string> = {
  photo: 'Фото',
  music: 'Фонограмма',
  doc: 'Документ',
}

const ACCEPTED: Record<string, string> = {
  photo: 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,image/bmp,image/tiff',
  music: 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/aac,audio/ogg,audio/flac,audio/mp4,audio/m4a,audio/x-m4a',
  doc: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx',
}

const MAX_SIZE_MB: Record<string, number> = {
  photo: 10,
  music: 10,
  doc: 5,
}

export default function Step3Performance({ data, updateData, errors, onFileAdd, onFileRemove }: Props) {
  const t = useTranslations('application')
  const { min, sec } = secToMinSec(data.performanceDurationSec)
  const photoRef = useRef<HTMLInputElement>(null)
  const musicRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const inputRefs: Record<string, React.RefObject<HTMLInputElement>> = {
    photo: photoRef,
    music: musicRef,
    doc: docRef,
  }

  const updateDuration = (minutes: number, seconds: number) => {
    const total = Math.max(0, minutes * 60 + seconds)
    updateData({ performanceDurationSec: total })
  }

  const handleFileSelect = (type: 'photo' | 'music' | 'doc', files: FileList | null) => {
    if (!files || !onFileAdd) return
    const maxMB = MAX_SIZE_MB[type]
    const newInfos: FileInfo[] = []

    Array.from(files).forEach(file => {
      if (file.size > maxMB * 1024 * 1024) {
        alert(`Файл "${file.name}" превышает лимит ${maxMB} MB`)
        return
      }
      const id = uuidv4()
      newInfos.push({ id, name: file.name, type, size: file.size })
      onFileAdd(id, file)
    })

    if (newInfos.length > 0) {
      updateData({ fileInfos: [...data.fileInfos, ...newInfos] })
    }
    // Сброс input для повторного выбора
    const ref = inputRefs[type]
    if (ref.current) ref.current.value = ''
  }

  const handleRemove = (id: string) => {
    updateData({ fileInfos: data.fileInfos.filter(f => f.id !== id) })
    if (onFileRemove) onFileRemove(id)
  }

  const filesByType = (type: string) => data.fileInfos.filter(f => f.type === type)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step3')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step3_desc')}</p>
      </div>

      {/* Performance title */}
      <div className="space-y-2">
        <Label htmlFor="performanceTitle">{t('performanceTitle')} *</Label>
        <Input
          id="performanceTitle"
          value={data.performanceTitle}
          onChange={e => updateData({ performanceTitle: e.target.value })}
          placeholder={t('performanceTitle_placeholder')}
        />
        {errors.performanceTitle && <p className="text-xs text-red-500">{errors.performanceTitle}</p>}
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label>{t('duration')} *</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number" min={0} max={30} value={min}
              onChange={e => updateDuration(parseInt(e.target.value) || 0, sec)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">min</span>
          </div>
          <span className="text-on-surface-variant">:</span>
          <div className="relative flex-1">
            <Input
              type="number" min={0} max={59} value={sec}
              onChange={e => updateDuration(min, parseInt(e.target.value) || 0)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">sec</span>
          </div>
        </div>
        {data.performanceDurationSec > 0 && (
          <p className="text-xs text-on-surface-variant">
            {t('duration_total')}: {min}m {sec}s ({data.performanceDurationSec}s)
          </p>
        )}
        {errors.performanceDurationSec && <p className="text-xs text-red-500">{errors.performanceDurationSec}</p>}
      </div>

      {/* Video link */}
      <div className="space-y-2">
        <Label htmlFor="videoLink">{t('videoLink')}</Label>
        <Input
          id="videoLink"
          type="url"
          value={data.videoLink}
          onChange={e => updateData({ videoLink: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
        <p className="text-xs text-on-surface-variant">{t('videoLink_hint')}</p>
      </div>

      {/* File uploads */}
      <div className="space-y-4">
        <div>
          <Label>Файлы</Label>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Фото (JPG, PNG, WebP, HEIC...), фонограмма (MP3, WAV, AAC, FLAC...), документы (PDF, DOC, DOCX). Макс. 50 MB каждый.
          </p>
        </div>

        {(['photo', 'music', 'doc'] as const).map(type => {
          const Icon = FILE_ICONS[type]
          const files = filesByType(type)
          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-on-surface-variant" />
                <span className="text-sm font-medium text-on-surface">{FILE_LABELS[type]}</span>
              </div>

              {/* Загруженные файлы */}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map(info => (
                    <div key={info.id} className="flex items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-sm text-on-surface truncate">{info.name}</span>
                        <span className="text-xs text-on-surface-variant shrink-0">{formatBytes(info.size)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(info.id)}
                        className="text-on-surface-variant hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Кнопка добавить */}
              <div>
                <input
                  ref={inputRefs[type]}
                  type="file"
                  accept={ACCEPTED[type]}
                  multiple={type === 'photo'}
                  className="hidden"
                  onChange={e => handleFileSelect(type, e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => inputRefs[type].current?.click()}
                  className="text-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {files.length > 0 ? 'Добавить ещё' : `Выбрать ${FILE_LABELS[type].toLowerCase()}`}
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t('notes')}</Label>
        <Textarea
          id="notes"
          value={data.notes}
          onChange={e => updateData({ notes: e.target.value })}
          placeholder={t('notes_placeholder')}
          rows={3}
        />
      </div>
    </div>
  )
}
