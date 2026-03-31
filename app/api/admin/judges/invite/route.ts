import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase
      .from('users').select('role, festival_id, active')
      .eq('id', session.user.id).single()
    if (!adminUser || adminUser.role !== 'admin' || !adminUser.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email, display_name, password, festival_id } = await req.json()
    if (!email || !password || !display_name) {
      return NextResponse.json({ error: 'email, display_name и password обязательны' }, { status: 400 })
    }
    if (festival_id !== adminUser.festival_id) {
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

    // Create profile in users table
    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      display_name,
      role: 'judge',
      festival_id: adminUser.festival_id,
      active: true,
    })
    if (profileError) {
      // Rollback auth user
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `Судья ${display_name} добавлен` })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
