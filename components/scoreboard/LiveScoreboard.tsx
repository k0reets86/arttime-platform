'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Star, RefreshCw } from 'lucide-react'

interface Festival { id: string; name: string; year: number; status: string }
interface Result {
  id: string; rank: number | null; total: number | null; mean: number | null
  diploma_type: string | null; nomination_id: string; published_globally_at: string | null
  applications: {
    id: string; name: string; performance_number: number | null
    performance_title: string | null; applicant_type: string; country: string | null; city: string | null
  } | null
  nominations: { id: string; name_i18n: Record<string, string>; categories: any } | null
}

interface Props {
  festival: Festival
  initialResults: Result[]
  locale: string
}

const DIPLOMA_ICONS: Record<string, string> = {
  laureate_1: '🥇',
  laureate_2: '🥈',
  laureate_3: '🥉',
  diploma_1: '🏆',
  diploma_2: '🎖️',
  diploma_3: '🎗️',
  special: '⭐',
  participant: '🎭',
}

const DIPLOMA_LABELS: Record<string, string> = {
  laureate_1: 'Лауреат I степени',
  laureate_2: 'Лауреат II степени',
  laureate_3: 'Лауреат III степени',
  diploma_1: 'Диплом I степени',
  diploma_2: 'Диплом II степени',
  diploma_3: 'Диплом III степени',
  special: 'Специальный приз',
  participant: 'Участник',
}

export default function LiveScoreboard({ festival, initialResults, locale }: Props) {
  const [results, setResults] = useState<Result[]>(initialResults)
  const [activeNomId, setActiveNomId] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isLive, setIsLive] = useState(false)

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  // Real-time subscription to new published results
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('scoreboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aggregates',
          filter: 'visible_to_participant=eq.true',
        },
        (payload) => {
          setLastUpdate(new Date())
          // Refresh the page data
          window.location.reload()
        }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED')
      })

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Group by nomination
  const nominations = Array.from(
    new Map(
      results
        .filter(r => r.nominations)
        .map(r => [r.nomination_id, r.nominations!])
    ).entries()
  ).map(([id, nom]) => ({ id, nom }))

  const activeNom = activeNomId ?? nominations[0]?.id ?? null
  const displayResults = results
    .filter(r => r.nomination_id === activeNom)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="primary-gradient text-on-primary py-8 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl select-none"
              style={{
                left: `${(i * 17 + 5) % 95}%`,
                top: `${(i * 23 + 10) % 90}%`,
                transform: `rotate(${i * 18}deg)`,
              }}
            >⭐</div>
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6" />
            <span className="font-headline text-sm font-medium opacity-80">Результаты фестиваля</span>
            {isLive && (
              <span className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
          </div>
          <h1 className="font-headline text-3xl font-bold">{festival.name}</h1>
          <p className="opacity-80 mt-1">{festival.year}</p>
        </div>
      </div>

      {/* Nomination tabs */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/10 overflow-x-auto">
        <div className="flex gap-0 px-4 min-w-max mx-auto max-w-4xl">
          {nominations.map(({ id, nom }) => {
            const count = results.filter(r => r.nomination_id === id).length
            return (
              <button
                key={id}
                onClick={() => setActiveNomId(id)}
                className={`px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeNom === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {getI18n(nom.name_i18n)}
                <span className="ml-1.5 text-xs text-on-surface-variant">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-3">
        {displayResults.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Результаты ещё не опубликованы</p>
            <p className="text-sm mt-1">Следите за обновлениями</p>
          </div>
        )}

        {displayResults.map((result, idx) => {
          const app = result.applications
          if (!app) return null
          const diplomaIcon = result.diploma_type ? DIPLOMA_ICONS[result.diploma_type] : null
          const diplomaLabel = result.diploma_type ? DIPLOMA_LABELS[result.diploma_type] : null
          const isTop3 = (result.rank ?? 999) <= 3

          return (
            <div
              key={result.id}
              className={`bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden ${
                isTop3 ? 'ring-2 ring-secondary/30' : ''
              }`}
            >
              <div className="flex items-center gap-4 p-4">
                {/* Rank */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-headline font-bold text-lg ${
                  result.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                  result.rank === 2 ? 'bg-gray-100 text-gray-500' :
                  result.rank === 3 ? 'bg-orange-100 text-orange-500' :
                  'bg-surface-container-low text-on-surface-variant'
                }`}>
                  {result.rank ?? '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-headline font-bold ${isTop3 ? 'text-lg' : 'text-base'} text-on-surface`}>
                      {app.name}
                    </p>
                    {app.performance_number && (
                      <span className="text-xs text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded font-mono">
                        №{app.performance_number}
                      </span>
                    )}
                  </div>
                  {app.performance_title && (
                    <p className="text-sm text-on-surface-variant italic">«{app.performance_title}»</p>
                  )}
                  {(app.city || app.country) && (
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {[app.city, app.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>

                {/* Score and diploma */}
                <div className="text-right shrink-0">
                  {result.mean !== null && (
                    <p className="text-2xl font-headline font-bold text-primary">
                      {result.mean.toFixed(1)}
                    </p>
                  )}
                  {diplomaLabel && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {diplomaIcon && <span>{diplomaIcon}</span>}
                      <span className="text-xs text-on-surface-variant">{diplomaLabel}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-xs text-on-surface-variant">
        Обновлено {lastUpdate.toLocaleTimeString('ru')}
        {isLive && ' · обновляется автоматически'}
      </div>
    </div>
  )
}
