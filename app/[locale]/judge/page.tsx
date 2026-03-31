/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import JudgeScoringApp from '@/components/judge/JudgeScoringApp'

export default async function JudgePage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { user, festivalId } = await requireRole(['judge', 'admin'], locale)
  const supabase = createServerSupabaseClient()

  // Get nominations this judge is assigned to
  const { data: assignments } = await supabase
    .from('judge_assignments')
    .select(`
      id, weight, nomination_id,
      nominations(
        id, name_i18n, score_min, score_max, results_formula,
        categories(id, name_i18n),
        criteria(id, name_i18n, weight, max_score, sort_order)
      )
    `)
    .eq('judge_id', user.id)
    .eq('festival_id', festivalId!)
    .eq('active', true)

  if (!assignments || assignments.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-2">Судейский пульт</h1>
          <p className="text-on-surface-variant">
            Вам пока не назначены номинации. Обратитесь к администратору.
          </p>
        </div>
      </div>
    )
  }

  // Load approved applications for assigned nominations
  const nominationIds = assignments.map((a: any) => a.nomination_id)
  const { data: applications } = await supabase
    .from('applications')
    .select('id, name, performance_number, performance_title, applicant_type, nomination_id')
    .eq('festival_id', festivalId!)
    .eq('status', 'approved')
    .in('nomination_id', nominationIds)
    .order('performance_number')

  // Load existing scores by this judge
  const { data: existingScores } = await supabase
    .from('scores')
    .select('id, application_id, nomination_id, total_score, criteria_scores, submitted_at, synced_at')
    .eq('judge_id', user.id)
    .eq('festival_id', festivalId!)

  return (
    <JudgeScoringApp
      judgeId={user.id}
      festivalId={festivalId!}
      assignments={assignments as any[]}
      applications={applications ?? []}
      existingScores={existingScores ?? []}
      locale={locale}
      judgeName={user.display_name || user.email}
    />
  )
}
