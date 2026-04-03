'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle, Clock, Wifi, WifiOff, ChevronLeft,
  ChevronRight, Star, Loader2, Trophy, RotateCcw, Send
} from 'lucide-react'
import {
  saveJudgeSession, loadJudgeSession,
  queueScore, getPendingScores, markScoreSynced, getSyncedScores
} from '@/lib/judge/db'

interface Criterion { id: string; name_i18n: Record<string, string>; weight: number; max_score: number; sort_order: number }
interface Nomination {
  id: string; name_i18n: Record<string, string>; score_min: number; score_max: number
  categories: any; criteria: Criterion[]
}
interface Assignment { id: string; weight: number; nomination_id: string; nominations: Nomination }
interface Application {
  id: string; name: string; performance_number: number | null
  performance_title: string | null; applicant_type: string; nomination_id: string
}
interface Score {
  id: string; application_id: string; nomination_id: string; total_score: number
  criteria_scores: Record<string, number>; submitted_at: string | null; synced_at: string | null
}

interface Props {
  judgeId: string; festivalId: string; assignments: Assignment[]
  applications: Application[]; existingScores: Score[]
  locale: string; judgeName: string
}

type ScoreMap = Record<string, { total_score: number; criteria_scores: Record<string, number>; dirty: boolean; syncing: boolean; saved: boolean }>

export default function JudgeScoringApp({
  judgeId, festivalId, assignments, applications, existingScores, locale, judgeName,
}: Props) {
  const [isOnline, setIsOnline] = useState(true)
  const [dbReady, setDbReady] = useState(false)
  const [activeNomId, setActiveNomId] = useState(assignments[0]?.nomination_id ?? '')
  const [activeAppId, setActiveAppId] = useState<string | null>(null)
  const [scores, setScores] = useState<ScoreMap>(() => {
    const map: ScoreMap = {}
    for (const s of existingScores) {
      map[`${s.application_id}:${s.nomination_id}`] = {
        total_score: s.total_score,
        criteria_scores: s.criteria_scores ?? {},
        dirty: false,
        syncing: false,
        saved: !!s.synced_at,
      }
    }
    return map
  })
  const [pendingSync, setPendingSync] = useState<string[]>([])
  const syncingRef = useRef(false)

  // ─── IndexedDB: сохраняем сессию и подгружаем офлайн-данные ───
  useEffect(() => {
    const sessionId = `${festivalId}:${judgeId}`

    async function initDb() {
      try {
        // 1. Сохраняем свежие данные с сервера
        if (assignments.length > 0) {
          await saveJudgeSession({
            id: sessionId, judgeId, festivalId, judgeName,
            assignments, applications,
          })
        }

        // 2. Загружаем синхронизированные оценки из IndexedDB
        const synced = await getSyncedScores(judgeId)
        if (synced.length > 0) {
          setScores(prev => {
            const next = { ...prev }
            for (const s of synced) {
              if (!next[s.key]) {
                next[s.key] = {
                  total_score: s.totalScore,
                  criteria_scores: s.criteriaScores,
                  dirty: false, syncing: false, saved: true,
                }
              }
            }
            return next
          })
        }

        // 3. Загружаем pending оценки (несинхронизированные)
        const pending = await getPendingScores(judgeId)
        if (pending.length > 0) {
          setScores(prev => {
            const next = { ...prev }
            for (const p of pending) {
              next[p.key] = {
                total_score: p.totalScore,
                criteria_scores: p.criteriaScores,
                dirty: true, syncing: false, saved: false,
              }
            }
            return next
          })
          setPendingSync(pending.map(p => p.key))
        }

        setDbReady(true)
      } catch (err) {
        console.warn('[Judge] IndexedDB init failed:', err)
        setDbReady(true) // продолжаем без IndexedDB
      }
    }

    initDb()
  }, [festivalId, judgeId, judgeName, assignments, applications])

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncPending() }
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    setIsOnline(navigator.onLine)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  const activeNom = assignments.find(a => a.nomination_id === activeNomId)?.nominations
  const nomApps = applications.filter(a => a.nomination_id === activeNomId)
    .sort((a, b) => (a.performance_number ?? 999) - (b.performance_number ?? 999))
  const activeApp = nomApps.find(a => a.id === activeAppId) ?? nomApps[0] ?? null

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const key = (appId: string, nomId: string) => `${appId}:${nomId}`

  const getScore = (appId: string, nomId: string) =>
    scores[key(appId, nomId)] ?? { total_score: 0, criteria_scores: {}, dirty: false, syncing: false, saved: false }

  const setCriterionScore = (appId: string, nomId: string, critId: string, value: number) => {
    setScores(prev => {
      const current = prev[key(appId, nomId)] ?? { total_score: 0, criteria_scores: {}, dirty: false, syncing: false, saved: false }
      const criteria_scores = { ...current.criteria_scores, [critId]: value }
      // Compute weighted total
      const nom = assignments.find(a => a.nomination_id === nomId)?.nominations
      const criteria = nom?.criteria ?? []
      const totalWeight = criteria.reduce((s, c) => s + c.weight, 0) || 1
      const total_score = criteria.reduce((sum, c) => {
        const raw = criteria_scores[c.id] ?? 0
        return sum + (raw / c.max_score) * (c.weight / totalWeight) * (nom?.score_max ?? 100)
      }, 0)
      return {
        ...prev,
        [key(appId, nomId)]: { criteria_scores, total_score: Math.round(total_score * 100) / 100, dirty: true, syncing: false, saved: false }
      }
    })
  }

  const syncScore = useCallback(async (appId: string, nomId: string) => {
    const scoreData = scores[key(appId, nomId)]
    if (!scoreData || !scoreData.dirty) return
    const scoreKey = key(appId, nomId)

    // Сохраняем в IndexedDB сразу (офлайн-безопасность)
    try {
      await queueScore({
        key: scoreKey, judgeId, festivalId,
        applicationId: appId, nominationId: nomId,
        totalScore: scoreData.total_score, criteriaScores: scoreData.criteria_scores,
      })
    } catch (e) {
      console.warn('[Judge] IndexedDB queue failed:', e)
    }

    setScores(prev => ({ ...prev, [scoreKey]: { ...prev[scoreKey], syncing: true } }))
    try {
      const res = await fetch('/api/judge/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId, nomination_id: nomId, festival_id: festivalId,
          total_score: scoreData.total_score, criteria_scores: scoreData.criteria_scores,
        }),
      })
      if (res.ok) {
        // Помечаем как синхронизированное в IndexedDB
        try {
          await markScoreSynced(scoreKey, judgeId, scoreData.total_score, scoreData.criteria_scores)
        } catch (e) {
          console.warn('[Judge] markScoreSynced failed:', e)
        }
        setScores(prev => ({
          ...prev,
          [scoreKey]: { ...prev[scoreKey], dirty: false, syncing: false, saved: true }
        }))
        setPendingSync(p => p.filter(k => k !== scoreKey))
      } else {
        setPendingSync(p => [...p.filter(k => k !== scoreKey), scoreKey])
        setScores(prev => ({ ...prev, [scoreKey]: { ...prev[scoreKey], syncing: false } }))
      }
    } catch {
      // Сеть недоступна — остаётся в IndexedDB до восстановления
      setPendingSync(p => [...p.filter(k => k !== scoreKey), scoreKey])
      setScores(prev => ({ ...prev, [scoreKey]: { ...prev[scoreKey], syncing: false } }))
    }
  }, [scores, festivalId, judgeId])

  const syncPending = useCallback(() => {
    for (const k of pendingSync) {
      const [appId, nomId] = k.split(':')
      syncScore(appId, nomId)
    }
    setPendingSync([])
  }, [pendingSync, syncScore])

  const handleSaveAndNext = async () => {
    if (!activeApp) return
    if (isOnline) {
      await syncScore(activeApp.id, activeNomId)
    } else {
      setScores(prev => ({
        ...prev,
        [key(activeApp.id, activeNomId)]: { ...prev[key(activeApp.id, activeNomId)], dirty: true }
      }))
      setPendingSync(p => [...p.filter(k => k !== key(activeApp.id, activeNomId)), key(activeApp.id, activeNomId)])
    }
    // Move to next app
    const idx = nomApps.findIndex(a => a.id === activeApp.id)
    if (idx < nomApps.length - 1) setActiveAppId(nomApps[idx + 1].id)
  }

  const savedCount = nomApps.filter(a => getScore(a.id, activeNomId).saved).length
  const scoredCount = nomApps.filter(a => getScore(a.id, activeNomId).total_score > 0 || getScore(a.id, activeNomId).saved).length

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/10 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-on-surface text-sm">Судейский пульт</p>
          <p className="text-xs text-on-surface-variant truncate">{judgeName}</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingSync.length > 0 && (
            <button onClick={syncPending} className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <RotateCcw className="w-3 h-3" /> {pendingSync.length} в очереди
            </button>
          )}
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isOnline ? 'Онлайн' : 'Оффлайн'}
          </div>
        </div>
      </div>

      {/* Nomination tabs */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/10 px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {assignments.map(a => {
            const nom = a.nominations
            const appsForNom = applications.filter(app => app.nomination_id === a.nomination_id)
            const saved = appsForNom.filter(app => getScore(app.id, a.nomination_id).saved).length
            return (
              <button
                key={a.nomination_id}
                onClick={() => { setActiveNomId(a.nomination_id); setActiveAppId(null) }}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeNomId === a.nomination_id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {getI18n(nom?.name_i18n ?? null)}
                <span className="ml-1.5 text-xs text-on-surface-variant">
                  {saved}/{appsForNom.length}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Applications list (left panel) */}
        <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-outline-variant/10 overflow-y-auto bg-surface-container-lowest">
          <div className="p-3 border-b border-outline-variant/10">
            <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wide">
              Участники · {savedCount}/{nomApps.length} оценено
            </p>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {nomApps.map((app, idx) => {
              const s = getScore(app.id, activeNomId)
              const isActive = (activeApp?.id ?? nomApps[0]?.id) === app.id
              return (
                <button
                  key={app.id}
                  onClick={() => setActiveAppId(app.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-primary/8' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <span className="w-6 h-6 rounded-full bg-surface-container-high text-on-surface-variant text-xs flex items-center justify-center shrink-0 font-mono">
                    {app.performance_number ?? idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                      {app.name}
                    </p>
                    {app.performance_title && (
                      <p className="text-xs text-on-surface-variant truncate">{app.performance_title}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {s.saved && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {s.dirty && !s.saved && <Clock className="w-4 h-4 text-amber-500" />}
                    {s.syncing && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                  </div>
                </button>
              )
            })}
            {nomApps.length === 0 && (
              <div className="px-4 py-8 text-center text-on-surface-variant text-sm">
                Нет одобренных заявок
              </div>
            )}
          </div>
        </div>

        {/* Scoring panel (right) */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {!activeApp ? (
            <div className="h-full flex items-center justify-center text-on-surface-variant">
              <div className="text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Выберите участника для оценки</p>
              </div>
            </div>
          ) : (
            <div className="max-w-lg mx-auto space-y-5">
              {/* App header */}
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-headline font-bold text-on-surface text-lg">{activeApp.name}</h2>
                    {activeApp.performance_title && (
                      <p className="text-on-surface-variant text-sm mt-0.5">«{activeApp.performance_title}»</p>
                    )}
                  </div>
                  {activeApp.performance_number && (
                    <span className="bg-primary/10 text-primary text-sm font-bold px-2.5 py-1 rounded-lg shrink-0">
                      №{activeApp.performance_number}
                    </span>
                  )}
                </div>
              </div>

              {/* Criteria scoring */}
              {activeNom && (
                <div className="space-y-3">
                  {(activeNom.criteria ?? [])
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map(crit => {
                      const currentVal = getScore(activeApp.id, activeNomId).criteria_scores[crit.id] ?? 0
                      return (
                        <div key={crit.id} className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-on-surface text-sm">{getI18n(crit.name_i18n)}</p>
                              <p className="text-xs text-on-surface-variant">вес ×{crit.weight} · макс. {crit.max_score}</p>
                            </div>
                            <span className="text-xl font-headline font-bold text-primary w-12 text-right">
                              {currentVal}
                            </span>
                          </div>
                          {/* Score slider */}
                          <input
                            type="range"
                            min={0}
                            max={crit.max_score}
                            step={0.5}
                            value={currentVal}
                            onChange={e => setCriterionScore(activeApp.id, activeNomId, crit.id, parseFloat(e.target.value))}
                            className="w-full accent-primary"
                          />
                          {/* Quick score buttons */}
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {Array.from({ length: Math.min(crit.max_score + 1, 11) }, (_, i) =>
                              Math.round(i * (crit.max_score / Math.min(crit.max_score, 10)))
                            ).map(v => (
                              <button
                                key={v}
                                onClick={() => setCriterionScore(activeApp.id, activeNomId, crit.id, v)}
                                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                  currentVal === v
                                    ? 'bg-primary text-on-primary'
                                    : 'bg-surface-container-low text-on-surface hover:bg-primary/10'
                                }`}
                              >
                                {v}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* Total + Save */}
              <div className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-on-surface-variant">Итоговый балл</p>
                    <p className="text-3xl font-headline font-bold text-primary">
                      {getScore(activeApp.id, activeNomId).total_score.toFixed(1)}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      из {activeNom?.score_max ?? 100}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {/* Navigation */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const idx = nomApps.findIndex(a => a.id === activeApp.id)
                        if (idx > 0) setActiveAppId(nomApps[idx - 1].id)
                      }}
                      disabled={nomApps.findIndex(a => a.id === activeApp.id) === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={handleSaveAndNext}
                      disabled={getScore(activeApp.id, activeNomId).syncing}
                      className="primary-gradient text-on-primary"
                    >
                      {getScore(activeApp.id, activeNomId).syncing
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Send className="w-4 h-4" />
                      }
                      <span className="ml-1.5">
                        {!isOnline ? 'Сохранить (оффлайн)' : 'Сохранить → Следующий'}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
