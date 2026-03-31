import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

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
  selectedPackages: Array<{ packageId: string; quantity: number }>
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

    // Create application
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
        payment_status: body.selectedPackages.length > 0 ? 'pending' : 'free',
      })
      .select()
      .single()

    if (appErr || !application) {
      console.error('Application insert error:', appErr)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    // Insert members (for groups)
    if (body.members && body.members.length > 0) {
      const membersData = body.members
        .filter(m => m.full_name.trim())
        .map(m => ({
          application_id: application.id,
          full_name: m.full_name,
          birth_date: m.birth_date || null,
          role: m.role || null,
        }))

      if (membersData.length > 0) {
        await supabase.from('application_members').insert(membersData)
      }
    }

    // Insert selected packages
    if (body.selectedPackages.length > 0) {
      const packagesData = body.selectedPackages.map(sp => ({
        application_id: application.id,
        package_id: sp.packageId,
        quantity: sp.quantity,
      }))
      await supabase.from('application_packages').insert(packagesData)
    }

    // Create payment record if packages selected
    let checkoutUrl: string | null = null
    if (body.selectedPackages.length > 0) {
      // Fetch package prices for total
      const { data: packages } = await supabase
        .from('packages')
        .select('id, price, currency')
        .in('id', body.selectedPackages.map(sp => sp.packageId))

      if (packages && packages.length > 0) {
        const totalAmount = body.selectedPackages.reduce((sum, sp) => {
          const pkg = packages.find(p => p.id === sp.packageId)
          return sum + (pkg ? pkg.price * sp.quantity : 0)
        }, 0)

        // Create pending payment record
        const { data: payment } = await supabase
          .from('payments')
          .insert({
            application_id: application.id,
            amount: totalAmount,
            currency: packages[0].currency,
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

            const lineItems = await Promise.all(
              body.selectedPackages.map(async (sp) => {
                const pkg = packages.find(p => p.id === sp.packageId)
                return {
                  price_data: {
                    currency: (pkg?.currency ?? 'eur').toLowerCase(),
                    product_data: { name: `Package - ${sp.packageId}` },
                    unit_amount: Math.round((pkg?.price ?? 0) * 100),
                  },
                  quantity: sp.quantity,
                }
              })
            )

            const session = await stripeClient.checkout.sessions.create({
              mode: 'payment',
              line_items: lineItems,
              success_url: `${origin}/ru/status?id=${application.id}&payment=success`,
              cancel_url: `${origin}/ru/apply?cancelled=1`,
              metadata: {
                application_id: application.id,
                payment_id: payment.id,
              },
              client_reference_id: application.id,
            })

            // Update payment with Stripe PI ID
            await supabase
              .from('payments')
              .update({ stripe_payment_intent_id: session.payment_intent as string })
              .eq('id', payment.id)

            checkoutUrl = session.url
          } catch (stripeErr) {
            console.error('Stripe error (non-fatal):', stripeErr)
            // Application is still created, user can pay later
          }
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
    })
  } catch (error) {
    console.error('Apply API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
