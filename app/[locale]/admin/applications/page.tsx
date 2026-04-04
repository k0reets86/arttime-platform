/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Filter, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
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
]

const SORTABLE_FIELDS = ['performance_number', 'name', 'created_at', 'status', 'payment_status']
const PAGE_SIZE = 20

export default async function ApplicationsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: {
    status?: string; payment?: string; q?: string
    page?: string; category?: string
    sort?: string; dir?: string
  }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const page       = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const status     = searchParams.status ?? ''
  const payment    = searchParams.payment ?? ''
  const q          = searchParams.q ?? ''
  const categoryId = searchParams.category ?? ''
  const sort       = SORTABLE_FIELDS.includes(searchParams.sort ?? '') ? (searchParams.sort ?? 'created_at') : 'created_at'
  const dir        = searchParams.dir === 'asc' ? 'asc' : 'desc'

  let query = supabase
    .from('applications')
    .select(`
      id, name, contact_email, status, payment_status, performance_number,
      created_at, applicant_type,
      categories(id, name_i18n),
      nominations(id, name_i18n)
    `, { count: 'exact' })
    .eq('festival_id', festivalId!)
    .order(sort, { ascending: dir === 'asc' })

  if (status)     query = query.eq('status', status)
  if (payment)    query = query.eq('payment_status', payment)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (q)          query = query.or(`name.ilike.%${q}%,contact_email.ilike.%${q}%`)

  const from = (page - 1) * PAGE_SIZE
  query = query.range(from, from + PAGE_SIZE - 1)

  const { data: apps, count } = await query

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name_i18n')
    .eq('festival_id', festivalId!)
    .eq('active', true)
    .order('sort_order')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  const buildUrl = (overrides: Record<string, string | number>) => {
    const params = new URLSearchParams({
      ...(status     ? { status }               : {}),
      ...(payment    ? { payment }              : {}),
      ...(q          ? { q }                    : {}),
      ...(categoryId ? { category: categoryId } : {}),
      ...(sort !== 'created_at' ? { sort }      : {}),
      ...(dir  !== 'desc'       ? { dir }       : {}),
      page: String(page),
    })
    Object.entries(overrides).forEach(([k, v]) => {
      if (v !== '' && v !== undefined) params.set(k, String(v))
      else params.delete(k)
    })
    return `/${locale}/admin/applications?${params.toString()}`
  }

  const sortLinks = SORTABLE_FIELDS.map(field => ({
    field,
    label: field,
    href_asc:  buildUrl({ sort: field, dir: 'asc',  page: '1' }),
    href_desc: buildUrl({ sort: field, dir: 'desc', page: '1' }),
  }))

  const getCatName = (cat: any) => {
    if (!cat) return '—'
    return cat.name_i18n?.ru || cat.name_i18n?.en || Object.values(cat.name_i18n ?? {})[0] || '—'
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold text-on-surface">Заявки</h1>
          <p className="text-on-surface-variant mt-1">
            {count ?? 0} заявок · страница {page} из {totalPages || 1}
          </p>
        </div>
      </div>

      {/* Filters */}
      <form action={`/${locale}/admin/applications`} method="GET" className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant">
        {sort !== 'created_at' && <input type="hidden" name="sort" value={sort} />}
        {dir  !== 'desc'       && <input type="hidden" name="dir"  value={dir}  />}

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <Input name="q" defaultValue={q} placeholder="Поиск по имени или email..." className="pl-9" />
          </div>

          <select name="status" defaultValue={status}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select name="payment" defaultValue={payment}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface">
            {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select name="category" defaultValue={categoryId}
            className="h-9 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface">
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
      {(!apps || apps.length === 0) ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-radiant px-4 py-16 text-center text-on-surface-variant">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Заявок не найдено</p>
          {(status || payment || q || categoryId) && (
            <Link href={`/${locale}/admin/applications`} className="text-primary text-sm mt-2 inline-block hover:underline">
              Сбросить фильтры
            </Link>
          )}
        </div>
      ) : (
        <ApplicationsTable
          apps={(apps ?? []) as any[]}
          locale={locale}
          currentSort={sort}
          currentDir={dir}
          sortLinks={sortLinks}
          detailBase={`/${locale}/admin/applications`}
        />
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
                <Link href={buildUrl({ page: page - 1 })}><ChevronLeft className="w-4 h-4" /> Назад</Link>
              </Button>
            )}
            {page < totalPages && (
              <Button asChild variant="outline" size="sm">
                <Link href={buildUrl({ page: page + 1 })}>Вперёд <ChevronRight className="w-4 h-4" /></Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
