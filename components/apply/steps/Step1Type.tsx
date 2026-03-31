'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'
import type { WizardData } from '../ApplyWizard'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, User } from 'lucide-react'

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
      .then(({ data: noms }) => setNominations(noms ?? []))
  }, [data.categoryId])

  const getI18n = (field: Record<string, string> | null) => {
    if (!field) return ''
    return field[locale] || field['ru'] || field['en'] || Object.values(field)[0] || ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step1')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step1_desc')}</p>
      </div>

      {/* Solo / Group */}
      <div className="space-y-2">
        <Label>{t('applicant_type')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {(['solo', 'group'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateData({ applicantType: type })}
              className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all ${
                data.applicantType === type
                  ? 'border-primary bg-primary/5 shadow-radiant'
                  : 'border-outline-variant hover:border-primary/40 hover:bg-surface-container-low'
              }`}
            >
              {type === 'solo' ? (
                <User className={`w-8 h-8 ${data.applicantType === type ? 'text-primary' : 'text-on-surface-variant'}`} />
              ) : (
                <Users className={`w-8 h-8 ${data.applicantType === type ? 'text-primary' : 'text-on-surface-variant'}`} />
              )}
              <span className={`font-semibold ${data.applicantType === type ? 'text-primary' : 'text-on-surface'}`}>
                {t(type as 'solo' | 'group')}
              </span>
            </button>
          ))}
        </div>
        {errors.applicantType && <p className="text-xs text-red-500 mt-1">{errors.applicantType}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">{t('category')}</Label>
        <Select
          value={data.categoryId}
          onValueChange={(v) => updateData({ categoryId: v, nominationId: '' })}
          disabled={loadingCats}
        >
          <SelectTrigger id="category">
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
        {errors.categoryId && <p className="text-xs text-red-500 mt-1">{errors.categoryId}</p>}
      </div>

      {/* Nomination */}
      {data.categoryId && (
        <div className="space-y-2">
          <Label htmlFor="nomination">{t('nomination')}</Label>
          <Select
            value={data.nominationId}
            onValueChange={(v) => updateData({ nominationId: v })}
          >
            <SelectTrigger id="nomination">
              <SelectValue placeholder={t('select_nomination')} />
            </SelectTrigger>
            <SelectContent>
              {nominations.map(nom => (
                <SelectItem key={nom.id} value={nom.id}>
                  {getI18n(nom.name_i18n as Record<string, string>)}
                  {nom.age_min && nom.age_max && (
                    <span className="ml-2 text-on-surface-variant text-xs">
                      ({nom.age_min}–{nom.age_max})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.nominationId && <p className="text-xs text-red-500 mt-1">{errors.nominationId}</p>}
        </div>
      )}
    </div>
  )
}
