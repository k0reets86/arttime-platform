import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

export async function POST(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])

    const { email, display_name, password, festival_id } = await req.json()
    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'email, display_name и password обязательны' }, { status: 400 })
    }
    if (festival_id && festival_id !== festivalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminSupabaseClient()

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, role: 'judge' },
    })
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create profile — используем adminClient чтобы обойти RLS
    const { error: profileError } = await adminClient.from('users').insert({
      id: authData.user.id,
      email,
      display_name,
      role: 'judge',
      festival_id: festivalId,
      active: true,
    })
    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Судья ${display_name} добавлен` })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err.message === 'Forbidden')    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
