import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

/**
 * POST /api/payment/create-checkout
 * Создаёт Stripe Checkout Session для одобренной заявки.
 * Вызывается участником со страницы /status/[id] после одобрения администратором.
 */
export async function POST(req: NextRequest) {
  try {
    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Проверяем заявку
    const { data: app } = await supabase
      .from('applications')
      .select('id, status, payment_status, contact_email, name, lang_pref, festival_id')
      .eq('id', applicationId)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (app.status !== 'approved') {
      return NextResponse.json(
        { error: 'Оплата доступна только для одобренных заявок' },
        { status: 403 }
      )
    }

    if (app.payment_status === 'paid') {
      return NextResponse.json({ error: 'Заявка уже оплачена' }, { status: 409 })
    }

    // Получаем запись о платеже
    const { data: payment } = await supabase
      .from('payments')
      .select('id, amount, currency, stripe_payment_intent_id')
      .eq('application_id', applicationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!payment || payment.amount <= 0) {
      return NextResponse.json({ error: 'Платёж не найден или сумма равна 0' }, { status: 404 })
    }

    // Если уже есть Stripe session ID — пробуем переиспользовать
    if (payment.stripe_payment_intent_id?.startsWith('cs_')) {
      // Возвращаем существующую ссылку (Stripe session URL не хранится, перегенерируем)
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe не настроен. Обратитесь к организатору.' },
        { status: 503 }
      )
    }

    const stripe = await import('stripe')
    const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY)
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://arttime-platform-git-main-k0reets86s-projects.vercel.app'
    const locale = app.lang_pref ?? 'ru'

    const session = await stripeClient.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (payment.currency ?? 'EUR').toLowerCase(),
            product_data: {
              name: `ArtTime World Talent Festival — Регистрационный взнос`,
              description: `Заявка: ${app.name}`,
            },
            unit_amount: Math.round(payment.amount * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: app.contact_email,
      success_url: `${origin}/${locale}/status/${applicationId}?payment=success`,
      cancel_url:  `${origin}/${locale}/status/${applicationId}`,
      metadata: {
        application_id: applicationId,
        payment_id:     payment.id,
      },
      client_reference_id: applicationId,
    })

    // Сохраняем session ID
    await supabase
      .from('payments')
      .update({ stripe_payment_intent_id: session.id })
      .eq('id', payment.id)

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err: unknown) {
    console.error('create-checkout error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
