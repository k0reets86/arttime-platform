/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

/**
 * POST /api/admin/applications/[id]/invoice
 * Создаёт дополнительный платёж (счёт) для пакетов без оплаты.
 * Body: { package_ids: string[], method: 'bank_transfer' | 'stripe' }
 * Returns: { paymentId, checkoutUrl? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])
    const supabase = createAdminSupabaseClient()

    const { package_ids, method = 'bank_transfer' } = await req.json()

    // Verify application
    const { data: app } = await supabase
      .from('applications')
      .select('id, contact_email, name, lang_pref, festival_id')
      .eq('id', params.id)
      .eq('festival_id', festivalId!)
      .single()
    if (!app) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })

    // Get packages with prices
    const { data: appPkgs } = await supabase
      .from('application_packages')
      .select('id, quantity, paid_amount, packages(id, name_i18n, price, currency)')
      .eq('application_id', params.id)
      .in('id', package_ids ?? [])

    if (!appPkgs || appPkgs.length === 0) {
      return NextResponse.json({ error: 'Пакеты не найдены' }, { status: 404 })
    }

    // Calculate total (only unpaid or specified)
    let totalAmount = 0
    const lineItems: { name: string; price: number; quantity: number }[] = []
    for (const ap of appPkgs) {
      const pkg = ap.packages as any
      const unitPrice = pkg?.price ?? 0
      const qty = ap.quantity ?? 1
      const subtotal = unitPrice * qty
      totalAmount += subtotal
      const name = pkg?.name_i18n?.ru || pkg?.name_i18n?.en || 'Пакет'
      lineItems.push({ name, price: unitPrice, quantity: qty })
    }

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Сумма равна 0' }, { status: 400 })
    }

    // Create payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        application_id: params.id,
        festival_id: festivalId!,
        type: 'additional',
        amount: totalAmount,
        currency: 'EUR',
        status: 'pending',
        provider: method === 'stripe' ? 'stripe' : 'bank_transfer',
        notes: `Доп. пакеты: ${lineItems.map(l => l.name).join(', ')}`,
      })
      .select('id')
      .single()

    if (payErr || !payment) {
      return NextResponse.json({ error: payErr?.message ?? 'Ошибка создания платежа' }, { status: 500 })
    }

    // Mark packages as invoiced (store unit price)
    for (const ap of appPkgs) {
      const pkg = ap.packages as any
      await supabase
        .from('application_packages')
        .update({
          paid_amount: (pkg?.price ?? 0) * (ap.quantity ?? 1),
        })
        .eq('id', ap.id)
    }

    // If Stripe requested
    if (method === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = await import('stripe')
        const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY)
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://arttime-platform-git-main-k0reets86s-projects.vercel.app'
        const locale = (app.lang_pref ?? 'ru') as 'ru' | 'en'

        const session = await stripeClient.checkout.sessions.create({
          mode: 'payment',
          customer_email: app.contact_email ?? undefined,
          line_items: lineItems.map(li => ({
            price_data: {
              currency: 'eur',
              product_data: { name: li.name },
              unit_amount: Math.round(li.price * 100),
            },
            quantity: li.quantity,
          })),
          metadata: {
            application_id: params.id,
            payment_id: payment.id,
            type: 'additional',
          },
          success_url: `${origin}/${locale}/status/${params.id}?payment=success`,
          cancel_url: `${origin}/${locale}/status/${params.id}?payment=cancel`,
        })

        // Store session ID
        await supabase.from('payments').update({
          stripe_payment_intent_id: session.id,
        }).eq('id', payment.id)

        return NextResponse.json({
          success: true,
          paymentId: payment.id,
          checkoutUrl: session.url,
          totalAmount,
        })
      } catch (e: any) {
        // Stripe failed — return plain payment without checkout URL
        return NextResponse.json({
          success: true,
          paymentId: payment.id,
          checkoutUrl: null,
          totalAmount,
          warning: 'Stripe недоступен. Выставлен счёт на оплату вручную.',
        })
      }
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl: null,
      totalAmount,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
