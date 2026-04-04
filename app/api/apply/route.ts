import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// ──────────────────────────────────────────────────────────
// Тарифная сетка (должна совпадать с Step4Packages)
// ──────────────────────────────────────────────────────────
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
  return (PARTICIPATION_TIERS.find(t => count <= t.max) ?? PARTICIPATION_TIERS.at(-1)!).price
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
  selectedPackages?: unknown[]
}

export async function POST(req: NextRequest) {
  try {
    const body: ApplyBody = await req.json()

    const required: (keyof ApplyBody)[] = [
      'festivalId', 'applicantType', 'categoryId', 'nominationId',
      'name', 'contactName', 'contactEmail', 'performanceTitle',
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

    // Проверяем что регистрация открыта
    const { data: festival } = await supabase
      .from('festivals')
      .select('id, status')
      .eq('id', body.festivalId)
      .single()

    if (!festival) return NextResponse.json({ error: 'Festival not found' }, { status: 404 })
    if (festival.status !== 'registration_open') {
      return NextResponse.json({ error: 'Registration is closed' }, { status: 403 })
    }

    // ── Рассчитываем стоимость ──────────────────────────
    const members = body.members?.filter(m => m.full_name.trim()) ?? []
    const participantCount = body.applicantType === 'solo' ? 1 : Math.max(1, members.length)
    const pricePerPerson = getPricePerPerson(participantCount)
    const opts = body.pricingOptions ?? {}

    const baseAmount         = pricePerPerson * participantCount
    const transferAmount     = opts.transfer     ? OPTION_PRICES.transfer     * participantCount : 0
    const accommodationAmount = opts.accommodation ? OPTION_PRICES.accommodation * participantCount : 0
    const mealsAmount        = opts.meals        ? OPTION_PRICES.meals        * participantCount : 0
    const totalAmount        = baseAmount + transferAmount + accommodationAmount + mealsAmount

    // Сохраняем описание опций в notes для читаемости
    const pricingNote = [
      `Участие: ${participantCount} × ${pricePerPerson}€ = ${baseAmount}€`,
      opts.transfer     ? `Трансфер: ${participantCount} × ${OPTION_PRICES.transfer}€ = ${transferAmount}€` : null,
      opts.accommodation ? `Проживание: ${participantCount} × ${OPTION_PRICES.accommodation}€ = ${accommodationAmount}€` : null,
      opts.meals        ? `Питание: ${participantCount} × ${OPTION_PRICES.meals}€ = ${mealsAmount}€` : null,
      `ИТОГО: ${totalAmount}€`,
    ].filter(Boolean).join(' | ')

    // ── Создаём заявку ──────────────────────────────────
    const { data: application, error: appErr } = await supabase
      .from('applications')
      .insert({
        festival_id:              body.festivalId,
        applicant_type:           body.applicantType,
        category_id:              body.categoryId,
        nomination_id:            body.nominationId,
        name:                     body.name,
        contact_name:             body.contactName,
        contact_email:            body.contactEmail,
        contact_phone:            body.contactPhone ?? null,
        country:                  body.country ?? null,
        city:                     body.city ?? null,
        lang_pref:                body.langPref ?? 'ru',
        performance_title:        body.performanceTitle,
        performance_duration_sec: body.performanceDurationSec,
        video_link:               body.videoLink ?? null,
        notes:                    body.notes ? `${body.notes}\n---\n${pricingNote}` : pricingNote,
        status:                   'submitted',
        payment_status:           totalAmount > 0 ? 'pending' : 'free',
      })
      .select()
      .single()

    if (appErr || !application) {
      console.error('Application insert error:', appErr)
      return NextResponse.json({ error: 'Failed to create application' }, { status: 500 })
    }

    // Участники группы
    if (members.length > 0) {
      await supabase.from('application_members').insert(
        members.map(m => ({
          application_id: application.id,
          full_name:      m.full_name,
          birth_date:     m.birth_date || null,
          role:           m.role || null,
        }))
      )
    }

    // ── Сохраняем запись о платеже (без Stripe — только сумма) ──
    // Оплата активируется ПОСЛЕ одобрения администратором
    if (totalAmount > 0) {
      await supabase.from('payments').insert({
        application_id: application.id,
        amount:         totalAmount,
        currency:       'EUR',
        type:           'registration',
        status:         'pending',
      })
    }

    // Уведомление
    await supabase.from('email_notifications').insert({
      application_id: application.id,
      event_type:     'application_submitted',
      recipient_email: body.contactEmail,
    })

    return NextResponse.json({
      applicationId: application.id,
      totalAmount,
      checkoutUrl: null, // оплата только после одобрения
    })
  } catch (error) {
    console.error('Apply API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
