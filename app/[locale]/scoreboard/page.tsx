/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import LiveScoreboard from '@/components/scoreboard/LiveScoreboard'

export default async function ScoreboardPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const supabase = createServerSupabaseClient()

  // Find active festival
  const { data: festival } = await supabase
    .from('festivals')
    .select('id, name, year, status')
    .in('status', ['active', 'registration_closed', 'completed'])
    .order('year', { ascending: false })
    .limit(1)
    .single()

  if (!festival) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Табло результатов</h1>
          <p className="text-on-surface-variant mt-2">Фестиваль ещё не начался</p>
        </div>
      </div>
    )
  }

  // Load published aggregates
  const { data: results } = await supabase
    .from('aggregates')
    .select(`
      id, rank, total, mean, diploma_type, nomination_id, published_globally_at,
      applications(id, name, performance_number, performance_title, applicant_type, country, city),
      nominations(id, name_i18n, categories(id, name_i18n))
    `)
    .not('published_globally_at', 'is', null)
    .eq('visible_to_participant', true)
    .order('nomination_id').order('rank')

  return (
    <LiveScoreboard
      festival={festival}
      initialResults={(results ?? []) as any[]}
      locale={locale}
    />
  )
}
