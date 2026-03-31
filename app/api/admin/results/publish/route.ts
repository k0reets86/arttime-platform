import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/adminCrud'

export async function POST(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { nomination_id, festival_id } = await req.json()
    if (!nomination_id) return NextResponse.json({ error: 'nomination_id обязателен' }, { status: 400 })
    if (festival_id !== admin.festival_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const now = new Date().toISOString()

    // Get all aggregates for this nomination
    const { data: aggs } = await supabase
      .from('aggregates')
      .select('id, application_id')
      .eq('nomination_id', nomination_id)

    if (!aggs || aggs.length === 0) {
      return NextResponse.json({ error: 'Нет рассчитанных результатов. Сначала нажмите «Рассчитать».' }, { status: 400 })
    }

    // Publish: make visible to participants and set global published timestamp
    const { error } = await supabase
      .from('aggregates')
      .update({ published_globally_at: now, visible_to_participant: true })
      .eq('nomination_id', nomination_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, published: aggs.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
