/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { requireRoleApi } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { user, festivalId } = await requireRoleApi(['cashier', 'admin'])
    const supabase = createServerSupabaseClient()

    const body = await req.json()
    const { ticket_type_id, quantity, provider, buyer_name } = body

    // Fetch package info to get price
    const { data: pkg, error: pkgErr } = await supabase
      .from('packages')
      .select('id, name_i18n, price')
      .eq('id', ticket_type_id)
      .eq('festival_id', festivalId!)
      .single()

    if (pkgErr || !pkg) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 })
    }

    const amount = pkg.price * (quantity ?? 1)
    const ticket_token = randomBytes(16).toString('hex')

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        festival_id: festivalId,
        amount,
        currency: 'EUR',
        status: 'paid',
        provider: provider ?? 'cash',
        notes: buyer_name ? `Билет: ${buyer_name}` : 'Прямая продажа билета',
        ticket_token,
        ticket_type_id,
        quantity: quantity ?? 1,
        cashier_id: user.id,
      })
      .select('id')
      .single()

    if (payErr) {
      return NextResponse.json({ error: payErr.message }, { status: 400 })
    }

    return NextResponse.json({ id: payment?.id, ticket_token })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 })
  }
}
