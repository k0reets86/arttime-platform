import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRoleApi } from '@/lib/auth/requireRole'

export async function PATCH(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createServerSupabaseClient()

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
      .update(update).eq('id', festivalId)

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
