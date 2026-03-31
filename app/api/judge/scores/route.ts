import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: judge } = await supabase
      .from('users')
      .select('id, role, festival_id, active')
      .eq('id', session.user.id)
      .single()

    if (!judge || !['judge', 'admin'].includes(judge.role) || !judge.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { application_id, nomination_id, festival_id, total_score, criteria_scores } = await req.json()

    if (!application_id || !nomination_id || total_score === undefined) {
      return NextResponse.json({ error: 'application_id, nomination_id, total_score обязательны' }, { status: 400 })
    }
    if (festival_id !== judge.festival_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify judge is assigned to this nomination
    const { data: assignment } = await supabase
      .from('judge_assignments')
      .select('id')
      .eq('judge_id', judge.id)
      .eq('nomination_id', nomination_id)
      .eq('festival_id', judge.festival_id!)
      .eq('active', true)
      .single()

    if (!assignment) {
      return NextResponse.json({ error: 'Вы не назначены на эту номинацию' }, { status: 403 })
    }

    // Verify application is approved and in correct festival
    const { data: app } = await supabase
      .from('applications')
      .select('id, status')
      .eq('id', application_id)
      .eq('festival_id', judge.festival_id!)
      .eq('status', 'approved')
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Заявка не найдена или не одобрена' }, { status: 404 })
    }

    const now = new Date().toISOString()

    // Upsert score
    const { error } = await supabase.from('scores').upsert({
      judge_id: judge.id,
      application_id,
      nomination_id,
      festival_id: judge.festival_id,
      total_score,
      criteria_scores: criteria_scores ?? {},
      submitted_at: now,
      synced_at: now,
    }, { onConflict: 'judge_id,application_id,nomination_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, synced_at: now })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: judge } = await supabase
      .from('users')
      .select('id, role, festival_id, active')
      .eq('id', session.user.id)
      .single()

    if (!judge || !['judge', 'admin'].includes(judge.role) || !judge.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: scores } = await supabase
      .from('scores')
      .select('id, application_id, nomination_id, total_score, criteria_scores, submitted_at, synced_at')
      .eq('judge_id', judge.id)
      .eq('festival_id', judge.festival_id!)

    return NextResponse.json({ scores: scores ?? [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
