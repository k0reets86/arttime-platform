import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/adminCrud'

export async function PUT(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { festival_id, slots } = await req.json()
    if (festival_id !== admin.festival_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!Array.isArray(slots)) return NextResponse.json({ error: 'slots обязателен' }, { status: 400 })

    // Delete all existing slots for this festival, then re-insert
    const { error: delErr } = await supabase
      .from('program')
      .delete()
      .eq('festival_id', admin.festival_id!)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    if (slots.length > 0) {
      const insertData = slots.map((s: any) => ({
        festival_id: admin.festival_id,
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data } = await supabase
      .from('program')
      .select(`
        id, slot_number, start_time, end_time, technical_comment, day_label, stage_label,
        applications(id, name, performance_number, performance_title, performance_duration_sec)
      `)
      .eq('festival_id', admin.festival_id!)
      .order('slot_number')

    return NextResponse.json({ slots: data ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
