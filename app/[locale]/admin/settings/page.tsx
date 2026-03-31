import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FestivalSettingsForm from '@/components/admin/FestivalSettingsForm'
import CategoriesEditor from '@/components/admin/CategoriesEditor'
import PackagesEditor from '@/components/admin/PackagesEditor'

export default async function SettingsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const [
    { data: festival },
    { data: categories },
    { data: nominations },
    { data: criteria },
    { data: packages },
  ] = await Promise.all([
    supabase.from('festivals').select('*').eq('id', festivalId!).single(),
    supabase.from('categories').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('nominations').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('criteria').select('*').eq('festival_id', festivalId!).order('sort_order'),
    supabase.from('packages').select('*').eq('festival_id', festivalId!).order('sort_order'),
  ])

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Настройки</h1>
        <p className="text-on-surface-variant mt-1">
          Управление фестивалем, категориями, номинациями и пакетами
        </p>
      </div>

      {/* Festival settings */}
      <FestivalSettingsForm festival={festival} locale={locale} />

      {/* Categories & Nominations */}
      <CategoriesEditor
        festivalId={festivalId!}
        categories={categories ?? []}
        nominations={nominations ?? []}
        criteria={criteria ?? []}
        locale={locale}
      />

      {/* Packages */}
      <PackagesEditor
        festivalId={festivalId!}
        packages={packages ?? []}
        locale={locale}
      />
    </div>
  )
}
