import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payment/webhook
 * Stripe webhook — обрабатывает checkout.session.completed.
 * Важно: читаем raw body (req.text()), а не req.json().
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  console.log('[webhook] received, body length:', body.length, ', sig present:', !!signature)

  if (!signature) {
    console.error('[webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    console.error('[webhook] Stripe env vars not configured. secretKey:', !!secretKey, 'webhookSecret:', !!webhookSecret)
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  console.log('[webhook] secret prefix:', webhookSecret.substring(0, 12) + '...')

  let event: import('stripe').Stripe.Event

  try {
    const stripe = await import('stripe')
    const stripeClient = new stripe.default(secretKey)
    event = stripeClient.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('[webhook] signature verified, event type:', event.type)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', msg)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 }
    )
  }

  // Обрабатываем событие
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as import('stripe').Stripe.Checkout.Session

    const applicationId = session.client_reference_id || session.metadata?.application_id
    const paymentId = session.metadata?.payment_id

    if (!applicationId) {
      console.warn('checkout.session.completed: no application_id in metadata')
      return NextResponse.json({ received: true })
    }

    const supabase = createAdminSupabaseClient()

    // Обновляем статус заявки
    const { error: appErr } = await supabase
      .from('applications')
      .update({ payment_status: 'paid' })
      .eq('id', applicationId)

    if (appErr) {
      console.error('Failed to update application payment_status:', appErr)
    }

    // Обновляем запись платежа
    if (paymentId) {
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          provider: 'stripe',
          stripe_payment_intent_id: session.payment_intent as string ?? session.id,
        })
        .eq('id', paymentId)
    } else {
      // Обновляем по application_id если payment_id не задан
      await supabase
        .from('payments')
        .update({
          status: 'paid',
          provider: 'stripe',
        })
        .eq('application_id', applicationId)
        .eq('status', 'pending')
    }

    console.log(`✅ Payment confirmed for application ${applicationId}`)
  }

  return NextResponse.json({ received: true })
}
