import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronRight, ChevronLeft, Search, Filter, FileText } from 'lucide-react'
import ApplicationsTable from '@/components/admin/ApplicationsTable'

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
  { value: 'cancelled', label: 'Отменено' },
]

const PAGE_SIZE = 20

export default async function ApplicationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: {
    status?: string; payment?: string; q?: string; page?: string
    category?: string; sort?: string; dir?: string
  }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const page     = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const status   = searchParams.status ?? ''
  const payment  = searchParams.payment ?? ''
  const q        = searchParams.q ?? ''
  const categoryId = searchParams.category ?? ''
  const sort     = searchParams.sort ?? 'created_at'
  const dir      = searchParams.dir ?? 'desc'

  const SORT_FIELDS: Record<string, string> = {
    created_at: 'created_at', name: 'name',
    status: 'status', performance_number: 'performance_number',
  }
  const safeSort = SORT_FIELDS[sort] ?? 'created_at'
  const ascending = dir === 'asc'

  let query = supabase
    .from('applications')
    .select(`
      id, name, contact_email, status, payment_status, performance_number,
      created_at, applicant_type,
      categories(id, name_i18n),
      nominations(id, name_i18n)
    `, { count: 'exact' })
    .eq('festival_id', festivalId!)
    .order(safeSort, { ascending })

  if (status)     query = query.eq('status', status)
  if (payment)    query = query.eq('payment_status', payment)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (q)          query = query.or(`name.ilike.%${q}%,contact_email.ilike.%${q}%`)

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
      ...(sort !== 'created_at' ? { sort } : {}),
      ...(dir !== 'desc' ? { dir } : {}),
      page: String(page),
    })
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, String(v))
      else params.delete(k)
    })
    return `/${locale}/admin/applications?${params.toString()}`
  }

  const makeSortLink = (field: string) => {
    const baseParams = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(payment ? { payment } : {}),
      ...(q ? { q } : {}),
      ...(categoryId ? { category: categoryId } : {}),
    })
    const ascParams = new URLSearchParams(baseParams); ascParams.set('sort', field); ascParams.set('dir', 'asc')
    const descParams = new URLSearchParams(baseParams); descParams.set('sort', field); descParams.set('dir', 'desc')
    return {
      field,
      label: field,
      href_asc: `/${locale}/admin/applications?${ascParams.toString()}`,
      href_desc: `/${locale}/admin/applications?${descParams.toString()}`,
    }
  }

  const sortLinks = ['performance_number', 'name', 'status', 'created_at'].map(makeSortLink)

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
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <Input name="q" defaultValue={q} placeholder="Поиск по имени или email..." className="pl-9" />
          </div>

          <select name="status" defaultValue={status}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select name="payment" defaultValue={payment}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
            {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select name="category" defaultValue={categoryId}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30">
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

      {/* Table with checkboxes + delete */}
      <ApplicationsTable
        apps={(apps ?? []) as any}
        locale={locale}
        currentSort={safeSort}
        currentDir={dir}
        sortLinks={sortLinks}
        detailBase={`/${locale}/admin/applications`}
      />

      {/* Empty state */}
      {(!apps || apps.length === 0) && (
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant px-4 py-16 text-center text-on-surface-variant">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Заявок не найдено</p>
          {(status || payment || q) && (
            <Link href={`/${locale}/admin/applications`} className="text-primary text-sm mt-2 inline-block hover:underline">
              Сбросить фильтры
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
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
  )
}
