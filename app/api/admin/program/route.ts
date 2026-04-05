import { NextRequest, NextResponse } from 'next/server'
import { requireRoleApi } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Роли с доступом к редактированию программы
const PROGRAM_ROLES = ['admin', 'stage_admin', 'music_manager']

export async function PUT(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(PROGRAM_ROLES)
    const supabase = createServerSupabaseClient()

    const { festival_id, slots } = await req.json()
    if (festival_id !== festivalId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!Array.isArray(slots)) return NextResponse.json({ error: 'slots обязателен' }, { status: 400 })

    // Delete all existing slots for this festival, then re-insert
    const { error: delErr } = await supabase
      .from('program')
      .delete()
      .eq('festival_id', festivalId)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    if (slots.length > 0) {
      const insertData = slots.map((s: any) => ({
        festival_id: festivalId,
        slot_number: s.slot_number,
        application_id: s.application_id ?? null,
        start_time: s.start_time ?? null,
        end_time: s.end_time ?? null,
        technical_comment: s.technical_comment ?? null,
        day_label: s.day_label ?? null,
        stage_label: s.stage_label ?? null,
      }))

      const { error: insertErr } = await supabase.from('program').insert(insertData)
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, saved: slots.length })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(PROGRAM_ROLES)
    const supabase = createServerSupabaseClient()

    const { data } = await supabase
      .from('program')
      .select(`
        id, slot_number, start_time, end_time, technical_comment, day_label, stage_label,
        applications(id, name, performance_number, performance_title, performance_duration_sec, video_link)
      `)
      .eq('festival_id', festivalId)
      .order('slot_number')

    return NextResponse.json({ slots: data ?? [] })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err.message === 'Forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
