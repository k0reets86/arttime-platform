'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search } from 'lucide-react'

interface Props {
  locale: string
}

export default function StatusSearch({ locale }: Props) {
  const t = useTranslations('status')
  const router = useRouter()
  const [id, setId] = useState('')
  const [email, setEmail] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (id.trim()) {
      // Новый URL формат: /status/[token]
      router.push(`/${locale}/status/${encodeURIComponent(id.trim())}`)
    } else if (email.trim()) {
      router.push(`/${locale}/status?email=${encodeURIComponent(email.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSearch} className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant space-y-4">
      <div className="space-y-2">
        <Label htmlFor="search-id">{t('search_by_id')}</Label>
        <Input
          id="search-id"
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder={t('search_id_placeholder')}
        />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-outline-variant opacity-20" />
        <span className="text-xs text-on-surface-variant">{t('or')}</span>
        <div className="flex-1 h-px bg-outline-variant opacity-20" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="search-email">{t('search_by_email')}</Label>
        <Input
          id="search-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={!id.trim() && !email.trim()}>
        <Search className="w-4 h-4" />
        {t('search')}
      </Button>
    </form>
  )
}
