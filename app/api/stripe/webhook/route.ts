import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const rawBody = await req.text()
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error('Stripe webhook signature error:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  const supabase = createAdminSupabaseClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const applicationId = session.metadata?.application_id
        if (!applicationId) break

        const amountTotal = session.amount_total ?? 0
        const currency = session.currency ?? 'eur'

        // Update payment record
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('stripe_payment_intent_id', session.payment_intent as string)
          .single()

        if (existingPayment) {
          await supabase
            .from('payments')
            .update({
              status: 'paid',
              amount: amountTotal / 100,
            })
            .eq('id', existingPayment.id)
        } else {
          await supabase.from('payments').insert({
            application_id: applicationId,
            amount: amountTotal / 100,
            currency: currency.toUpperCase(),
            status: 'paid',
            provider: 'stripe',
            stripe_payment_intent_id: session.payment_intent as string,
          })
        }

        // Mark application as paid
        await supabase
          .from('applications')
          .update({ payment_status: 'paid' })
          .eq('id', applicationId)

        // Log notification
        await supabase.from('email_notifications').insert({
          application_id: applicationId,
          event_type: 'payment_confirmed',
          status: 'pending',
        })

        console.log(`Payment confirmed for application ${applicationId}`)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const applicationId = session.metadata?.application_id
        if (!applicationId) break

        // Optionally mark payment as failed
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', session.payment_intent as string)
          .neq('status', 'paid')

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .neq('status', 'paid')
        break
      }

      default:
        // Unhandled event type — ignore
        break
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('Webhook handler error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Stripe sends raw body — must NOT parse as JSON
export const runtime = 'nodejs'
