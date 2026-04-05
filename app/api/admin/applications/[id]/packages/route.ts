/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

/**
 * GET  — список доступных пакетов фестиваля
 * POST — добавить пакет к заявке
 * DELETE — удалить пакет из заявки (body: { appPackageId })
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { data: packages } = await supabase
      .from('packages')
      .select('id, name_i18n, price, currency, description_i18n, max_quantity, active')
      .eq('festival_id', festivalId!)
      .eq('active', true)
      .order('sort_order')

    return NextResponse.json({ packages: packages ?? [] })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { package_id, quantity = 1 } = await req.json()
    if (!package_id) {
      return NextResponse.json({ error: 'package_id обязателен' }, { status: 400 })
    }

    // Verify application belongs to festival
    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('id', params.id)
      .eq('festival_id', festivalId!)
      .single()
    if (!app) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    // Verify package belongs to festival
    const { data: pkg } = await supabase
      .from('packages')
      .select('id, price, currency')
      .eq('id', package_id)
      .eq('festival_id', festivalId!)
      .single()
    if (!pkg) return NextResponse.json({ error: 'Пакет не найден' }, { status: 404 })

    // Check if already added — upsert by incrementing quantity
    const { data: existing } = await supabase
      .from('application_packages')
      .select('id, quantity')
      .eq('application_id', params.id)
      .eq('package_id', package_id)
      .single()

    if (existing) {
      const { error } = await supabase
        .from('application_packages')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase
        .from('application_packages')
        .insert({
          application_id: params.id,
          package_id,
          quantity,
          paid_amount: null, // not yet paid
        })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { appPackageId } = await req.json()
    if (!appPackageId) {
      return NextResponse.json({ error: 'appPackageId обязателен' }, { status: 400 })
    }

    // Verify application belongs to festival
    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('id', params.id)
      .eq('festival_id', festivalId!)
      .single()
    if (!app) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    const { error } = await supabase
      .from('application_packages')
      .delete()
      .eq('id', appPackageId)
      .eq('application_id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
