import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// DELETE /api/admin/applications/bulk
// Body: { ids: string[] }
export async function DELETE(req: NextRequest) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { festivalId } = await requireRole(['super_admin', 'organizer'], locale)

    const body = await req.json()
    const { ids } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids обязательны' }, { status: 400 })
    }

    if (ids.length > 100) {
      return NextResponse.json({ error: 'Максимум 100 за раз' }, { status: 400 })
    }

    const adminClient = createAdminSupabaseClient()

    // Убеждаемся что все заявки принадлежат этому фестивалю
    const { error } = await adminClient
      .from('applications')
      .delete()
      .in('id', ids)
      .eq('festival_id', festivalId!)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
