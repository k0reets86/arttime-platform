import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'super_admin' | 'organizer' | 'judge' | 'cashier' | 'viewer'

/** Роли с правами администратора (доступ к панели /admin) */
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'organizer']

/** Проверяет, имеет ли роль права администратора */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole)
}

/**
 * requireRole — серверный guard. Перенаправляет на /login если:
 * - нет сессии
 * - роль не в списке allowedRoles
 * - пользователь неактивен
 *
 * Передай allowedRoles: ['admin'] — и super_admin/organizer автоматически подойдут.
 * Передай allowedRoles: ['super_admin'] — только суперадмин.
 */
export async function requireRole(allowedRoles: string[], locale: string) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/${locale}/login`)
  const { data: user } = await supabase
    .from('users')
    .select('id, role, festival_id, display_name, email, active')
    .eq('id', session.user.id)
    .single()
  if (!user || !user.active) redirect(`/${locale}/login`)

  // Обратная совместимость: 'admin' в allowedRoles = super_admin + organizer
  const expandedRoles = allowedRoles.flatMap(r =>
    r === 'admin' ? ['super_admin', 'organizer'] : [r]
  )
  if (!expandedRoles.includes(user.role)) redirect(`/${locale}/login`)

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
