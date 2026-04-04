'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'
import type { WizardData } from '../ApplyWizard'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, User, Check } from 'lucide-react'

type Category = Tables<'categories'>
type Nomination = Tables<'nominations'>

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
  locale: string
}

export default function Step1Type({ data, updateData, errors, locale }: Props) {
  const t = useTranslations('application')
  const [categories, setCategories] = useState<Category[]>([])
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [loadingCats, setLoadingCats] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('categories')
      .select('*')
      .eq('festival_id', data.festivalId)
      .then(({ data: cats }) => {
        setCategories(cats ?? [])
        setLoadingCats(false)
      })
  }, [data.festivalId])

  useEffect(() => {
    if (!data.categoryId) { setNominations([]); return }
    const supabase = createClient()
    supabase
      .from('nominations')
      .select('*')
      .eq('category_id', data.categoryId)
      .order('age_min', { ascending: true })
      .then(({ data: noms }) => setNominations(noms ?? []))
  }, [data.categoryId])

  const getI18n = (field: Record<string, string> | null) => {
    if (!field) return ''
    return field[locale] || field['ru'] || field['en'] || Object.values(field)[0] || ''
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">
          {t('step1')}
        </h2>
        <p className="text-sm text-on-surface-variant">{t('step1_desc')}</p>
      </div>

      {/* Solo / Group — rich cards */}
      <div className="space-y-3">
        <label className="block font-label text-xs font-black uppercase tracking-widest text-on-surface-variant">
          {t('applicant_type')}
        </label>
        <div className="grid grid-cols-2 gap-4">
          {([
            {
              type: 'solo' as const,
              Icon: User,
              title: t('solo'),
              desc: 'Одиночное выступление — сольный номер одного артиста.',
            },
            {
              type: 'group' as const,
              Icon: Users,
              title: t('group'),
              desc: 'Коллектив — ансамбль, дуэт, оркестр или танцевальная группа.',
            },
          ]).map(({ type, Icon, title, desc }) => (
            <button
              key={type}
              type="button"
              onClick={() => updateData({ applicantType: type })}
              className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-200 text-left group ${
                data.applicantType === type
                  ? 'border-primary bg-primary/5 shadow-radiant-sm'
                  : 'border-surface-container bg-surface-container-low hover:border-primary/40 hover:bg-surface-container-low'
              }`}
            >
              {/* Check indicator */}
              {data.applicantType === type && (
                <span className="absolute top-4 right-4 text-primary">
                  <Check className="w-5 h-5" />
                </span>
              )}
              {/* Icon box */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-transform group-hover:scale-110 ${
                data.applicantType === type
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-primary'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <p className="font-headline font-bold text-base text-on-surface mb-1">{title}</p>
              <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
            </button>
          ))}
        </div>
        {errors.applicantType && (
          <p className="text-xs text-error mt-1">{errors.applicantType}</p>
        )}
      </div>

      {/* Category (Жанр) */}
      <div className="space-y-2">
        <label className="block font-label text-xs font-black uppercase tracking-widest text-on-surface-variant">
          {t('category')}
        </label>
        <Select
          value={data.categoryId}
          onValueChange={(v) => updateData({ categoryId: v, nominationId: '' })}
          disabled={loadingCats}
        >
          <SelectTrigger className="bg-surface-container-low border-2 border-transparent rounded-xl py-6 px-5 focus:border-primary focus:bg-white transition-all h-auto">
            <SelectValue placeholder={loadingCats ? t('loading') : t('select_category')} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {getI18n(cat.name_i18n as Record<string, string>)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-error mt-1">{errors.categoryId}</p>
        )}
      </div>

      {/* Nomination (age group) */}
      {data.categoryId && (
        <div className="space-y-2">
          <label className="block font-label text-xs font-black uppercase tracking-widest text-on-surface-variant">
            {t('nomination')}
          </label>
          <Select
            value={data.nominationId}
            onValueChange={(v) => updateData({ nominationId: v })}
          >
            <SelectTrigger className="bg-surface-container-low border-2 border-transparent rounded-xl py-6 px-5 focus:border-primary focus:bg-white transition-all h-auto">
              <SelectValue placeholder={t('select_nomination')} />
            </SelectTrigger>
            <SelectContent>
              {nominations.map(nom => (
                <SelectItem key={nom.id} value={nom.id}>
                  {getI18n(nom.name_i18n as Record<string, string>)}
                  {nom.age_min != null && nom.age_max != null && (
                    <span className="ml-2 text-on-surface-variant text-xs">
                      ({nom.age_min}–{nom.age_max})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.nominationId && (
            <p className="text-xs text-error mt-1">{errors.nominationId}</p>
          )}
        </div>
      )}
    </div>
  )
}
