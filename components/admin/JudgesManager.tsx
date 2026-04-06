'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  UserPlus, Trash2, Star, CheckCircle, XCircle,
  Mail, Loader2, ChevronDown
} from 'lucide-react'

interface User { id: string; display_name: string; email: string; active: boolean; created_at: string }
interface Nomination { id: string; name_i18n: Record<string, string>; categories: any }
interface Assignment {
  id: string; weight: number; active: boolean; created_at: string
  users: User | null; nominations: (Nomination & { categories?: any }) | null
}

interface Props {
  festivalId: string
  judges: User[]
  assignments: Assignment[]
  nominations: Nomination[]
  locale: string
}

export default function JudgesManager({ festivalId, judges, assignments, nominations, locale }: Props) {
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [selectedJudgeId, setSelectedJudgeId] = useState('')
  const [selectedNomId, setSelectedNomId] = useState('')
  const [weight, setWeight] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getI18n = (field: Record<string, string> | null) =>
    field?.ru || field?.en || Object.values(field ?? {})[0] || '—'

  const call = async (url: string, body: object) => {
    setLoading(true); setError(''); setSuccess('')
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Ошибка'); return false }
    setSuccess(data.message || 'Готово')
    router.refresh()
    return true
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await call('/api/admin/judges/invite', {
      email: inviteEmail, display_name: inviteName, festival_id: festivalId,
    })
    if (ok) { setInviteOpen(false); setInviteEmail(''); setInviteName('') }
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJudgeId || !selectedNomId) { setError('Выберите судью и номинацию'); return }
    const ok = await call('/api/admin/judges/assign', {
      judge_id: selectedJudgeId, nomination_id: selectedNomId,
      weight: parseFloat(weight) || 1, festival_id: festivalId,
    })
    if (ok) { setAssignOpen(false); setSelectedJudgeId(''); setSelectedNomId('') }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm('Удалить назначение?')) return
    setLoading(true)
    await fetch(`/api/admin/judges/assign?id=${assignmentId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  const handleToggleActive = async (judgeId: string, active: boolean) => {
    setLoading(true)
    await fetch('/api/admin/judges/toggle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ judge_id: judgeId, active: !active }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex gap-3">
        <Button onClick={() => setInviteOpen(true)} className="primary-gradient text-on-primary">
          <UserPlus className="w-4 h-4 mr-2" /> Добавить судью
        </Button>
        <Button variant="outline" onClick={() => setAssignOpen(true)}>
          <Star className="w-4 h-4 mr-2" /> Назначить номинацию
        </Button>
      </div>

      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm ${error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {error || success}
        </div>
      )}

      {/* Judges list */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-headline font-semibold text-on-surface">Судьи фестиваля</h2>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {judges.length === 0 && (
            <div className="px-5 py-10 text-center text-on-surface-variant text-sm">
              Судей пока нет. Добавьте первого судью.
            </div>
          )}
          {judges.map(judge => {
            const judgeAssignments = assignments.filter(a => a.users?.id === judge.id)
            return (
              <div key={judge.id} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(judge.display_name || judge.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-on-surface">{judge.display_name || judge.email}</p>
                      <Badge variant={judge.active ? 'success' : 'secondary'}>
                        {judge.active ? 'Активен' : 'Отключён'}
                      </Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {judge.email}
                    </p>
                    {judgeAssignments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {judgeAssignments.map(a => (
                          <span key={a.id} className="inline-flex items-center gap-1 text-xs bg-surface-container-low text-on-surface px-2 py-0.5 rounded-full">
                            {getI18n(a.nominations?.name_i18n ?? null)}
                            <span className="text-on-surface-variant">×{a.weight}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleActive(judge.id, judge.active)}
                    disabled={loading}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface transition-colors"
                    title={judge.active ? 'Отключить' : 'Активировать'}
                  >
                    {judge.active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Assignments table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <h2 className="font-headline font-semibold text-on-surface">Назначения судей</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/10 text-on-surface-variant">
              <th className="text-left px-4 py-3 font-medium">Судья</th>
              <th className="text-left px-4 py-3 font-medium">Номинация</th>
              <th className="text-left px-4 py-3 font-medium">Вес</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {assignments.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-on-surface-variant text-sm">
                Назначений пока нет
              </td></tr>
            )}
            {assignments.map(a => (
              <tr key={a.id} className="hover:bg-surface-container-low">
                <td className="px-4 py-3 text-on-surface">{a.users?.display_name || a.users?.email || '—'}</td>
                <td className="px-4 py-3 text-on-surface">{getI18n(a.nominations?.name_i18n ?? null)}</td>
                <td className="px-4 py-3 text-on-surface-variant">{a.weight}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRemoveAssignment(a.id)}
                    className="p-1 text-on-surface-variant hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить судью</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Имя</label>
              <Input
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="Иванова Мария Александровна"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="judge@example.com"
                required
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              📧 На указанный email будет отправлено письмо-приглашение. Судья перейдёт по ссылке и сам установит пароль.
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Добавить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Назначить судью на номинацию</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Судья</label>
              <select
                value={selectedJudgeId}
                onChange={e => setSelectedJudgeId(e.target.value)}
                className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                <option value="">Выберите судью...</option>
                {judges.filter(j => j.active).map(j => (
                  <option key={j.id} value={j.id}>{j.display_name || j.email}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Номинация</label>
              <select
                value={selectedNomId}
                onChange={e => setSelectedNomId(e.target.value)}
                className="w-full h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                <option value="">Выберите номинацию...</option>
                {[...nominations]
                  .sort((a: any, b: any) => {
                    const catA = getI18n(a.categories?.name_i18n)
                    const catB = getI18n(b.categories?.name_i18n)
                    if (catA !== catB) return catA.localeCompare(catB, 'ru')
                    return getI18n(a.name_i18n).localeCompare(getI18n(b.name_i18n), 'ru')
                  })
                  .map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {getI18n(n.categories?.name_i18n)} / {getI18n(n.name_i18n)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Вес голоса</label>
              <Input
                type="number"
                min="0.1"
                max="10"
                step="0.1"
                value={weight}
                onChange={e => setWeight(e.target.value)}
              />
              <p className="text-xs text-on-surface-variant">Стандартный вес — 1.0</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading} className="primary-gradient text-on-primary flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Назначить'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
