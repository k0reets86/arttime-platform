import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ResultsManager from '@/components/admin/ResultsManager'

export default async function ResultsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const [
    { data: nominations },
    { data: aggregates },
    { data: scoreCounts },
  ] = await Promise.all([
    supabase
      .from('nominations')
      .select('id, name_i18n, categories(name_i18n), results_formula, score_min, score_max')
      .eq('festival_id', festivalId!)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('aggregates')
      .select(`
        id, nomination_id, rank, total, mean, diploma_type,
        computed_at, published_globally_at, visible_to_participant,
        applications(id, name, performance_number)
      `)
      .eq('applications.festival_id', festivalId!)
      .order('nomination_id').order('rank'),
    supabase
      .from('scores')
      .select('nomination_id, application_id')
      .eq('festival_id', festivalId!),
  ])

  // Count approved applications per nomination
  const { data: approvedApps } = await supabase
    .from('applications')
    .select('id, category_id, nominations(id)')
    .eq('festival_id', festivalId!)
    .eq('status', 'approved')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Результаты</h1>
        <p className="text-on-surface-variant mt-1">
          Подсчёт баллов, расстановка мест и публикация дипломов
        </p>
      </div>
      <ResultsManager
        festivalId={festivalId!}
        nominations={nominations ?? []}
        aggregates={aggregates ?? []}
        scoreCounts={scoreCounts ?? []}
        approvedApps={approvedApps ?? []}
        locale={locale}
      />
    </div>
  )
}
