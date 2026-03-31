import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getAdmin(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: user } = await supabase
    .from('users').select('role, festival_id, active')
    .eq('id', session.user.id).single()
  if (!user || user.role !== 'admin' || !user.active) return null
  return user
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const admin = await getAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { judge_id, nomination_id, weight = 1, festival_id } = await req.json()
    if (!judge_id || !nomination_id) {
      return NextResponse.json({ error: 'judge_id и nomination_id обязательны' }, { status: 400 })
    }
    if (festival_id !== admin.festival_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify judge belongs to this festival
    const { data: judge } = await supabase
      .from('users').select('id').eq('id', judge_id).eq('festival_id', admin.festival_id!).single()
    if (!judge) return NextResponse.json({ error: 'Судья не найден' }, { status: 404 })

    // Upsert assignment
    const { error } = await supabase.from('judge_assignments').upsert({
      judge_id,
      nomination_id,
      festival_id: admin.festival_id,
      weight,
      active: true,
    }, { onConflict: 'judge_id,nomination_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, message: 'Назначение создано' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const admin = await getAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })

    const { error } = await supabase
      .from('judge_assignments').delete()
      .eq('id', id).eq('festival_id', admin.festival_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
