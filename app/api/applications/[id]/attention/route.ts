/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

// GET — список назначений внимания по заявке
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleApi(['admin'])
    const { id } = params
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('admin_attention')
      .select(`
        id, note, is_resolved, created_at, resolved_at,
        assigned_to, assigned_by,
        assignee:users!admin_attention_assigned_to_fkey(id, display_name, role, email),
        assigner:users!admin_attention_assigned_by_fkey(id, display_name)
      `)
      .eq('application_id', id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ attention: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// POST — назначить внимание администратора
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRoleApi(['admin'])
    const { id } = params
    const body = await req.json()
    const { assigned_to, note } = body

    if (!assigned_to) {
      return NextResponse.json({ error: 'assigned_to обязателен' }, { status: 400 })
    }

    const serverClient = createServerSupabaseClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminSupabaseClient()

    // Проверяем, что assignee существует в той же системе
    const { data: assignee } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', assigned_to)
      .single()

    if (!assignee) {
      return NextResponse.json({ error: 'Администратор не найден' }, { status: 404 })
    }

    const { data: record, error } = await supabase
      .from('admin_attention')
      .insert({
        application_id: id,
        assigned_to,
        assigned_by: user.id,
        note: note?.trim() || null,
        is_resolved: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ attention: record })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// PATCH — закрыть/переоткрыть назначение
export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: { id: string } }
) {
  try {
    await requireRoleApi(['admin'])
    const body = await req.json()
    const { attention_id, is_resolved } = body

    if (!attention_id) {
      return NextResponse.json({ error: 'attention_id обязателен' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('admin_attention')
      .update({
        is_resolved,
        resolved_at: is_resolved ? new Date().toISOString() : null,
      })
      .eq('id', attention_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
