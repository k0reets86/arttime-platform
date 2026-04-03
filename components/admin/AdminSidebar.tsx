'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, Users, Calendar, Star,
  Settings, CreditCard, LogOut, Trophy, Download,
  ShieldCheck, Activity
} from 'lucide-react'

interface Props {
  locale: string
  role: string
  festivalName?: string
}

export default function AdminSidebar({ locale, role, festivalName }: Props) {
  const t = useTranslations('admin')
  const pathname = usePathname()

  const base = `/${locale}/admin`

  // Нормализуем роль: super_admin и organizer оба считаются 'admin' для показа пунктов
  const effectiveRole = (role === 'super_admin' || role === 'organizer') ? 'admin' : role

  const navItems = [
    { href: base, label: t('dashboard'), icon: LayoutDashboard, roles: ['admin', 'judge', 'cashier'] },
    { href: `${base}/applications`, label: t('applications'), icon: FileText, roles: ['admin'] },
    { href: `${base}/judges`, label: t('judges'), icon: Users, roles: ['admin'] },
    { href: `${base}/scoring`, label: 'Судейство', icon: Activity, roles: ['admin'] },
    { href: `${base}/results`, label: t('results'), icon: Trophy, roles: ['admin'] },
    { href: `/${locale}/judge`, label: t('scoring'), icon: Star, roles: ['judge', 'admin'] },
    { href: `${base}/program`, label: t('program'), icon: Calendar, roles: ['admin'] },
    { href: `/${locale}/cashier`, label: t('cashier'), icon: CreditCard, roles: ['admin', 'cashier'] },
    { href: `${base}/reports`, label: t('reports'), icon: Download, roles: ['admin'] },
    { href: `${base}/settings`, label: t('settings'), icon: Settings, roles: ['admin'] },
    // Только суперадмин видит управление пользователями
    { href: `${base}/users`, label: 'Пользователи', icon: ShieldCheck, roles: ['super_admin'] },
  ]

  const visibleItems = navItems.filter(item =>
    item.roles.includes(effectiveRole) || item.roles.includes(role)
  )

  const isActive = (href: string) => {
    if (href === base) return pathname === base
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 min-h-screen bg-surface-container-lowest border-r border-outline-variant border-opacity-10 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-outline-variant border-opacity-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl primary-gradient flex items-center justify-center">
            <span className="text-on-primary font-bold text-sm">AT</span>
          </div>
          <div>
            <p className="font-headline font-bold text-on-surface text-sm">ArtTime</p>
            {festivalName && (
              <p className="text-xs text-on-surface-variant truncate max-w-[140px]">{festivalName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {visibleItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-outline-variant border-opacity-10">
        <form action={`/api/auth/logout`} method="POST">
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low hover:text-red-500 transition-colors w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Выйти
          </button>
        </form>
      </div>
    </aside>
  )
}
