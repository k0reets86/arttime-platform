'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/lib/supabase/types'
import type { WizardData } from '../ApplyWizard'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Package, CheckCircle } from 'lucide-react'

type Package = Tables<'packages'>

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
  locale: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function Step4Packages({ data, updateData, errors: _errors, locale }: Props) {
  const t = useTranslations('application')
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('packages')
      .select('*')
      .eq('festival_id', data.festivalId)
      .eq('active', true)
      .then(({ data: pkgs }) => {
        setPackages(pkgs ?? [])
        setLoading(false)
      })
  }, [data.festivalId])

  const getI18n = (field: Record<string, string> | null) => {
    if (!field) return ''
    return field[locale] || field['ru'] || field['en'] || Object.values(field)[0] || ''
  }

  const isSelected = (pkgId: string) =>
    data.selectedPackages.some(p => p.packageId === pkgId)

  const togglePackage = (pkg: Package) => {
    if (isSelected(pkg.id)) {
      updateData({ selectedPackages: data.selectedPackages.filter(p => p.packageId !== pkg.id) })
    } else {
      updateData({ selectedPackages: [...data.selectedPackages, { packageId: pkg.id, quantity: 1 }] })
    }
  }

  const totalPrice = data.selectedPackages.reduce((sum, sp) => {
    const pkg = packages.find(p => p.id === sp.packageId)
    return sum + (pkg ? pkg.price * sp.quantity : 0)
  }, 0)

  const currency = packages[0]?.currency ?? 'EUR'

  if (loading) return <div className="text-center py-12 text-on-surface-variant">{t('loading')}</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step4')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step4_desc')}</p>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12 bg-surface-container-low rounded-xl">
          <Package className="w-10 h-10 text-on-surface-variant mx-auto mb-3" />
          <p className="text-on-surface-variant">{t('no_packages')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => {
            const selected = isSelected(pkg.id)
            const includes = pkg.includes_json as string[] | null
            return (
              <div
                key={pkg.id}
                onClick={() => togglePackage(pkg)}
                className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selected
                    ? 'border-primary bg-primary/5 shadow-radiant'
                    : 'border-outline-variant hover:border-primary/30 hover:bg-surface-container-low'
                }`}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => togglePackage(pkg)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-on-surface">
                      {getI18n(pkg.name_i18n as Record<string, string>)}
                    </span>
                    <Badge variant={selected ? 'default' : 'outline'}>
                      {pkg.price} {currency}
                    </Badge>
                  </div>
                  {includes && includes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {includes.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-on-surface-variant">
                          <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Total */}
      {data.selectedPackages.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-outline-variant border-opacity-10">
          <span className="font-medium text-on-surface">{t('total')}</span>
          <span className="font-headline text-2xl font-bold text-primary">
            {totalPrice} {currency}
          </span>
        </div>
      )}
    </div>
  )
}
