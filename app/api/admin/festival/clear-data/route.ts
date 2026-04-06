import { NextRequest, NextResponse } from 'next/server'
import { requireRoleApi } from '@/lib/auth/requireRole'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// DELETE all festival data: applications, files, program, payments, scores, aggregates
// Only super_admin can call this
export async function POST(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['super_admin'])
    const supabase = createAdminSupabaseClient()

    const body = await req.json()
    if (body.confirm !== 'ОЧИСТИТЬ') {
      return NextResponse.json({ error: 'Подтверждение не совпадает' }, { status: 400 })
    }

    // 1. Get all application IDs
    const { data: apps } = await supabase
      .from('applications')
      .select('id')
      .eq('festival_id', festivalId!)

    const appIds = (apps ?? []).map(a => a.id)

    // 2. Delete application_files (get storage paths first)
    if (appIds.length > 0) {
      const { data: files } = await supabase
        .from('application_files')
        .select('storage_path, storage_backend')
        .in('application_id', appIds)

      // Delete from Supabase Storage
      const supabasePaths = (files ?? [])
        .filter(f => f.storage_backend === 'supabase' && f.storage_path)
        .map(f => f.storage_path as string)
      if (supabasePaths.length > 0) {
        await supabase.storage.from('application-files').remove(supabasePaths)
      }

      await supabase.from('application_files').delete().in('application_id', appIds)
      await supabase.from('application_members').delete().in('application_id', appIds)
      await supabase.from('application_packages').delete().in('application_id', appIds)
    }

    // 3. Delete scores and aggregates
    await supabase.from('scores').delete().eq('festival_id', festivalId!)
    await supabase.from('aggregates').delete().eq('festival_id', festivalId!)

    // 4. Delete program
    await supabase.from('program').delete().eq('festival_id', festivalId!)

    // 5. Delete payments
    await supabase.from('payments').delete().eq('festival_id', festivalId!)

    // 6. Delete email_notifications
    await supabase.from('email_notifications').delete().in('application_id', appIds.length > 0 ? appIds : ['00000000-0000-0000-0000-000000000000'])

    // 7. Delete applications themselves
    if (appIds.length > 0) {
      await supabase.from('applications').delete().eq('festival_id', festivalId!)
    }

    return NextResponse.json({
      success: true,
      deleted: {
        applications: appIds.length,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : e.message === 'Forbidden' ? 403 : 500 })
  }
}
