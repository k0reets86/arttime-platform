import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole =
  | 'super_admin'
  | 'organizer'
  | 'judge'
  | 'cashier'
  | 'stage_admin'   // Админ сцены: видит расписание + тех.требования, может редактировать программу
  | 'music_manager' // Музыкальный менеджер: видит/редактирует программу/плейлист
  | 'viewer'

/** Роли с полными правами администратора */
export const ADMIN_ROLES: UserRole[] = ['super_admin', 'organizer']

/** Роли с доступом к панели /admin (не обязательно полные права) */
export const STAFF_ROLES: UserRole[] = ['super_admin', 'organizer', 'stage_admin', 'music_manager']

/** Проверяет, имеет ли роль права администратора */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as UserRole)
}

/** Проверяет, является ли роль персоналом (доступ к /admin) */
export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.includes(role as UserRole)
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

export async function getCurrentUser() {
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

/**
 * requireRoleApi — guard для API-маршрутов (не делает redirect).
 * Бросает ошибку 'Unauthorized' если нет сессии/роли.
 * Используй в try/catch и возвращай 401/403.
 *
 * Поддерживает backward-compat: 'admin' → ['super_admin', 'organizer']
 */
export async function requireRoleApi(allowedRoles: string[]) {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')

  const { data: user } = await supabase
    .from('users')
    .select('id, role, festival_id, display_name, email, active')
    .eq('id', session.user.id)
    .single()

  if (!user || !user.active) throw new Error('Unauthorized')

  const expandedRoles = allowedRoles.flatMap(r =>
    r === 'admin' ? ['super_admin', 'organizer'] : [r]
  )
  if (!expandedRoles.includes(user.role)) throw new Error('Forbidden')

  return { session, role: user.role as UserRole, festivalId: user.festival_id as string, user }
}
