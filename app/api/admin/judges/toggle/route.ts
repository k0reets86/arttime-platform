import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRoleApi } from '@/lib/auth/requireRole'

export async function PATCH(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createServerSupabaseClient()

    const { judge_id, active } = await req.json()
    if (!judge_id) return NextResponse.json({ error: 'judge_id обязателен' }, { status: 400 })

    const { error } = await supabase
      .from('users').update({ active })
      .eq('id', judge_id).eq('festival_id', festivalId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
