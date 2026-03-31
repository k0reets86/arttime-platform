import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText, Users, CheckCircle, Clock, XCircle,
  TrendingUp, CreditCard, ChevronRight
} from 'lucide-react'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  color?: string
  href?: string
}

function StatCard({ label, value, icon: Icon, color = 'text-primary', href }: StatCardProps) {
  const inner = (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-radiant flex items-center gap-4 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-headline font-bold text-on-surface">{value}</p>
        <p className="text-sm text-on-surface-variant">{label}</p>
      </div>
      {href && <ChevronRight className="w-4 h-4 text-on-surface-variant ml-auto" />}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default async function AdminDashboard({ params: { locale } }: { params: { locale: string } }) {
  const { festivalId, role } = await requireRole(['admin'], locale)
  const t = await getTranslations({ locale, namespace: 'admin' })
  const supabase = createServerSupabaseClient()

  // Get festival
  const { data: festival } = await supabase
    .from('festivals')
    .select('*')
    .eq('id', festivalId!)
    .single()

  // Stats in parallel
  const [
    { count: totalApps },
    { count: pendingApps },
    { count: approvedApps },
    { count: rejectedApps },
    { count: totalJudges },
    { count: paidApps },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('status', 'submitted'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('status', 'approved'),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('status', 'rejected'),
    supabase.from('judge_assignments').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('payment_status', 'paid'),
  ])

  // Recent applications
  const { data: recentApps } = await supabase
    .from('applications')
    .select('id, name, contact_email, status, payment_status, created_at, categories(name_i18n)')
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })
    .limit(8)

  const statusBadge = (status: string) => {
    const map: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
      submitted: 'default',
      approved: 'success',
      rejected: 'destructive',
      waitlist: 'secondary',
    }
    const labels: Record<string, string> = {
      submitted: 'На рассм.', approved: 'Одобрена', rejected: 'Откл.', waitlist: 'Ожидание'
    }
    return <Badge variant={map[status] ?? 'outline'}>{labels[status] ?? status}</Badge>
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">{t('dashboard')}</h1>
          {festival && (
            <p className="text-on-surface-variant mt-1">
              {festival.name} · {festival.year}
              <Badge variant={festival.status === 'registration_open' ? 'success' : 'secondary'} className="ml-2">
                {festival.status}
              </Badge>
            </p>
          )}
        </div>
        <Button asChild size="sm">
          <Link href={`/${locale}/admin/applications`}>
            {t('applications')} <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Всего заявок" value={totalApps ?? 0} icon={FileText} href={`/${locale}/admin/applications`} />
        <StatCard label="На рассмотрении" value={pendingApps ?? 0} icon={Clock} color="text-amber-500" href={`/${locale}/admin/applications?status=submitted`} />
        <StatCard label="Одобрено" value={approvedApps ?? 0} icon={CheckCircle} color="text-green-500" />
        <StatCard label="Отклонено" value={rejectedApps ?? 0} icon={XCircle} color="text-red-500" />
        <StatCard label="Судей" value={totalJudges ?? 0} icon={Users} href={`/${locale}/admin/judges`} />
        <StatCard label="Оплачено" value={paidApps ?? 0} icon={CreditCard} color="text-emerald-500" />
      </div>

      {/* Recent applications */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant border-opacity-10">
          <h2 className="font-headline font-semibold text-on-surface">Последние заявки</h2>
          <Link href={`/${locale}/admin/applications`} className="text-sm text-primary hover:underline flex items-center gap-1">
            Все заявки <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-outline-variant divide-opacity-10">
          {(recentApps ?? []).map((app: any) => (
            <Link
              key={app.id}
              href={`/${locale}/admin/applications/${app.id}`}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-on-surface truncate">{app.name}</p>
                <p className="text-xs text-on-surface-variant truncate">{app.contact_email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBadge(app.status)}
                <span className="text-xs text-on-surface-variant">
                  {new Date(app.created_at).toLocaleDateString('ru')}
                </span>
              </div>
            </Link>
          ))}
          {(!recentApps || recentApps.length === 0) && (
            <div className="px-6 py-12 text-center text-on-surface-variant text-sm">
              Заявок пока нет
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
