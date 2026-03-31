/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import JudgesManager from '@/components/admin/JudgesManager'

export default async function JudgesPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  // Load judges with their assignments
  const { data: assignments } = await supabase
    .from('judge_assignments')
    .select(`
      id, weight, active, created_at,
      users(id, display_name, email, active),
      nominations(id, name_i18n, categories(name_i18n))
    `)
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })

  // Load nominations for assignment dropdown
  const { data: nominations } = await supabase
    .from('nominations')
    .select('id, name_i18n, categories(id, name_i18n)')
    .eq('festival_id', festivalId!)
    .eq('active', true)
    .order('sort_order')

  // Load all judges (users with role=judge in this festival)
  const { data: judges } = await supabase
    .from('users')
    .select('id, display_name, email, active, created_at')
    .eq('festival_id', festivalId!)
    .eq('role', 'judge')
    .order('display_name')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Судьи</h1>
        <p className="text-on-surface-variant mt-1">
          {judges?.length ?? 0} судей · {assignments?.length ?? 0} назначений
        </p>
      </div>
      <JudgesManager
        festivalId={festivalId!}
        judges={(judges ?? []) as any[]}
        assignments={(assignments ?? []) as any[]}
        nominations={(nominations ?? []) as any[]}
        locale={locale}
      />
    </div>
  )
}
