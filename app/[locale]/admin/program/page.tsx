/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProgramEditor from '@/components/admin/ProgramEditor'

export default async function ProgramPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const [{ data: programSlots }, { data: nominations }, { data: approvedApps }] = await Promise.all([
    supabase
      .from('program')
      .select(`
        id, slot_number, start_time, end_time, technical_comment, day_label, stage_label,
        applications(id, name, performance_number, performance_title, performance_duration_sec, nomination_id,
          nominations(name_i18n, categories(name_i18n))
        )
      `)
      .eq('festival_id', festivalId!)
      .order('slot_number'),
    supabase
      .from('nominations')
      .select('id, name_i18n, categories(name_i18n)')
      .eq('festival_id', festivalId!)
      .eq('active', true)
      .order('sort_order'),
    supabase
      .from('applications')
      .select('id, name, performance_number, performance_title, performance_duration_sec, nomination_id')
      .eq('festival_id', festivalId!)
      .eq('status', 'approved')
      .order('performance_number'),
  ])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Программа</h1>
        <p className="text-on-surface-variant mt-1">
          Редактор порядка выступлений · {programSlots?.length ?? 0} слотов
        </p>
      </div>
      <ProgramEditor
        festivalId={festivalId!}
        programSlots={(programSlots ?? []) as any[]}
        nominations={nominations ?? []}
        approvedApps={approvedApps ?? []}
        locale={locale}
      />
    </div>
  )
}
