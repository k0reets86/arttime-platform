/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ScoringMonitor from '@/components/admin/ScoringMonitor'

export default async function ScoringPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  // Назначения судей
  const { data: assignments } = await supabase
    .from('judge_assignments')
    .select(`
      id, weight, active,
      judge_id,
      nomination_id,
      nominations(id, name_i18n),
      users:judge_id(id, display_name, email)
    `)
    .eq('festival_id', festivalId!)
    .eq('active', true)

  // Одобренные заявки по номинациям
  const { data: applications } = await supabase
    .from('applications')
    .select('id, nomination_id, name, performance_number')
    .eq('festival_id', festivalId!)
    .eq('status', 'approved')
    .order('performance_number')

  // Выставленные оценки
  const { data: scores } = await supabase
    .from('scores')
    .select('id, judge_id, application_id, nomination_id, total_score, submitted_at, synced_at')
    .eq('festival_id', festivalId!)

  // Уникальные судьи
  const judgeMap: Record<string, { id: string; name: string }> = {}
  for (const a of assignments ?? []) {
    const u = (a as any).users
    if (u && !judgeMap[a.judge_id]) {
      judgeMap[a.judge_id] = {
        id: a.judge_id,
        name: u.display_name || u.email || a.judge_id,
      }
    }
  }

  return (
    <ScoringMonitor
      festivalId={festivalId!}
      assignments={assignments as any[] ?? []}
      applications={applications ?? []}
      initialScores={scores ?? []}
      judges={Object.values(judgeMap)}
    />
  )
}
