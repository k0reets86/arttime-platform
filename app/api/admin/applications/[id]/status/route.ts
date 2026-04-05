import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId, user } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { action, performance_number } = await req.json()

    // Проверяем что заявка принадлежит этому фестивалю
    const { data: app } = await supabase
      .from('applications')
      .select('id, festival_id, status, contact_email, name')
      .eq('id', params.id)
      .eq('festival_id', festivalId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    let update: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        update = {
          status:      'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        }
        break
      case 'reject':
        update = {
          status:         'rejected',
          payment_status: 'cancelled',
          reviewed_at:    new Date().toISOString(),
          reviewed_by:    user.id,
        }
        break
      case 'waitlist':
        update = {
          status:      'waitlist',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        }
        break
      case 'assign_number': {
        if (!performance_number || typeof performance_number !== 'number' || performance_number < 1) {
          return NextResponse.json({ error: 'Invalid performance_number' }, { status: 400 })
        }
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('festival_id', festivalId)
          .eq('performance_number', performance_number)
          .neq('id', params.id)
          .single()
        if (existing) {
          return NextResponse.json({ error: 'Номер уже занят другой заявкой' }, { status: 409 })
        }
        update = { performance_number }
        break
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const { error } = await supabase
      .from('applications')
      .update(update)
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Логируем уведомление
    if (['approve', 'reject', 'waitlist'].includes(action)) {
      await supabase.from('email_notifications').insert({
        application_id:  params.id,
        event_type:      `status_${action}d`,
        recipient_email: app.contact_email,
        status:          'pending',
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    if (msg === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (msg === 'Forbidden')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
