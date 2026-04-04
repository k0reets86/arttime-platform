/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

// PATCH — редактировать данные заявки (только администратор)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    // Проверяем что заявка принадлежит этому фестивалю
    const { data: app } = await supabase
      .from('applications')
      .select('id, festival_id')
      .eq('id', params.id)
      .eq('festival_id', festivalId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    const body = await req.json()

    // Разрешённые поля для редактирования администратором
    const ALLOWED_FIELDS = [
      'contact_name',
      'contact_email',
      'contact_phone',
      'city',
      'country',
      'performance_title',
      'performance_duration_sec',
      'video_link',
      'technical_notes',
      'admin_notes',
    ]

    const updates: Record<string, any> = {}
    for (const field of ALLOWED_FIELDS) {
      if (field in body) {
        updates[field] = body[field] === '' ? null : body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 })
    }

    const { error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

// GET — полные данные заявки для редактирования
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        categories(id, name_i18n),
        nominations(id, name_i18n),
        application_members(id, full_name, birth_date, role),
        application_packages(id, quantity, unit_price_at_purchase, packages(id, name_i18n)),
        payments(id, amount, currency, status, provider, created_at)
      `)
      .eq('id', params.id)
      .eq('festival_id', festivalId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    return NextResponse.json({ application: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
