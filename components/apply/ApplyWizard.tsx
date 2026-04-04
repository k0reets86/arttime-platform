'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft, ChevronRight, Check,
  Users, User, Music, Package, CreditCard, HelpCircle, ArrowRight
} from 'lucide-react'
import Step1Type from './steps/Step1Type'
import Step2Info from './steps/Step2Info'
import Step3Performance from './steps/Step3Performance'
import Step4Packages from './steps/Step4Packages'
import Step5Payment from './steps/Step5Payment'

/** Информация о выбранном файле (для отображения в UI) */
export interface FileInfo {
  id: string
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
  fileInfos: FileInfo[]
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
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  const updateData = useCallback((patch: Partial<WizardData>) => {
    setData(prev => ({ ...prev, ...patch }))
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
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Submit failed')

      const applicationId: string = json.applicationId

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

  const stepDefs = [
    { label: t('step1'), Icon: Users },
    { label: t('step2'), Icon: User },
    { label: t('step3'), Icon: Music },
    { label: t('step4'), Icon: Package },
    { label: t('step5'), Icon: CreditCard },
  ]

  const sidebarProgress = ((step - 1) / (STEPS - 1)) * 100

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

        {/* ── LEFT SIDEBAR ── */}
        <div className="lg:col-span-4 space-y-10 lg:sticky lg:top-28">

          {/* Title block */}
          <div className="space-y-4">
            <span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container text-xs font-black uppercase tracking-widest rounded-full">
              Портал участника
            </span>
            <h1 className="font-headline text-5xl font-black tracking-tight leading-none text-on-surface">
              Подача <span className="text-primary">заявки</span>
            </h1>
            <p className="text-on-surface-variant text-base leading-relaxed max-w-sm">
              Заполните данные о выступлении и оплатите регистрационный взнос для участия в фестивале.
            </p>
          </div>

          {/* Vertical step navigation */}
          <nav className="space-y-8 relative">
            {/* Vertical progress line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="w-full bg-primary transition-all duration-500 ease-in-out"
                style={{ height: `${sidebarProgress}%` }}
              />
            </div>

            {stepDefs.map((s, i) => {
              const idx = i + 1
              const isActive = idx === step
              const isDone = idx < step
              return (
                <div
                  key={i}
                  className={`relative flex items-center gap-5 transition-all ${
                    isActive ? '' : isDone ? '' : 'opacity-40'
                  }`}
                >
                  <div
                    className={`z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ring-4 transition-all ${
                      isDone
                        ? 'bg-primary text-on-primary ring-primary/20 shadow-primary/20'
                        : isActive
                        ? 'bg-primary text-on-primary ring-primary/20 shadow-primary/30'
                        : 'bg-surface-container-high text-on-surface-variant ring-transparent'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <s.Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}>
                      Шаг {idx}
                    </p>
                    <p className="font-headline font-bold text-base text-on-surface">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Help card */}
          <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
            <HelpCircle className="text-primary w-7 h-7" />
            <h3 className="font-headline font-bold text-lg text-on-surface">Нужна помощь?</h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Наша команда готова ответить на все вопросы по оформлению заявки.
            </p>
            <a
              href="mailto:support@arttime.com"
              className="inline-flex items-center gap-2 font-bold text-primary hover:text-primary-dim transition-colors text-sm"
            >
              Написать нам
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* ── RIGHT FORM ── */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-surface-container-lowest rounded-3xl shadow-radiant p-8 md:p-12 border border-outline-variant/10 min-h-[420px]">
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
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={back}
              disabled={step === 1}
              className="rounded-full px-6"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('back') || 'Назад'}
            </Button>

            {step < STEPS ? (
              <Button
                onClick={next}
                className="primary-gradient text-on-primary rounded-full px-8 shadow-radiant-sm"
              >
                {t('next') || 'Далее'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                {uploadStatus && <p className="text-xs text-on-surface-variant">{uploadStatus}</p>}
                {errors.applicationId && (
                  <p className="text-xs text-error">{errors.applicationId}</p>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="primary-gradient text-on-primary rounded-full px-8 shadow-radiant-sm"
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                  {!isSubmitting && <Check className="w-4 h-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
