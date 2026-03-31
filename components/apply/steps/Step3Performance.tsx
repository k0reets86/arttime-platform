'use client'

import { useTranslations } from 'next-intl'
import type { WizardData } from '../ApplyWizard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
}

function secToMinSec(sec: number): { min: number; sec: number } {
  return { min: Math.floor(sec / 60), sec: sec % 60 }
}

export default function Step3Performance({ data, updateData, errors }: Props) {
  const t = useTranslations('application')
  const { min, sec } = secToMinSec(data.performanceDurationSec)

  const updateDuration = (minutes: number, seconds: number) => {
    const total = Math.max(0, minutes * 60 + seconds)
    updateData({ performanceDurationSec: total })
  }

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
              type="number"
              min={0}
              max={30}
              value={min}
              onChange={e => updateDuration(parseInt(e.target.value) || 0, sec)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">min</span>
          </div>
          <span className="text-on-surface-variant">:</span>
          <div className="relative flex-1">
            <Input
              type="number"
              min={0}
              max={59}
              value={sec}
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
