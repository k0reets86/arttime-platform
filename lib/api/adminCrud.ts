import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getAdminUser() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { supabase, admin: null }
  const { data: user } = await supabase.from('users')
    .select('id, role, festival_id, active').eq('id', session.user.id).single()
  if (!user || user.role !== 'admin' || !user.active) return { supabase, admin: null }
  return { supabase, admin: user }
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export function makeAdminCrud(
  table: string,
  allowedFields: string[],
  festivalField = 'festival_id'
) {
  return {
    async POST(req: NextRequest) {
      try {
        const { supabase, admin } = await getAdminUser()
        if (!admin) return forbidden()
        const body = await req.json()
        const insert: Record<string, unknown> = { [festivalField]: admin.festival_id }
        for (const key of allowedFields) {
          if (key in body) insert[key] = body[key]
        }
        const { data, error } = await supabase.from(table).insert(insert).select().single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true, data })
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    },

    async PATCH(req: NextRequest) {
      try {
        const { supabase, admin } = await getAdminUser()
        if (!admin) return forbidden()
        const id = new URL(req.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })
        const body = await req.json()
        const update: Record<string, unknown> = {}
        for (const key of allowedFields) {
          if (key in body) update[key] = body[key]
        }
        const { error } = await supabase.from(table)
          .update(update).eq('id', id).eq(festivalField, admin.festival_id!)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    },

    async DELETE(req: NextRequest) {
      try {
        const { supabase, admin } = await getAdminUser()
        if (!admin) return forbidden()
        const id = new URL(req.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })
        const { error } = await supabase.from(table)
          .delete().eq('id', id).eq(festivalField, admin.festival_id!)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
      }
    },
  }
}
