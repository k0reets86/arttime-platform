import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FestivalSettingsForm from '@/components/admin/FestivalSettingsForm'
import CategoriesEditor from '@/components/admin/CategoriesEditor'
import PackagesEditor from '@/components/admin/PackagesEditor'
import DiplomaTemplateEditor from '@/components/admin/DiplomaTemplateEditor'
import SettingsTabs from '@/components/admin/SettingsTabs'
import DangerZone from '@/components/admin/DangerZone'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId, role } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const [
    { data: festival },
    { data: categories },
    { data: nominations },
    { data: criteria },
    { data: packages },
    { data: diplomaTemplate },
  ] = await Promise.all([
    supabase.from('festivals').select('*').eq('id', festivalId!).single(),
    supabase.from('categories').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('nominations').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('criteria').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('packages').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('diploma_templates').select('*').eq('festival_id', festivalId!).maybeSingle(),
  ])

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Настройки</h1>
        <p className="text-on-surface-variant mt-1">
          Управление фестивалем, категориями, номинациями, пакетами и шаблонами дипломов
        </p>
      </div>

      <SettingsTabs
        festivalId={festivalId!}
        locale={locale}
        festival={festival}
        categories={categories ?? []}
        nominations={nominations ?? []}
        criteria={criteria ?? []}
        packages={packages ?? []}
        diplomaTemplate={diplomaTemplate ?? null}
      />

      {role === 'super_admin' && (
        <DangerZone festivalId={festivalId!} locale={locale} />
      )}
    </div>
  )
}
