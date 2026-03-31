import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/requireRole'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    // Auth check
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { data: adminUser } = await supabase
      .from('users')
      .select('role, festival_id, active')
      .eq('id', session.user.id)
      .single()

    if (!adminUser || adminUser.role !== 'admin' || !adminUser.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, performance_number } = await req.json()

    // Verify application belongs to this festival
    const { data: app } = await supabase
      .from('applications')
      .select('id, festival_id, status, performance_number')
      .eq('id', params.id)
      .eq('festival_id', adminUser.festival_id!)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    let update: Record<string, unknown> = {}

    switch (action) {
      case 'approve':
        update = { status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }
        break
      case 'reject':
        update = { status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }
        break
      case 'waitlist':
        update = { status: 'waitlist', reviewed_at: new Date().toISOString(), reviewed_by: session.user.id }
        break
      case 'assign_number':
        if (!performance_number || typeof performance_number !== 'number' || performance_number < 1) {
          return NextResponse.json({ error: 'Invalid performance_number' }, { status: 400 })
        }
        // Check uniqueness within festival
        const { data: existing } = await supabase
          .from('applications')
          .select('id')
          .eq('festival_id', adminUser.festival_id!)
          .eq('performance_number', performance_number)
          .neq('id', params.id)
          .single()
        if (existing) {
          return NextResponse.json({ error: 'Номер уже занят другой заявкой' }, { status: 409 })
        }
        update = { performance_number }
        break
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

    // Log notification if status changed
    if (['approve', 'reject', 'waitlist'].includes(action)) {
      await supabase.from('email_notifications').insert({
        application_id: params.id,
        event_type: `status_${action}d`,
        status: 'pending',
      }).select()
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
