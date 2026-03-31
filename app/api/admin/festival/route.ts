import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getAdmin(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const { data: user } = await supabase.from('users')
    .select('role, festival_id, active').eq('id', session.user.id).single()
  if (!user || user.role !== 'admin' || !user.active) return null
  return user
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const admin = await getAdmin(supabase)
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const allowed = [
      'name', 'year', 'status', 'city', 'country', 'description',
      'registration_deadline', 'max_participants', 'currency', 'contact_email', 'website',
    ]
    const update: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) update[key] = body[key]
    }

    const { error } = await supabase.from('festivals')
      .update(update).eq('id', admin.festival_id!)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
