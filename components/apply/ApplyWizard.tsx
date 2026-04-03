'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import Step1Type from './steps/Step1Type'
import Step2Info from './steps/Step2Info'
import Step3Performance from './steps/Step3Performance'
import Step4Packages from './steps/Step4Packages'
import Step5Payment from './steps/Step5Payment'

/** Информация о выбранном файле (для отображения в UI) */
export interface FileInfo {
  id: string          // временный локальный ID
  name: string
  type: 'photo' | 'music' | 'doc'
  size: number
}

export interface WizardData {
  // Step 1
  applicantType: 'solo' | 'group' | ''
  categoryId: string
  nominationId: string
  festivalId: string
  // Step 2
  name: string
  contactName: string
  contactEmail: string
  contactPhone: string
  country: string
  city: string
  langPref: string
  members: Array<{ full_name: string; birth_date: string; role: string }>
  // Step 3
  performanceTitle: string
  performanceDurationSec: number
  videoLink: string
  notes: string
  fileInfos: FileInfo[]     // для отображения выбранных файлов
  // Step 4
  selectedPackages: Array<{ packageId: string; quantity: number }>
  // Step 5 — set after Stripe redirect
  applicationId: string
}

const INITIAL_DATA: WizardData = {
  applicantType: '',
  categoryId: '',
  nominationId: '',
  festivalId: '',
  name: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  country: '',
  city: '',
  langPref: '',
  members: [],
  performanceTitle: '',
  performanceDurationSec: 0,
  videoLink: '',
  notes: '',
  fileInfos: [],
  selectedPackages: [],
  applicationId: '',
}

const STEPS = 5

interface Props {
  festivalId: string
  locale: string
}

export default function ApplyWizard({ festivalId, locale }: Props) {
  const t = useTranslations('application')
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>({ ...INITIAL_DATA, festivalId })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({})
  // Хранилище реальных File объектов (не сериализуются в JSON)
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  const updateData = useCallback((patch: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...patch }))
    // Clear errors for updated fields
    const keys = Object.keys(patch) as (keyof WizardData)[]
    setErrors(prev => {
      const next = { ...prev }
      keys.forEach(k => delete next[k])
      return next
    })
  }, [])

  const validateStep = (s: number): boolean => {
    const errs: typeof errors = {}
    if (s === 1) {
      if (!data.applicantType) errs.applicantType = t('required')
      if (!data.categoryId) errs.categoryId = t('required')
      if (!data.nominationId) errs.nominationId = t('required')
    }
    if (s === 2) {
      if (!data.name.trim()) errs.name = t('required')
      if (!data.contactName.trim()) errs.contactName = t('required')
      if (!data.contactEmail.trim()) errs.contactEmail = t('required')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail)) errs.contactEmail = t('invalid_email')
    }
    if (s === 3) {
      if (!data.performanceTitle.trim()) errs.performanceTitle = t('required')
      if (!data.performanceDurationSec || data.performanceDurationSec < 30) errs.performanceDurationSec = t('duration_min')
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!validateStep(step)) return
    if (step < STEPS) setStep(s => s + 1)
  }

  const back = () => {
    if (step > 1) setStep(s => s - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(step)) return
    setIsSubmitting(true)
    setUploadStatus('')
    try {
      // 1. Создаём заявку
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submit failed')

      const applicationId: string = json.applicationId

      // 2. Загружаем файлы если есть
      if (pendingFilesRef.current.size > 0) {
        const total = pendingFilesRef.current.size
        let uploaded = 0
        for (const [fileId, file] of pendingFilesRef.current.entries()) {
          const info = data.fileInfos.find(f => f.id === fileId)
          if (!info) continue
          setUploadStatus(`Загрузка файлов: ${uploaded + 1}/${total}...`)
          const fd = new FormData()
          fd.append('file', file)
          fd.append('applicationId', applicationId)
          fd.append('type', info.type)
          await fetch('/api/upload', { method: 'POST', body: fd })
          uploaded++
        }
      }

      // 3. Редирект на Stripe или страницу статуса
      if (json.checkoutUrl) {
        window.location.href = json.checkoutUrl
      } else {
        router.push(`/${locale}/status?id=${applicationId}`)
      }
    } catch (e) {
      console.error(e)
      setErrors({ applicationId: e instanceof Error ? e.message : 'Submit error' })
    } finally {
      setIsSubmitting(false)
      setUploadStatus('')
    }
  }

  const progress = ((step - 1) / (STEPS - 1)) * 100

  const stepLabels = [
    t('step1'), t('step2'), t('step3'), t('step4'), t('step5')
  ]

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-8 space-y-3">
        <div className="flex justify-between text-xs text-on-surface-variant">
          {stepLabels.map((label, i) => (
            <span
              key={i}
              className={`transition-colors ${i + 1 === step ? 'text-primary font-semibold' : i + 1 < step ? 'text-on-surface' : ''}`}
            >
              {i + 1 < step ? <Check className="w-3 h-3 inline mr-0.5" /> : null}
              {label}
            </span>
          ))}
        </div>
        <Progress value={progress} />
      </div>

      {/* Step content */}
      <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant min-h-[400px]">
        {step === 1 && (
          <Step1Type data={data} updateData={updateData} errors={errors} locale={locale} />
        )}
        {step === 2 && (
          <Step2Info data={data} updateData={updateData} errors={errors} />
        )}
        {step === 3 && (
          <Step3Performance
            data={data}
            updateData={updateData}
            errors={errors}
            onFileAdd={(id, file) => pendingFilesRef.current.set(id, file)}
            onFileRemove={(id) => pendingFilesRef.current.delete(id)}
          />
        )}
        {step === 4 && (
          <Step4Packages data={data} updateData={updateData} errors={errors} locale={locale} />
        )}
        {step === 5 && (
          <Step5Payment data={data} updateData={updateData} errors={errors} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={back}
          disabled={step === 1}
        >
          <ChevronLeft className="w-4 h-4" />
          {t('back') || 'Back'}
        </Button>

        {step < STEPS ? (
          <Button onClick={next}>
            {t('next') || 'Next'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="flex flex-col items-end gap-1">
            {uploadStatus && <p className="text-xs text-on-surface-variant">{uploadStatus}</p>}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="primary-gradient text-on-primary"
            >
              {isSubmitting ? t('submitting') : t('submit')}
              {!isSubmitting && <Check className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
