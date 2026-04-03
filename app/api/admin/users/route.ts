import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/requireRole'

// GET — список пользователей фестиваля
export async function GET(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { festivalId } = await requireRole(['super_admin'], locale)
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, role, active, lang_pref, created_at')
      .eq('festival_id', festivalId!)
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST — пригласить нового пользователя
export async function POST(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { festivalId } = await requireRole(['super_admin'], locale)
    const body = await req.json()
    const { email, display_name, role, lang_pref = 'ru' } = body

    if (!email || !role || !display_name) {
      return NextResponse.json({ error: 'email, display_name и role обязательны' }, { status: 400 })
    }

    const allowedRoles = ['organizer', 'judge', 'cashier', 'super_admin']
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Недопустимая роль' }, { status: 400 })
    }

    const adminClient = createAdminSupabaseClient()

    // Создаём пользователя в Supabase Auth и отправляем magic link / invite
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name },
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Записываем в public.users
    const { error: dbError } = await adminClient
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        display_name,
        role,
        festival_id: festivalId,
        lang_pref,
        active: true,
      })
    if (dbError) {
      // Откат: удаляем auth пользователя
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Отправляем invite email
    await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name, role },
    })

    return NextResponse.json({ success: true, userId: authUser.user.id })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH — изменить роль / статус пользователя
export async function PATCH(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { user: currentUser } = await requireRole(['super_admin'], locale)
    const body = await req.json()
    const { userId, role, active } = body

    if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Нельзя изменить свою собственную роль' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const updates: Record<string, unknown> = {}
    if (role !== undefined) updates.role = role
    if (active !== undefined) updates.active = active

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// DELETE — деактивировать пользователя (не удаляем, только active=false)
export async function DELETE(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { user: currentUser } = await requireRole(['super_admin'], locale)
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) return NextResponse.json({ error: 'userId обязателен' }, { status: 400 })
    if (userId === currentUser.id) {
      return NextResponse.json({ error: 'Нельзя деактивировать самого себя' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    const { error } = await supabase
      .from('users')
      .update({ active: false })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
