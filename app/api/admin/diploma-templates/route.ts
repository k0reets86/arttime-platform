/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// GET — получить шаблон диплома фестиваля
export async function GET() {
  try {
    const { festivalId } = await requireRole(['admin'])
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('diploma_templates')
      .select('*')
      .eq('festival_id', festivalId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ template: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}

// POST — upsert шаблон диплома
export async function POST(req: NextRequest) {
  try {
    const { festivalId } = await requireRole(['admin'])
    const supabase = createServerSupabaseClient()

    const body = await req.json()
    const allowed = [
      'title', 'subtitle', 'body_text',
      'director_name', 'jury_chair_name',
      'primary_color', 'secondary_color', 'logo_url',
    ]
    const payload: Record<string, unknown> = {
      festival_id: festivalId!,
      updated_at: new Date().toISOString(),
    }
    for (const key of allowed) {
      if (key in body) payload[key] = body[key]
    }

    // Upsert: обновляем если есть, иначе вставляем
    const { data: existing } = await supabase
      .from('diploma_templates')
      .select('id')
      .eq('festival_id', festivalId!)
      .maybeSingle()

    let result
    if (existing?.id) {
      const { data, error } = await supabase
        .from('diploma_templates')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      result = data
    } else {
      const { data, error } = await supabase
        .from('diploma_templates')
        .insert(payload)
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      result = data
    }

    return NextResponse.json({ id: result.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}
