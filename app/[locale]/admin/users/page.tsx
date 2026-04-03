import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import UsersManager from '@/components/admin/UsersManager'

export default async function UsersPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId, user: currentUser } = await requireRole(['super_admin'], locale)
  const supabase = createServerSupabaseClient()

  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name, role, active, lang_pref, created_at')
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-5xl space-y-4">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Пользователи</h1>
        <p className="text-on-surface-variant mt-1">
          Управление администраторами, организаторами, судьями и кассирами
        </p>
      </div>

      <UsersManager
        users={users ?? []}
        currentUserId={currentUser.id}
        locale={locale}
      />
    </div>
  )
}
