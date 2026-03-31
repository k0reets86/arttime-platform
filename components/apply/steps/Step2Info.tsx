'use client'

import { useTranslations } from 'next-intl'
import type { WizardData } from '../ApplyWizard'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

interface Props {
  data: WizardData
  updateData: (patch: Partial<WizardData>) => void
  errors: Partial<Record<keyof WizardData, string>>
}

export default function Step2Info({ data, updateData, errors }: Props) {
  const t = useTranslations('application')
  const isGroup = data.applicantType === 'group'

  const addMember = () => {
    updateData({
      members: [...data.members, { full_name: '', birth_date: '', role: '' }]
    })
  }

  const updateMember = (i: number, patch: Partial<typeof data.members[0]>) => {
    const next = [...data.members]
    next[i] = { ...next[i], ...patch }
    updateData({ members: next })
  }

  const removeMember = (i: number) => {
    updateData({ members: data.members.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1">{t('step2')}</h2>
        <p className="text-sm text-on-surface-variant">{t('step2_desc')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">
            {isGroup ? t('group_name') : t('name')} *
          </Label>
          <Input
            id="name"
            value={data.name}
            onChange={e => updateData({ name: e.target.value })}
            placeholder={isGroup ? t('group_name_placeholder') : t('name_placeholder')}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Contact name */}
        <div className="space-y-2">
          <Label htmlFor="contactName">{t('contactName')} *</Label>
          <Input
            id="contactName"
            value={data.contactName}
            onChange={e => updateData({ contactName: e.target.value })}
          />
          {errors.contactName && <p className="text-xs text-red-500">{errors.contactName}</p>}
        </div>

        {/* Contact email */}
        <div className="space-y-2">
          <Label htmlFor="contactEmail">{t('contactEmail')} *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={data.contactEmail}
            onChange={e => updateData({ contactEmail: e.target.value })}
          />
          {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="contactPhone">{t('contactPhone')}</Label>
          <Input
            id="contactPhone"
            type="tel"
            value={data.contactPhone}
            onChange={e => updateData({ contactPhone: e.target.value })}
          />
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="country">{t('country')}</Label>
          <Input
            id="country"
            value={data.country}
            onChange={e => updateData({ country: e.target.value })}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city">{t('city')}</Label>
          <Input
            id="city"
            value={data.city}
            onChange={e => updateData({ city: e.target.value })}
          />
        </div>
      </div>

      {/* Group members */}
      {isGroup && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{t('members')}</Label>
            <Button type="button" size="sm" variant="outline" onClick={addMember}>
              <Plus className="w-4 h-4" />
              {t('addMember')}
            </Button>
          </div>

          {data.members.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-4 bg-surface-container-low rounded-lg">
              {t('no_members_yet')}
            </p>
          )}

          {data.members.map((member, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start bg-surface-container-low rounded-lg p-3">
              <div className="space-y-1">
                <Label className="text-xs">{t('member_name')}</Label>
                <Input
                  value={member.full_name}
                  onChange={e => updateMember(i, { full_name: e.target.value })}
                  placeholder={t('member_name_placeholder')}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('birth_date')}</Label>
                <Input
                  type="date"
                  value={member.birth_date}
                  onChange={e => updateMember(i, { birth_date: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5 h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => removeMember(i)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
