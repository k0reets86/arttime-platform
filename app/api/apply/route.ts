import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// ────────────────────────────────────────────────────────
// Тарифная сетка участия (должна совпадать с Step4Packages)
// ────────────────────────────────────────────────────────
const PARTICIPATION_TIERS = [
  { max: 1,        price: 100 },
  { max: 2,        price: 90  },
  { max: 3,        price: 80  },
  { max: 4,        price: 70  },
  { max: 5,        price: 60  },
  { max: Infinity, price: 50  },
]
const OPTION_PRICES = { transfer: 10, accommodation: 50, meals: 20 }

function getPricePerPerson(count: number): number {
  const tier = PARTICIPATION_TIERS.find(t => count <= t.max)
  return tier ? tier.price : 50
}

interface PricingOptions {
  transfer?: boolean
  accommodation?: boolean
  meals?: boolean
}

interface ApplyBody {
  festivalId: string
  applicantType: 'solo' | 'group'
  categoryId: string
  nominationId: string
  name: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  country?: string
  city?: string
  langPref?: string
  members?: Array<{ full_name: string; birth_date: string; role: string }>
  performanceTitle: string
  performanceDurationSec: number
  videoLink?: string
  notes?: string
  pricingOptions?: PricingOptions
  // legacy — игнорируем, считаем сами
  selectedPackages?: unknown[]
}

export async function POST(req: NextRequest) {
  try {
    const body: ApplyBody = await req.json()

    // Validate required fields
    const required: (keyof ApplyBody)[] = [
      'festivalId', 'applicantType', 'categoryId', 'nominationId',
      'name', 'contactName', 'contactEmail', 'performanceTitle'
    ]
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
      }
    }

    if (!body.performanceDurationSec || body.performanceDurationSec < 30) {
      return NextResponse.json({ error: 'Performance duration too short' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Check festival is open
    const { data: festival, error: festErr } = await supabase
      .from('festivals')
      .select('id, status')
      .eq('id', body.festivalId)
      .single()

    if (festErr || !festival) {
      return NextResponse.json({ error: 'Festival not found' }, { status: 404 })
    }
    if (festival.status !== 'registration_open') {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 403 })
    }

    // ── Рассчитываем стоимость ──────────────────────────
    const members = body.members?.filter(m => m.full_name.trim()) ?? []
    const participantCount = body.applicantType === 'solo' ? 1 : Math.max(1, members.length)
    const pricePerPerson = getPricePerPerson(participantCount)
    const opts = body.pricingOptions ?? {}

    const baseAmount = pricePerPerson * participantCount
    const transferAmount = opts.transfer ? OPTION_PRICES.transfer * participantCount : 0
    const accommodationAmount = opts.accommodation ? OPTION_PRICES.accommodation * participantCount : 0
    const mealsAmount = opts.meals ? OPTION_PRICES.meals * participantCount : 0
    const totalAmount = baseAmount + transferAmount + accommodationAmount + mealsAmount

    // ── Create application ──────────────────────────────
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .insert({
        festival_id: body.festivalId,
        applicant_type: body.applicantType,
        category_id: body.categoryId,
        nomination_id: body.nominationId,
        name: body.name,
        contact_name: body.contactName,
        contact_email: body.contactEmail,
        contact_phone: body.contactPhone ?? null,
        country: body.country ?? null,
        city: body.city ?? null,
        lang_pref: body.langPref ?? 'ru',
        performance_title: body.performanceTitle,
        performance_duration_sec: body.performanceDurationSec,
        video_link: body.videoLink ?? null,
        notes: body.notes ?? null,
        status: 'submitted',
        payment_status: totalAmount > 0 ? 'pending' : 'free',
      })
      .select()
      .single()

    if (appErr || !application) {
      console.error('Application insert error:', appErr)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    // Insert members (for groups)
    if (members.length > 0) {
      const membersData = members.map(m => ({
        application_id: application.id,
        full_name: m.full_name,
        birth_date: m.birth_date || null,
        role: m.role || null,
      }))
      await supabase.from('application_members').insert(membersData)
    }

    // ── Payment & Stripe ────────────────────────────────
    let checkoutUrl: string | null = null

    if (totalAmount > 0) {
      // Create pending payment record
      const { data: payment } = await supabase
        .from('payments')
        .insert({
          application_id: application.id,
          amount: totalAmount,
          currency: 'EUR',
          type: 'registration',
          status: 'pending',
        })
        .select()
        .single()

      // Try to create Stripe checkout session
      if (process.env.STRIPE_SECRET_KEY && payment) {
        try {
          const stripe = await import('stripe')
          const stripeClient = new stripe.default(process.env.STRIPE_SECRET_KEY)
          const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const locale = body.langPref ?? 'ru'

          // Формируем позиции для Stripe
          const lineItems = []

          lineItems.push({
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Участие / Participation (${participantCount} × ${pricePerPerson}€)`,
              },
              unit_amount: pricePerPerson * 100,
            },
            quantity: participantCount,
          })

          if (opts.transfer) {
            lineItems.push({
              price_data: {
                currency: 'eur',
                product_data: { name: `Трансфер из Дортмунда / Transfer from Dortmund` },
                unit_amount: OPTION_PRICES.transfer * 100,
              },
              quantity: participantCount,
            })
          }

          if (opts.accommodation) {
            lineItems.push({
              price_data: {
                currency: 'eur',
                product_data: { name: `Проживание / Accommodation` },
                unit_amount: OPTION_PRICES.accommodation * 100,
              },
              quantity: participantCount,
            })
          }

          if (opts.meals) {
            lineItems.push({
              price_data: {
                currency: 'eur',
                product_data: { name: `Питание / Meals` },
                unit_amount: OPTION_PRICES.meals * 100,
              },
              quantity: participantCount,
            })
          }

          const session = await stripeClient.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/${locale}/status/${application.id}?payment=success`,
            cancel_url: `${origin}/${locale}/apply?cancelled=1`,
            metadata: {
              application_id: application.id,
              payment_id: payment.id,
            },
            client_reference_id: application.id,
          })

          // Update payment with Stripe session ID
          await supabase
            .from('payments')
            .update({ stripe_payment_intent_id: session.id })
            .eq('id', payment.id)

          checkoutUrl = session.url
        } catch (stripeErr) {
          console.error('Stripe error (non-fatal):', stripeErr)
          // Application is still created, user can pay later
        }
      }
    }

    // Log email notification
    await supabase.from('email_notifications').insert({
      application_id: application.id,
      event_type: 'application_submitted',
      recipient_email: body.contactEmail,
    })

    return NextResponse.json({
      applicationId: application.id,
      checkoutUrl,
      totalAmount,
    })
  } catch (error) {
    console.error('Apply API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
