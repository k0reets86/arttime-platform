import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRoleApi } from '@/lib/auth/requireRole'

// GET /api/admin/pdf-data?type=diplomas|protocol|program
export async function GET(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createServerSupabaseClient()

    const type = req.nextUrl.searchParams.get('type')

    if (type === 'diplomas') {
      const { data: festival } = await supabase
        .from('festivals').select('name, year').eq('id', festivalId).single()
      const { data: template } = await supabase
        .from('diploma_templates').select('*').eq('festival_id', festivalId).maybeSingle()
      const { data: aggregates } = await supabase
        .from('aggregates')
        .select(`
          id, application_id, final_score, rank, diploma_type,
          nominations(name_i18n),
          applications(id, name, performance_number)
        `)
        .eq('festival_id', festivalId)
        .not('published_globally_at', 'is', null)
        .order('rank')
      return NextResponse.json({ festival, template, aggregates: aggregates ?? [] })
    }

    if (type === 'protocol') {
      const nomination_id = req.nextUrl.searchParams.get('nomination_id')
      const { data: festival } = await supabase
        .from('festivals').select('name, year').eq('id', festivalId).single()
      let query = supabase
        .from('scores')
        .select(`
          id, score, comment, created_at,
          applications(id, name, performance_number),
          nominations(id, name_i18n),
          criteria(name_i18n, weight),
          judge_assignments(
            users(email, display_name)
          )
        `)
        .eq('festival_id', festivalId)
        .order('created_at')
      if (nomination_id) query = query.eq('nomination_id', nomination_id)

      const { data: scores } = await query
      const { data: nominations } = await supabase
        .from('nominations').select('id, name_i18n').eq('festival_id', festivalId).order('sort_order')

      return NextResponse.json({ festival, scores: scores ?? [], nominations: nominations ?? [] })
    }

    if (type === 'program') {
      const { data: festival } = await supabase
        .from('festivals').select('name, year, city').eq('id', festivalId).single()
      const { data: program } = await supabase
        .from('program')
        .select(`
          id, start_time, end_time, day_label, stage_label, tech_comment, sort_order,
          applications(id, name, performance_number, categories(name_i18n), nominations(name_i18n))
        `)
        .eq('festival_id', festivalId)
        .order('sort_order')
      return NextResponse.json({ festival, program: program ?? [] })
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e: any) {
    if (e.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (e.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
