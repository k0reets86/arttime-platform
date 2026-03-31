import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/adminCrud'

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { aggregate_id, diploma_type } = await req.json()
    if (!aggregate_id) return NextResponse.json({ error: 'aggregate_id обязателен' }, { status: 400 })

    const { error } = await supabase
      .from('aggregates')
      .update({ diploma_type: diploma_type ?? null })
      .eq('id', aggregate_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
