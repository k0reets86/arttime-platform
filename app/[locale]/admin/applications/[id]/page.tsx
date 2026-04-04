/* eslint-disable @typescript-eslint/no-explicit-any */
import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import ApplicationActions from '@/components/admin/ApplicationActions'
import ApplicationEditForm from '@/components/admin/ApplicationEditForm'
import ApplicationChat from '@/components/admin/ApplicationChat'
import AdminAttention from '@/components/admin/AdminAttention'
import {
  ChevronLeft, User, Mail, Phone, Globe, MapPin,
  Video, Clock, FileText, Package, CreditCard, Users,
  Hash, Music
} from 'lucide-react'

export default async function ApplicationDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string }
}) {
  const { festivalId, user } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()
  const adminClient = createAdminSupabaseClient()

  const { data: app } = await supabase
    .from('applications')
    .select(`
      *,
      categories(id, name_i18n),
      nominations(id, name_i18n, criteria(id, name_i18n, weight, max_score)),
      application_members(id, full_name, birth_date, role),
      application_packages(
        id, quantity, unit_price_at_purchase,
        packages(id, name_i18n, description_i18n)
      ),
      payments(id, amount, currency, status, provider, created_at, stripe_payment_intent_id)
    `)
    .eq('id', id)
    .eq('festival_id', festivalId!)
    .single()

  if (!app) notFound()

  // Список всех администраторов фестиваля для компонента AdminAttention
  const { data: adminUsers } = await adminClient
    .from('users')
    .select('id, display_name, role, email')
    .eq('festival_id', festivalId!)
    .eq('active', true)
    .order('display_name')

  const getI18n = (field: Record<string, string> | null, fallback = '—') => {
    if (!field) return fallback
    return field.ru || field.en || Object.values(field)[0] || fallback
  }

  const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'secondary' | 'warning' | 'outline' }> = {
    submitted: { label: 'На рассмотрении', variant: 'default' },
    approved: { label: 'Одобрена', variant: 'success' },
    rejected: { label: 'Отклонена', variant: 'destructive' },
    waitlist: { label: 'Лист ожидания', variant: 'secondary' },
  }
  const sc = statusConfig[app.status] ?? { label: app.status, variant: 'outline' as const }

  const totalCost = (app.application_packages ?? []).reduce(
    (s: number, p: any) => s + p.quantity * p.unit_price_at_purchase, 0
  )

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Back */}
      <Link
        href={`/${locale}/admin/applications`}
        className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Все заявки
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-headline text-2xl font-bold text-on-surface">{app.name}</h1>
            <Badge variant={sc.variant}>{sc.label}</Badge>
            {app.performance_number && (
              <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-lg">
                <Hash className="w-3.5 h-3.5" /> {app.performance_number}
              </span>
            )}
          </div>
          <p className="text-on-surface-variant mt-1 text-sm">
            Подана {new Date(app.created_at).toLocaleString('ru')}
          </p>
        </div>
        {/* Action buttons */}
        <ApplicationActions
          applicationId={app.id}
          currentStatus={app.status}
          locale={locale}
        />
      </div>

      {/* ═══ ОСНОВНОЙ КОНТЕНТ ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Левая колонка — 2/3 */}
        <div className="lg:col-span-2 space-y-5">

          {/* Категория и номинация */}
          <Section title="Категория и номинация">
            <InfoRow icon={FileText} label="Категория" value={getI18n(app.categories?.name_i18n)} />
            <InfoRow icon={Music} label="Номинация" value={getI18n(app.nominations?.name_i18n)} />
            <InfoRow icon={Users} label="Тип" value={app.applicant_type === 'solo' ? 'Соло' : 'Коллектив'} />
          </Section>

          {/* Контактная информация */}
          <Section title="Контактная информация">
            <InfoRow icon={User} label="Контактное лицо" value={app.contact_name || '—'} />
            <InfoRow icon={Mail} label="Email" value={app.contact_email} />
            <InfoRow icon={Phone} label="Телефон" value={app.contact_phone || '—'} />
            <InfoRow icon={Globe} label="Язык" value={app.lang_pref || '—'} />
            <InfoRow icon={MapPin} label="Страна / Город" value={`${app.country || '—'} / ${app.city || '—'}`} />
          </Section>

          {/* Выступление */}
          <Section title="Выступление">
            <InfoRow icon={Music} label="Название" value={app.performance_title || '—'} />
            <InfoRow
              icon={Clock}
              label="Продолжительность"
              value={app.performance_duration_sec
                ? `${Math.floor(app.performance_duration_sec / 60)}:${String(app.performance_duration_sec % 60).padStart(2, '0')}`
                : '—'
              }
            />
            {app.video_link && (
              <div className="flex items-start gap-3 py-2">
                <Video className="w-4 h-4 text-on-surface-variant mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-on-surface-variant">Видео</p>
                  <a
                    href={app.video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {app.video_link}
                  </a>
                </div>
              </div>
            )}
            {app.technical_notes && (
              <div className="mt-3 p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant mb-1">Технические требования</p>
                <p className="text-sm text-on-surface whitespace-pre-wrap">{app.technical_notes}</p>
              </div>
            )}
          </Section>

          {/* Участники (для коллективов) */}
          {app.application_members && app.application_members.length > 0 && (
            <Section title={`Участники (${app.application_members.length})`}>
              <div className="space-y-2">
                {app.application_members.map((m: any, i: number) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 bg-surface-container-low rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface">{m.full_name}</p>
                      {m.role && <p className="text-xs text-on-surface-variant">{m.role}</p>}
                    </div>
                    {m.birth_date && (
                      <p className="text-xs text-on-surface-variant shrink-0">
                        {new Date(m.birth_date).toLocaleDateString('ru')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ───── ФОРМА РЕДАКТИРОВАНИЯ ───── */}
          <ApplicationEditForm
            applicationId={app.id}
            initialData={{
              contact_name: app.contact_name,
              contact_email: app.contact_email,
              contact_phone: app.contact_phone,
              city: app.city,
              country: app.country,
              performance_title: app.performance_title,
              performance_duration_sec: app.performance_duration_sec,
              video_link: app.video_link,
              technical_notes: app.technical_notes,
              admin_notes: app.admin_notes,
            }}
          />

          {/* ───── ЧАТ С УЧАСТНИКОМ ───── */}
          <ApplicationChat
            applicationId={app.id}
            currentUserName={(user as any).display_name || 'Администратор'}
          />
        </div>

        {/* Правая колонка — сайдбар */}
        <div className="space-y-5">

          {/* Пакеты */}
          {app.application_packages && app.application_packages.length > 0 && (
            <Section title="Пакеты">
              <div className="space-y-2">
                {app.application_packages.map((p: any) => (
                  <div key={p.id} className="flex justify-between gap-2 py-1.5 border-b border-outline-variant/10 last:border-0">
                    <div>
                      <p className="text-sm text-on-surface">{getI18n(p.packages?.name_i18n)}</p>
                      <p className="text-xs text-on-surface-variant">× {p.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-on-surface shrink-0">
                      {(p.unit_price_at_purchase * p.quantity).toFixed(2)} €
                    </p>
                  </div>
                ))}
                <div className="flex justify-between pt-1">
                  <span className="text-sm font-medium text-on-surface">Итого</span>
                  <span className="text-sm font-bold text-primary">{totalCost.toFixed(2)} €</span>
                </div>
              </div>
            </Section>
          )}

          {/* Платежи */}
          <Section title="Платежи">
            <div className="space-y-2">
              {(app.payments ?? []).length === 0 && (
                <p className="text-sm text-on-surface-variant">Нет платежей</p>
              )}
              {(app.payments ?? []).map((pay: any) => (
                <div key={pay.id} className="p-2.5 bg-surface-container-low rounded-lg">
                  <div className="flex justify-between items-center">
                    <Badge variant={pay.status === 'paid' ? 'success' : 'warning'}>
                      {pay.status === 'paid' ? 'Оплачено' : pay.status}
                    </Badge>
                    <span className="font-medium text-sm text-on-surface">
                      {pay.amount} {pay.currency?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {pay.provider} · {new Date(pay.created_at).toLocaleDateString('ru')}
                  </p>
                  {pay.stripe_payment_intent_id && (
                    <p className="text-xs text-on-surface-variant font-mono mt-0.5 truncate">
                      {pay.stripe_payment_intent_id}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>

          {/* ───── НАЗНАЧИТЬ ВНИМАНИЕ АДМИНИСТРАТОРА ───── */}
          <AdminAttention
            applicationId={app.id}
            adminUsers={adminUsers ?? []}
          />

          {/* Статус заявки — статус-страница для участника */}
          <Section title="Ссылка участника">
            <p className="text-xs text-on-surface-variant mb-2">
              Участник видит свою заявку по этой ссылке:
            </p>
            <a
              href={`/${locale}/status/${app.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline break-all"
            >
              /status/{app.id}
            </a>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-5 shadow-radiant">
      <h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-wide mb-4">
        {title}
      </h2>
      {children}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="w-4 h-4 text-on-surface-variant mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="text-sm text-on-surface">{value}</p>
      </div>
    </div>
  )
}
