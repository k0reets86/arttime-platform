import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'judge' | 'cashier' | 'viewer'

export async function requireRole(allowedRoles: string[], locale: string) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/${locale}/login`)
  const { data: user } = await supabase
    .from('users')
    .select('id, role, festival_id, display_name, email, active')
    .eq('id', session.user.id)
    .single()
  if (!user || !allowedRoles.includes(user.role)) redirect(`/${locale}/login`)
  if (!user.active) redirect(`/${locale}/login`)
  return { session, role: user.role as UserRole, festivalId: user.festival_id, user }
}

export async function getCurrentUser(locale = 'ru') {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: user } = await supabase
    .from('users')
    .select('id, role, festival_id, display_name, email, active')
    .eq('id', session.user.id)
    .single()
  return user
}
