import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
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

    const { judge_id, active } = await req.json()
    if (!judge_id) return NextResponse.json({ error: 'judge_id обязателен' }, { status: 400 })

    const { error } = await supabase
      .from('users').update({ active })
      .eq('id', judge_id).eq('festival_id', adminUser.festival_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
