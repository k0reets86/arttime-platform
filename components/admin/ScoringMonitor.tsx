'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Activity, CheckCircle, Clock, User, Trophy, RefreshCw } from 'lucide-react'

interface Assignment {
  id: string
  judge_id: string
  nomination_id: string
  nominations: { id: string; name_i18n: Record<string, string> }
}

interface Application {
  id: string
  nomination_id: string
  name: string
  performance_number: number | null
}

interface Score {
  id: string
  judge_id: string
  application_id: string
  nomination_id: string
  total_score: number
  submitted_at: string | null
  synced_at: string | null
}

interface Judge {
  id: string
  name: string
}

interface Props {
  festivalId: string
  assignments: Assignment[]
  applications: Application[]
  initialScores: Score[]
  judges: Judge[]
}

function getI18n(f: Record<string, string> | null) {
  if (!f) return '—'
  return f.ru || f.en || Object.values(f)[0] || '—'
}

export default function ScoringMonitor({
  festivalId, assignments, applications, initialScores, judges
}: Props) {
  const [scores, setScores] = useState<Score[]>(initialScores)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [realtimeActive, setRealtimeActive] = useState(false)

  // Supabase Realtime подписка
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`scoring-monitor-${festivalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scores',
          filter: `festival_id=eq.${festivalId}`,
        },
        (payload) => {
          setLastUpdate(new Date())
          if (payload.eventType === 'INSERT') {
            setScores(prev => [...prev.filter(s => s.id !== (payload.new as Score).id), payload.new as Score])
          } else if (payload.eventType === 'UPDATE') {
            setScores(prev => prev.map(s => s.id === (payload.new as Score).id ? payload.new as Score : s))
          } else if (payload.eventType === 'DELETE') {
            setScores(prev => prev.filter(s => s.id !== (payload.old as Score).id))
          }
        }
      )
      .subscribe((status) => {
        setRealtimeActive(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [festivalId])

  // Уникальные номинации
  const nominations = useMemo(() => {
    const map: Record<string, { id: string; name_i18n: Record<string, string> }> = {}
    for (const a of assignments) {
      if (!map[a.nomination_id]) map[a.nomination_id] = a.nominations
    }
    return Object.values(map)
  }, [assignments])

  // Статистика по судье
  const judgeStats = useMemo(() => {
    return judges.map(judge => {
      const judgeAssignments = assignments.filter(a => a.judge_id === judge.id)
      const assignedNomIds = judgeAssignments.map(a => a.nomination_id)
      const totalApps = applications.filter(a => assignedNomIds.includes(a.nomination_id))
      const judgeScores = scores.filter(s => s.judge_id === judge.id)
      const scoredAppIds = new Set(judgeScores.map(s => s.application_id))
      const scoredCount = totalApps.filter(a => scoredAppIds.has(a.id)).length
      const pct = totalApps.length > 0 ? Math.round((scoredCount / totalApps.length) * 100) : 0

      return {
        judge,
        nominations: assignedNomIds.length,
        total: totalApps.length,
        scored: scoredCount,
        pct,
        lastActivity: judgeScores
          .map(s => s.synced_at || s.submitted_at)
          .filter(Boolean)
          .sort()
          .pop() ?? null,
      }
    })
  }, [judges, assignments, applications, scores])

  // Статистика по номинации
  const nomStats = useMemo(() => {
    return nominations.map(nom => {
      const nomApps = applications.filter(a => a.nomination_id === nom.id)
      const nomJudges = [...new Set(assignments.filter(a => a.nomination_id === nom.id).map(a => a.judge_id))]
      const nomScores = scores.filter(s => s.nomination_id === nom.id)
      // Ожидаемое кол-во оценок = кол-во заявок × кол-во судей
      const expected = nomApps.length * nomJudges.length
      const pct = expected > 0 ? Math.round((nomScores.length / expected) * 100) : 0

      return {
        nom,
        apps: nomApps.length,
        judges: nomJudges.length,
        scored: nomScores.length,
        expected,
        pct,
      }
    })
  }, [nominations, applications, assignments, scores])

  const totalScored = scores.length
  const totalExpected = judgeStats.reduce((s, j) => s + j.total, 0)
  const overallPct = totalExpected > 0 ? Math.round((totalScored / totalExpected) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-2xl font-bold text-on-surface">Мониторинг судейства</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Обновлено: {lastUpdate.toLocaleTimeString('ru-RU')}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ${
            realtimeActive
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${realtimeActive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
            {realtimeActive ? 'Realtime' : 'Переподключение...'}
          </div>
        </div>

        {/* Overall progress */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-radiant">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-medium text-on-surface">Общий прогресс</span>
            </div>
            <span className="text-2xl font-headline font-bold text-primary">{overallPct}%</span>
          </div>
          <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-on-surface-variant">
            <span>{totalScored} оценок выставлено</span>
            <span>из ~{totalExpected} ожидается</span>
          </div>
        </div>

        {/* По судьям */}
        <div>
          <h2 className="font-headline font-semibold text-on-surface mb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-on-surface-variant" />
            Судьи ({judges.length})
          </h2>
          <div className="space-y-2">
            {judgeStats.map(({ judge, total, scored, pct, lastActivity, nominations: nomCount }) => (
              <div key={judge.id} className="bg-surface-container-lowest rounded-xl px-4 py-3 shadow-radiant">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {judge.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-on-surface text-sm truncate">{judge.name}</p>
                      <span className="text-sm font-bold text-primary shrink-0 ml-2">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-primary' : 'bg-amber-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {pct === 100
                      ? <CheckCircle className="w-5 h-5 text-green-500" />
                      : <Clock className="w-5 h-5 text-on-surface-variant/40" />
                    }
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant pl-12">
                  <span>{scored}/{total} оценок</span>
                  <span>{nomCount} номинаций</span>
                  {lastActivity && (
                    <span>
                      Активность: {new Date(lastActivity).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {!lastActivity && <span className="text-amber-500">Не начал</span>}
                </div>
              </div>
            ))}
            {judges.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm">
                Нет назначенных судей
              </div>
            )}
          </div>
        </div>

        {/* По номинациям */}
        <div>
          <h2 className="font-headline font-semibold text-on-surface mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-on-surface-variant" />
            Номинации ({nominations.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {nomStats.map(({ nom, apps, judges: jCount, scored, expected, pct }) => (
              <div key={nom.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-on-surface text-sm truncate">{getI18n(nom.name_i18n)}</p>
                  <span className={`text-sm font-bold shrink-0 ml-2 ${
                    pct === 100 ? 'text-green-600' : 'text-primary'
                  }`}>{pct}%</span>
                </div>
                <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct === 100 ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex gap-3 text-xs text-on-surface-variant">
                  <span>{apps} участников</span>
                  <span>{jCount} судей</span>
                  <span>{scored}/{expected} оценок</span>
                </div>
              </div>
            ))}
            {nominations.length === 0 && (
              <div className="text-center py-8 text-on-surface-variant text-sm col-span-2">
                Нет активных номинаций
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
