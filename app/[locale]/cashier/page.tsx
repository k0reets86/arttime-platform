/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import CashierApp from '@/components/cashier/CashierApp'

export default async function CashierPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId, user } = await requireRole(['cashier', 'admin'], locale)
  const supabase = createServerSupabaseClient()

  // Applications needing payment (for Search tab)
  const { data: unpaidApps } = await supabase
    .from('applications')
    .select(`
      id, name, contact_email, contact_phone, status, payment_status, performance_number,
      categories(name_i18n), nominations(name_i18n),
      application_packages(
        id, quantity, unit_price_at_purchase,
        packages(name_i18n)
      ),
      payments(id, amount, currency, status, provider, created_at)
    `)
    .eq('festival_id', festivalId!)
    .in('payment_status', ['pending', 'partial'])
    .order('created_at', { ascending: false })

  // Recent payments (for Balance tab)
  const { data: recentPayments } = await supabase
    .from('payments')
    .select(`
      id, amount, currency, status, provider, created_at, notes,
      applications(id, name, performance_number)
    `)
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })
    .limit(100)

  // Ticket types (packages) for the sell-ticket tab
  const { data: ticketTypes } = await supabase
    .from('packages')
    .select('id, name_i18n, price, description_i18n')
    .eq('festival_id', festivalId!)
    .order('sort_order')

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Касса</h1>
        <p className="text-on-surface-variant mt-1">Продажа билетов, дневной баланс и поиск участников</p>
      </div>
      <CashierApp
        festivalId={festivalId!}
        cashierName={(user as any).display_name || (user as any).email}
        unpaidApps={(unpaidApps ?? []) as any[]}
        recentPayments={(recentPayments ?? []) as any[]}
        ticketTypes={(ticketTypes ?? []) as any[]}
        locale={locale}
      />
    </div>
  )
}
