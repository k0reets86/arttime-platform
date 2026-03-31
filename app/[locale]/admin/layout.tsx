import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const { role, festivalId } = await requireRole(['admin', 'judge', 'cashier'], locale)

  let festivalName: string | undefined
  if (festivalId) {
    const supabase = createServerSupabaseClient()
    const { data } = await supabase
      .from('festivals')
      .select('name')
      .eq('id', festivalId)
      .single()
    festivalName = data?.name
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar locale={locale} role={role} festivalName={festivalName} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
