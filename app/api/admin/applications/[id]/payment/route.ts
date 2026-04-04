import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

/**
 * PATCH /api/admin/applications/[id]/payment
 * Ручное управление статусом оплаты (для IBAN-переводов).
 * Body: { action: 'mark_paid' | 'mark_unpaid', amount?: number, currency?: string, note?: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const locale = req.headers.get('x-locale') || 'ru'
    const { festivalId } = await requireRole(['admin', 'super_admin', 'organizer'], locale)

    const applicationId = params.id
    const body = await req.json()
    const { action, amount, currency = 'EUR', note } = body

    if (!['mark_paid', 'mark_unpaid'].includes(action)) {
      return NextResponse.json({ error: 'action должен быть mark_paid или mark_unpaid' }, { status: 400 })
    }

    const adminClient = createAdminSupabaseClient()

    // Проверяем что заявка принадлежит этому фестивалю
    const { data: app } = await adminClient
      .from('applications')
      .select('id, status, payment_status, festival_id')
      .eq('id', applicationId)
      .eq('festival_id', festivalId!)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    if (action === 'mark_paid') {
      // Обновляем статус заявки
      await adminClient
        .from('applications')
        .update({ payment_status: 'paid' })
        .eq('id', applicationId)

      // Ищем существующий pending платёж
      const { data: existingPayment } = await adminClient
        .from('payments')
        .select('id, status')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingPayment) {
        // Обновляем существующий
        await adminClient
          .from('payments')
          .update({
            status: 'paid',
            provider: 'bank_transfer',
            ...(amount ? { amount } : {}),
          })
          .eq('id', existingPayment.id)
      } else {
        // Создаём новый платёж-запись
        const finalAmount = amount ?? 0
        await adminClient
          .from('payments')
          .insert({
            application_id: applicationId,
            festival_id: festivalId!,
            type: 'registration',
            amount: finalAmount,
            currency: currency.toUpperCase(),
            status: 'paid',
            provider: 'bank_transfer',
          })
      }

      return NextResponse.json({ success: true, payment_status: 'paid' })
    }

    if (action === 'mark_unpaid') {
      await adminClient
        .from('applications')
        .update({ payment_status: 'pending' })
        .eq('id', applicationId)

      // Обновляем последний платёж обратно в pending
      const { data: existingPayment } = await adminClient
        .from('payments')
        .select('id')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (existingPayment) {
        await adminClient
          .from('payments')
          .update({ status: 'pending' })
          .eq('id', existingPayment.id)
      }

      return NextResponse.json({ success: true, payment_status: 'pending' })
    }
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
