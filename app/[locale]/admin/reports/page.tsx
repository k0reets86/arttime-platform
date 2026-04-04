import { requireRole } from '@/lib/auth/requireRole'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Download, FileSpreadsheet, Trophy, Star,
  Users, Calendar, FileText, ExternalLink
} from 'lucide-react'
import PdfReportsPanel from '@/components/admin/PdfReportsPanel'

export default async function ReportsPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { festivalId } = await requireRole(['admin'], locale)
  const supabase = createServerSupabaseClient()

  const [
    { count: totalApps },
    { count: approvedApps },
    { count: totalScores },
    { count: publishedResults },
    { count: programSlots },
    { data: nominations },
  ] = await Promise.all([
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!).eq('status', 'approved'),
    supabase.from('scores').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!),
    supabase.from('aggregates').select('*', { count: 'exact', head: true }).not('published_globally_at', 'is', null),
    supabase.from('program').select('*', { count: 'exact', head: true }).eq('festival_id', festivalId!),
    supabase.from('nominations').select('id, name_i18n').eq('festival_id', festivalId!).order('sort_order'),
  ])

  const exports = [
    {
      title: 'Все заявки',
      description: 'Список всех поданных заявок с контактами, статусами и оплатой',
      url: '/api/admin/export?type=applications',
      icon: FileText,
      count: `${totalApps ?? 0} заявок`,
    },
    {
      title: 'Результаты и дипломы',
      description: 'Итоговые места, средние баллы и типы дипломов по всем номинациям',
      url: '/api/admin/export?type=results',
      icon: Trophy,
      count: `${publishedResults ?? 0} опубликованы`,
    },
    {
      title: 'Протокол оценок судей',
      description: 'Все оценки всех судей по каждому участнику и номинации',
      url: '/api/admin/export?type=scores',
      icon: Star,
      count: `${totalScores ?? 0} оценок`,
    },
    {
      title: 'Программа фестиваля',
      description: 'Порядок выступлений с временными слотами и техническими пометками',
      url: '/api/admin/export?type=program',
      icon: Calendar,
      count: `${programSlots ?? 0} слотов`,
    },
  ]

  const quickLinks = [
    {
      title: 'Публичное табло',
      description: 'Живое табло результатов для экрана в зале',
      href: `/${locale}/scoreboard`,
      icon: Trophy,
    },
    {
      title: 'Список заявок',
      description: 'Управление статусами и деталями',
      href: `/${locale}/admin/applications`,
      icon: FileText,
    },
    {
      title: 'Результаты (управление)',
      description: 'Расчёт и публикация итогов',
      href: `/${locale}/admin/results`,
      icon: Star,
    },
    {
      title: 'Программа',
      description: 'Редактор порядка выступлений',
      href: `/${locale}/admin/program`,
      icon: Calendar,
    },
  ]

  return (
    <div className="p-8 space-y-8 max-w-4xl">
      <div>
        <h1 className="font-headline text-3xl font-bold text-on-surface">Отчёты и экспорт</h1>
        <p className="text-on-surface-variant mt-1">
          Скачайте данные в CSV для Excel или откройте публичные страницы
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Всего заявок', value: totalApps ?? 0, icon: FileText },
          { label: 'Одобрено', value: approvedApps ?? 0, icon: Users },
          { label: 'Оценок', value: totalScores ?? 0, icon: Star },
          { label: 'В программе', value: programSlots ?? 0, icon: Calendar },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-container-lowest rounded-xl p-4 shadow-radiant text-center">
            <stat.icon className="w-5 h-5 mx-auto text-primary mb-1.5 opacity-70" />
            <p className="text-2xl font-headline font-bold text-on-surface">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Export downloads */}
      <div>
        <h2 className="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-on-surface-variant" /> Экспорт в CSV
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {exports.map(exp => (
            <a
              key={exp.url}
              href={exp.url}
              download
              className="group flex items-start gap-4 bg-surface-container-lowest rounded-xl p-5 shadow-radiant hover:bg-surface-container-low transition-colors border border-outline-variant/10 hover:border-primary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <exp.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-on-surface">{exp.title}</p>
                  <Download className="w-3.5 h-3.5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5">{exp.description}</p>
                <p className="text-xs text-primary mt-1.5">{exp.count}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-headline font-semibold text-on-surface mb-4 flex items-center gap-2">
          <ExternalLink className="w-5 h-5 text-on-surface-variant" /> Быстрые ссылки
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              target={link.href.includes('scoreboard') ? '_blank' : undefined}
              className="group flex items-start gap-4 bg-surface-container-lowest rounded-xl p-5 shadow-radiant hover:bg-surface-container-low transition-colors border border-outline-variant/10 hover:border-primary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                <link.icon className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-on-surface">{link.title}</p>
                  <ExternalLink className="w-3 h-3 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* All diplomas bulk actions */}
      <div className="bg-surface-container-lowest rounded-xl p-5 shadow-radiant border border-outline-variant/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-headline font-semibold text-on-surface">Дипломы участников</h3>
            <p className="text-sm text-on-surface-variant mt-1">
              Каждый участник может скачать свой диплом на странице результатов,
              используя ID своей заявки.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/${locale}/results`} target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" /> Страница дипломов
            </Link>
          </Button>
        </div>
      </div>

      {/* PDF Reports */}
      <PdfReportsPanel
        locale={locale}
        festivalId={festivalId!}
        nominations={(nominations ?? []) as any[]}
      />
    </div>
  )
}
