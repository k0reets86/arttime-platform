import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: cashier } = await supabase
      .from('users')
      .select('id, role, festival_id, active')
      .eq('id', session.user.id)
      .single()

    if (!cashier || !['cashier', 'admin'].includes(cashier.role) || !cashier.active) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { application_id, festival_id, amount, currency = 'EUR', provider, notes } = await req.json()

    if (!application_id || !amount || !provider) {
      return NextResponse.json({ error: 'application_id, amount, provider обязательны' }, { status: 400 })
    }
    if (festival_id !== cashier.festival_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (amount <= 0) {
      return NextResponse.json({ error: 'Сумма должна быть больше 0' }, { status: 400 })
    }
    if (!['cash', 'card', 'transfer', 'stripe'].includes(provider)) {
      return NextResponse.json({ error: 'Неизвестный способ оплаты' }, { status: 400 })
    }

    // Verify application belongs to festival
    const { data: app } = await supabase
      .from('applications')
      .select('id, payment_status')
      .eq('id', application_id)
      .eq('festival_id', cashier.festival_id!)
      .single()
    if (!app) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    // Insert payment record
    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert({
        application_id,
        festival_id: cashier.festival_id,
        amount,
        currency,
        status: 'paid',
        provider,
        notes: notes ?? null,
        created_by: cashier.id,
      })
      .select()
      .single()

    if (payError) return NextResponse.json({ error: payError.message }, { status: 500 })

    // Recalculate total paid vs total due
    const { data: allPackages } = await supabase
      .from('application_packages')
      .select('quantity, unit_price_at_purchase')
      .eq('application_id', application_id)

    const totalDue = (allPackages ?? []).reduce((s, p) => s + p.quantity * p.unit_price_at_purchase, 0)

    const { data: allPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('application_id', application_id)
      .eq('status', 'paid')

    const totalPaid = (allPayments ?? []).reduce((s, p) => s + p.amount, 0)

    let newPaymentStatus: string
    if (totalPaid >= totalDue) {
      newPaymentStatus = 'paid'
    } else if (totalPaid > 0) {
      newPaymentStatus = 'partial'
    } else {
      newPaymentStatus = 'pending'
    }

    await supabase
      .from('applications')
      .update({ payment_status: newPaymentStatus })
      .eq('id', application_id)

    return NextResponse.json({
      success: true,
      payment_id: payment.id,
      new_payment_status: newPaymentStatus,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
