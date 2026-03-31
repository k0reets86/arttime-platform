'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'

const LOCALES = [
  { code: 'ru', label: 'RU', flag: '🇷🇺' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'uk', label: 'UK', flag: '🇺🇦' },
]

export function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => {
            const newPathname = pathname.replace(`/${locale}`, `/${l.code}`)
            router.push(newPathname)
          }}
          className={`px-2 py-1 rounded-full text-sm font-label transition-colors ${
            locale === l.code
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  )
}
