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

  // Applications needing payment
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

  // Recent payments
  const { data: recentPayments } = await supabase
    .from('payments')
    .select(`
      id, amount, currency, status, provider, created_at, notes,
      applications(id, name, performance_number)
    `)
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })
    .limit(20)

  // Stats
  const [
    { data: totalPaid },
    { data: totalPending },
  ] = await Promise.all([
    supabase.rpc('sum_payments', { p_festival_id: festivalId!, p_status: 'paid' }).select(),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('status', 'pending'),
  ])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Касса</h1>
        <p className="text-on-surface-variant mt-1">Регистрация платежей и управление оплатами</p>
      </div>
      <CashierApp
        festivalId={festivalId!}
        cashierName={user.display_name || user.email}
        unpaidApps={unpaidApps ?? []}
        recentPayments={(recentPayments ?? []) as any[]}
        locale={locale}
      />
    </div>
  )
}
