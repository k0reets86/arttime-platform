'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calculator, Trophy, Eye, EyeOff, Globe,
  ChevronDown, ChevronRight, Loader2, Star, AlertTriangle
} from 'lucide-react'

interface Nomination {
  id: string; name_i18n: Record<string, string>; categories: any
  results_formula: string; score_min: number; score_max: number
}
interface Aggregate {
  id: string; nomination_id: string; rank: number | null; total: number | null
  mean: number | null; diploma_type: string | null; computed_at: string | null
  published_globally_at: string | null; visible_to_participant: boolean | null
  applications: any
}
interface Props {
  festivalId: string
  nominations: Nomination[]
  aggregates: Aggregate[]
  scoreCounts: { nomination_id: string; application_id: string }[]
  approvedApps: any[]
  locale: string
}

const DIPLOMA_TYPES = [
  { value: null, label: '—' },
  { value: 'laureate_1', label: '🥇 Лауреат I' },
  { value: 'laureate_2', label: '🥈 Лауреат II' },
  { value: 'laureate_3', label: '🥉 Лауреат III' },
  { value: 'diploma_1', label: '🏆 Диплом I' },
  { value: 'diploma_2', label: 'Диплом II' },
  { value: 'diploma_3', label: 'Диплом III' },
  { value: 'participant', label: 'Участник' },
  { value: 'special', label: 'Специальный приз' },
]

export default function ResultsManager({
  festivalId, nominations, aggregates, scoreCounts, approvedApps, locale,
}: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const call = async (url: string, method: string, body?: object) => {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Ошибка')
    return data
  }

  const computeResults = async (nominationId: string) => {
    setLoading(`compute-${nominationId}`); setError(''); setSuccess('')
    try {
      await call('/api/admin/results/compute', 'POST', { nomination_id: nominationId, festival_id: festivalId })
      setSuccess('Результаты рассчитаны')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const publishResults = async (nominationId: string) => {
    setLoading(`publish-${nominationId}`); setError(''); setSuccess('')
    try {
      await call('/api/admin/results/publish', 'POST', { nomination_id: nominationId, festival_id: festivalId })
      setSuccess('Результаты опубликованы')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const setDiploma = async (aggregateId: string, diplomaType: string | null) => {
    try {
      await call(`/api/admin/results/diploma`, 'PATCH', { aggregate_id: aggregateId, diploma_type: diplomaType })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {(error || success) && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : null}
          {error || success}
        </div>
      )}

      {nominations.map(nom => {
        const nomAggs = aggregates.filter(a => a.nomination_id === nom.id)
        const nomScores = scoreCounts.filter(s => s.nomination_id === nom.id)
        const uniqueJudgedApps = new Set(nomScores.map(s => s.application_id)).size
        const isExpanded = expanded[nom.id]
        const isComputed = nomAggs.length > 0
        const isPublished = nomAggs.some(a => a.published_globally_at)
        const isComputeLoading = loading === `compute-${nom.id}`
        const isPublishLoading = loading === `publish-${nom.id}`

        return (
          <div key={nom.id} className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 px-6 py-4">
              <button onClick={() => toggle(nom.id)} className="shrink-0">
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                  : <ChevronRight className="w-4 h-4 text-on-surface-variant" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-on-surface">{getI18n(nom.name_i18n)}</p>
                  <span className="text-xs text-on-surface-variant">{getI18n(nom.categories?.name_i18n)}</span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Формула: <code className="font-mono">{nom.results_formula}</code> ·{' '}
                  {uniqueJudgedApps} заявок оценено · {nomAggs.length} результатов
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isPublished && <Badge variant="success">Опубликовано</Badge>}
                {isComputed && !isPublished && <Badge variant="warning">Рассчитано</Badge>}
                {!isComputed && <Badge variant="secondary">Не рассчитано</Badge>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => computeResults(nom.id)}
                  disabled={!!loading}
                >
                  {isComputeLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Calculator className="w-3.5 h-3.5" />
                  }
                  <span className="ml-1.5">{isComputed ? 'Пересчитать' : 'Рассчитать'}</span>
                </Button>
                {isComputed && (
                  <Button
                    size="sm"
                    onClick={() => publishResults(nom.id)}
                    disabled={!!loading || isPublished}
                    className="primary-gradient text-on-primary"
                  >
                    {isPublishLoading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Globe className="w-3.5 h-3.5" />
                    }
                    <span className="ml-1.5">Опубликовать</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Results table */}
            {isExpanded && nomAggs.length > 0 && (
              <div className="border-t border-outline-variant/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/10 text-on-surface-variant">
                      <th className="text-left px-4 py-2.5 font-medium">Место</th>
                      <th className="text-left px-4 py-2.5 font-medium">Участник</th>
                      <th className="text-left px-4 py-2.5 font-medium">Ср. балл</th>
                      <th className="text-left px-4 py-2.5 font-medium">Диплом</th>
                      <th className="text-left px-4 py-2.5 font-medium">Виден</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {nomAggs
                      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                      .map(agg => (
                        <tr key={agg.id} className="hover:bg-surface-container-low">
                          <td className="px-4 py-2.5">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {agg.rank ?? '?'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-on-surface">
                              {agg.applications?.name ?? '—'}
                            </p>
                            {agg.applications?.performance_number && (
                              <p className="text-xs text-on-surface-variant">№{agg.applications.performance_number}</p>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-on-surface">
                            {agg.mean?.toFixed(2) ?? '—'}
                            {agg.total !== agg.mean && agg.total !== null && (
                              <span className="text-xs text-on-surface-variant ml-1">(Σ{agg.total?.toFixed(1)})</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={agg.diploma_type ?? ''}
                              onChange={e => setDiploma(agg.id, e.target.value || null)}
                              className="h-8 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              {DIPLOMA_TYPES.map(d => (
                                <option key={d.value ?? '_null'} value={d.value ?? ''}>
                                  {d.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            {agg.visible_to_participant
                              ? <Eye className="w-4 h-4 text-green-500" />
                              : <EyeOff className="w-4 h-4 text-on-surface-variant" />
                            }
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
            {isExpanded && nomAggs.length === 0 && (
              <div className="border-t border-outline-variant/10 px-6 py-8 text-center text-on-surface-variant text-sm">
                Нет рассчитанных результатов. Нажмите «Рассчитать» выше.
              </div>
            )}
          </div>
        )
      })}

      {nominations.length === 0 && (
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant p-12 text-center text-on-surface-variant">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Нет активных номинаций</p>
        </div>
      )}
    </div>
  )
}
