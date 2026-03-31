import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/adminCrud'

// Supported formulas for score aggregation
function applyFormula(scores: number[], formula: string): { total: number; mean: number } {
  if (scores.length === 0) return { total: 0, mean: 0 }

  switch (formula) {
    case 'sum': {
      const total = scores.reduce((a, b) => a + b, 0)
      return { total, mean: total / scores.length }
    }
    case 'median': {
      const sorted = [...scores].sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid]
      return { total: median * scores.length, mean: median }
    }
    case 'trimmed_mean': {
      if (scores.length <= 2) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        return { total: mean * scores.length, mean }
      }
      const sorted = [...scores].sort((a, b) => a - b)
      const trimmed = sorted.slice(1, -1)
      const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length
      return { total: mean * scores.length, mean }
    }
    case 'weighted_mean':
    case 'mean':
    default: {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      return { total: mean * scores.length, mean }
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { nomination_id, festival_id } = await req.json()
    if (!nomination_id) return NextResponse.json({ error: 'nomination_id обязателен' }, { status: 400 })
    if (festival_id !== admin.festival_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Load nomination config
    const { data: nomination } = await supabase
      .from('nominations')
      .select('id, results_formula, score_min, score_max')
      .eq('id', nomination_id)
      .eq('festival_id', admin.festival_id!)
      .single()
    if (!nomination) return NextResponse.json({ error: 'Номинация не найдена' }, { status: 404 })

    // Load judge weights for this nomination
    const { data: judgeAssignments } = await supabase
      .from('judge_assignments')
      .select('judge_id, weight')
      .eq('nomination_id', nomination_id)
      .eq('festival_id', admin.festival_id!)
      .eq('active', true)

    const weightMap: Record<string, number> = {}
    for (const ja of judgeAssignments ?? []) {
      weightMap[ja.judge_id] = ja.weight
    }

    // Load all approved applications in this nomination
    const { data: applications } = await supabase
      .from('applications')
      .select('id, nomination_id')
      .eq('festival_id', admin.festival_id!)
      .eq('status', 'approved')
      .eq('nomination_id', nomination_id)

    if (!applications || applications.length === 0) {
      return NextResponse.json({ error: 'Нет одобренных заявок для этой номинации' }, { status: 400 })
    }

    // Load all scores for these applications
    const appIds = applications.map(a => a.id)
    const { data: scores } = await supabase
      .from('scores')
      .select('application_id, judge_id, total_score, criteria_scores')
      .in('application_id', appIds)
      .eq('nomination_id', nomination_id)

    // Compute aggregate per application
    const results: Array<{ appId: string; total: number; mean: number }> = []

    for (const app of applications) {
      const appScores = (scores ?? []).filter(s => s.application_id === app.id)
      if (appScores.length === 0) {
        results.push({ appId: app.id, total: 0, mean: 0 })
        continue
      }

      // Apply judge weights if using weighted_mean
      let scoreValues: number[]
      if (nomination.results_formula === 'weighted_mean') {
        scoreValues = appScores.map(s => s.total_score * (weightMap[s.judge_id] ?? 1))
      } else {
        scoreValues = appScores.map(s => s.total_score)
      }

      const { total, mean } = applyFormula(scoreValues, nomination.results_formula)
      results.push({ appId: app.id, total, mean })
    }

    // Sort by mean descending, assign ranks
    results.sort((a, b) => b.mean - a.mean)

    // Handle ties (same rank for equal scores)
    let rank = 1
    for (let i = 0; i < results.length; i++) {
      if (i > 0 && results[i].mean < results[i - 1].mean) rank = i + 1
      results[i] = { ...results[i], ...{ rank } } as any
    }

    // Snapshot criteria and judge weights
    const criteriaSnapshot = {
      formula: nomination.results_formula,
      judge_count: judgeAssignments?.length ?? 0,
    }
    const judgeWeightsSnapshot = weightMap

    // Upsert aggregates
    const now = new Date().toISOString()
    const upsertData = results.map((r: any) => ({
      application_id: r.appId,
      nomination_id,
      round: 'final',
      rank: r.rank,
      total: r.total,
      mean: r.mean,
      computed_at: now,
      criteria_snapshot: criteriaSnapshot,
      judge_weights_snapshot: judgeWeightsSnapshot,
      computed_with_formula: nomination.results_formula,
      visible_to_participant: false,
      published_globally_at: null,
    }))

    const { error: upsertError } = await supabase
      .from('aggregates')
      .upsert(upsertData, { onConflict: 'application_id,nomination_id,round' })

    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      computed: results.length,
      message: `Рассчитано ${results.length} результатов`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
