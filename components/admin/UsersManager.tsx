'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import {
  UserPlus, MoreVertical, ShieldCheck, Shield,
  Star, CreditCard, UserX, UserCheck, Loader2, Mail
} from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  role: string
  active: boolean
  lang_pref: string
  created_at: string
}

interface Props {
  users: User[]
  currentUserId: string
  locale: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Суперадмин',
  organizer: 'Организатор',
  judge: 'Судья',
  cashier: 'Кассир',
}

const ROLE_ICONS: Record<string, React.ElementType> = {
  super_admin: ShieldCheck,
  organizer: Shield,
  judge: Star,
  cashier: CreditCard,
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'text-purple-600 bg-purple-50',
  organizer: 'text-blue-600 bg-blue-50',
  judge: 'text-amber-600 bg-amber-50',
  cashier: 'text-green-600 bg-green-50',
}

export default function UsersManager({ users: initialUsers, currentUserId, locale }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [error, setError] = useState('')

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('organizer')
  const [inviteLang, setInviteLang] = useState('ru')

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) return
    setInviteLoading(true)
    setError('')
    setInviteSuccess('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ email: inviteEmail, display_name: inviteName, role: inviteRole, lang_pref: inviteLang }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка'); return }
      setInviteSuccess(`Приглашение отправлено на ${inviteEmail}`)
      setInviteEmail(''); setInviteName(''); setInviteRole('organizer')
      // Обновляем список
      const listRes = await fetch('/api/admin/users', { headers: { 'x-locale': locale } })
      const listData = await listRes.json()
      if (listData.users) setUsers(listData.users)
    } catch {
      setError('Ошибка сети')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ userId, role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка'); return }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setLoading(userId)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-locale': locale },
        body: JSON.stringify({ userId, active: !currentActive }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Ошибка'); return }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !currentActive } : u))
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header + кнопка */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Пользователи</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Управление доступом к платформе
          </p>
        </div>
        <Button onClick={() => { setShowInvite(!showInvite); setError(''); setInviteSuccess('') }}>
          <UserPlus className="w-4 h-4 mr-2" />
          Пригласить
        </Button>
      </div>

      {/* Форма приглашения */}
      {showInvite && (
        <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant border border-primary/20 space-y-4">
          <h3 className="font-headline font-semibold text-on-surface flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Новое приглашение
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Имя *</Label>
              <Input
                id="invite-name"
                placeholder="Иван Петров"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Роль *</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="organizer">Организатор</option>
                <option value="judge">Судья</option>
                <option value="cashier">Кассир</option>
                <option value="super_admin">Суперадмин</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-lang">Язык</Label>
              <select
                id="invite-lang"
                value={inviteLang}
                onChange={e => setInviteLang(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ru">Русский</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="uk">Українська</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleInvite}
              disabled={inviteLoading || !inviteEmail || !inviteName}
            >
              {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Отправить приглашение
            </Button>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Роли-легенда */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(ROLE_LABELS).map(([role, label]) => {
          const Icon = ROLE_ICONS[role]
          return (
            <span key={role} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[role]}`}>
              <Icon className="w-3 h-3" />
              {label}
            </span>
          )
        })}
      </div>

      {/* Таблица пользователей */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant/10 text-left">
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant">Пользователь</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant">Роль</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant">Статус</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant">Добавлен</th>
              <th className="px-6 py-3 text-xs font-medium text-on-surface-variant">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {users.map(user => {
              const Icon = ROLE_ICONS[user.role] || Shield
              const isCurrentUser = user.id === currentUserId
              const isLoadingThis = loading === user.id

              return (
                <tr key={user.id} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-sm text-on-surface">
                        {user.display_name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-on-surface-variant">(вы)</span>
                        )}
                      </p>
                      <p className="text-xs text-on-surface-variant">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isCurrentUser ? (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[user.role] || 'text-gray-600 bg-gray-50'}`}>
                        <Icon className="w-3 h-3" />
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    ) : (
                      <select
                        value={user.role}
                        disabled={isLoadingThis}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 py-0.5 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      >
                        <option value="organizer">Организатор</option>
                        <option value="judge">Судья</option>
                        <option value="cashier">Кассир</option>
                        <option value="super_admin">Суперадмин</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={user.active ? 'success' : 'secondary'}>
                      {user.active ? 'Активен' : 'Отключён'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-xs text-on-surface-variant">
                    {new Date(user.created_at).toLocaleDateString('ru')}
                  </td>
                  <td className="px-6 py-4">
                    {!isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingThis}
                        onClick={() => handleToggleActive(user.id, user.active)}
                        className={user.active ? 'text-red-500 hover:text-red-600' : 'text-green-600 hover:text-green-700'}
                      >
                        {isLoadingThis ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.active ? (
                          <><UserX className="w-4 h-4 mr-1" /> Отключить</>
                        ) : (
                          <><UserCheck className="w-4 h-4 mr-1" /> Включить</>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant text-sm">
                  Пользователей пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
