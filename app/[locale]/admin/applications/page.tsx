import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ChevronRight, ChevronLeft, Search, Filter,
  FileText, CheckCircle, Clock, XCircle, ListFilter
} from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'submitted', label: 'На рассмотрении' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: 'waitlist', label: 'Ожидание' },
]

const PAYMENT_OPTIONS = [
  { value: '', label: 'Любой платёж' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'pending', label: 'Ожидает оплаты' },
  { value: 'free', label: 'Бесплатно' },
]

const PAGE_SIZE = 20

const statusBadge = (status: string) => {
  const map: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary' | 'outline'> = {
    submitted: 'default', approved: 'success', rejected: 'destructive', waitlist: 'secondary',
  }
  const labels: Record<string, string> = {
    submitted: 'На рассм.', approved: 'Одобрена', rejected: 'Откл.', waitlist: 'Ожидание'
  }
  return <Badge variant={map[status] ?? 'outline'}>{labels[status] ?? status}</Badge>
}

const paymentBadge = (status: string) => {
  const map: Record<string, 'success' | 'warning' | 'secondary' | 'outline'> = {
    paid: 'success', pending: 'warning', free: 'secondary',
  }
  const labels: Record<string, string> = { paid: 'Оплачено', pending: 'Ожидает', free: 'Бесплатно' }
  return <Badge variant={map[status] ?? 'outline'}>{labels[status] ?? status}</Badge>
}

export default async function ApplicationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { status?: string; payment?: string; q?: string; page?: string; category?: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const status = searchParams.status ?? ''
  const payment = searchParams.payment ?? ''
  const q = searchParams.q ?? ''
  const categoryId = searchParams.category ?? ''

  // Build query
  let query = supabase
    .from('applications')
    .select(`
      id, name, contact_email, status, payment_status, performance_number,
      created_at, applicant_type,
      categories(id, name_i18n),
      nominations(id, name_i18n)
    `, { count: 'exact' })
    .eq('festival_id', festivalId!)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (payment) query = query.eq('payment_status', payment)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (q) query = query.or(`name.ilike.%${q}%,contact_email.ilike.%${q}%`)

  const from = (page - 1) * PAGE_SIZE
  query = query.range(from, from + PAGE_SIZE - 1)

  const { data: apps, count } = await query

  // Load categories for filter
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name_i18n')
    .eq('festival_id', festivalId!)
    .eq('active', true)
    .order('sort_order')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const getCatName = (cat: { name_i18n: Record<string, string> } | null) => {
    if (!cat) return '—'
    return cat.name_i18n?.ru || cat.name_i18n?.en || Object.values(cat.name_i18n)[0] || '—'
  }

  const buildUrl = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(payment ? { payment } : {}),
      ...(q ? { q } : {}),
      ...(categoryId ? { category: categoryId } : {}),
      page: String(page),
    })
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, String(v))
      else params.delete(k)
    })
    return `/${locale}/admin/applications?${params.toString()}`
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Заявки</h1>
          <p className="text-on-surface-variant mt-1">
            {count ?? 0} заявок · страница {page} из {totalPages || 1}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Поиск по имени или email..."
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={status}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Payment filter */}
          <select
            name="payment"
            defaultValue={payment}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAYMENT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            name="category"
            defaultValue={categoryId}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Все категории</option>
            {(categories ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{getCatName(c)}</option>
            ))}
          </select>

          <Button type="submit" size="sm" className="primary-gradient text-on-primary">
            <Filter className="w-4 h-4 mr-1.5" /> Фильтр
          </Button>

          {(status || payment || q || categoryId) && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/admin/applications`}>Сбросить</Link>
            </Button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/10 text-on-surface-variant">
                <th className="text-left px-4 py-3 font-medium">№</th>
                <th className="text-left px-4 py-3 font-medium">Участник</th>
                <th className="text-left px-4 py-3 font-medium">Категория / Номинация</th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="text-left px-4 py-3 font-medium">Оплата</th>
                <th className="text-left px-4 py-3 font-medium">Дата</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {(apps ?? []).map((app: any) => (
                <tr key={app.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">
                    {app.performance_number ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-on-surface">{app.name}</div>
                    <div className="text-xs text-on-surface-variant">{app.contact_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-on-surface">{getCatName(app.categories)}</div>
                    <div className="text-xs text-on-surface-variant">{getCatName(app.nominations)}</div>
                  </td>
                  <td className="px-4 py-3">{statusBadge(app.status)}</td>
                  <td className="px-4 py-3">{paymentBadge(app.payment_status)}</td>
                  <td className="px-4 py-3 text-on-surface-variant text-xs">
                    {new Date(app.created_at).toLocaleDateString('ru')}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/admin/applications/${app.id}`}>
                      <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!apps || apps.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-on-surface-variant">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Заявок не найдено</p>
                    {(status || payment || q) && (
                      <Link href={`/${locale}/admin/applications`} className="text-primary text-sm mt-2 inline-block hover:underline">
                        Сбросить фильтры
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant/10">
            <span className="text-sm text-on-surface-variant">
              {from + 1}–{Math.min(from + PAGE_SIZE, count ?? 0)} из {count ?? 0}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildUrl({ page: page - 1 })}>
                    <ChevronLeft className="w-4 h-4" /> Назад
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildUrl({ page: page + 1 })}>
                    Вперёд <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
