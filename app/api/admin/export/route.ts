import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/api/adminCrud'

// Returns CSV data for Excel export
export async function GET(req: NextRequest) {
  try {
    const { supabase, admin } = await getAdminUser()
    if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const type = new URL(req.url).searchParams.get('type') ?? 'applications'

    if (type === 'applications') {
      const { data: apps } = await supabase
        .from('applications')
        .select(`
          id, name, contact_email, contact_phone, status, payment_status,
          performance_number, applicant_type, country, city, lang_pref,
          performance_title, performance_duration_sec, video_link,
          created_at,
          categories(name_i18n),
          nominations(name_i18n)
        `)
        .eq('festival_id', admin.festival_id!)
        .order('performance_number')

      const getI18n = (f: any) => f?.ru || f?.en || '—'

      const STATUS_RU: Record<string, string> = {
        submitted: 'На рассмотрении', approved: 'Одобрена', rejected: 'Отклонена', waitlist: 'Ожидание'
      }
      const PAYMENT_RU: Record<string, string> = {
        paid: 'Оплачено', pending: 'Ожидает', free: 'Бесплатно'
      }

      const rows = [
        ['№', 'Имя/Коллектив', 'Email', 'Телефон', 'Категория', 'Номинация', 'Тип', 'Статус', 'Оплата', 'Страна', 'Город', 'Язык', 'Название номера', 'Длит.(сек)', 'Видео', 'Дата подачи'],
        ...(apps ?? []).map((a: any) => [
          a.performance_number ?? '',
          a.name, a.contact_email, a.contact_phone ?? '',
          getI18n(a.categories?.name_i18n),
          getI18n(a.nominations?.name_i18n),
          a.applicant_type === 'solo' ? 'Соло' : 'Коллектив',
          STATUS_RU[a.status] ?? a.status,
          PAYMENT_RU[a.payment_status] ?? a.payment_status,
          a.country ?? '', a.city ?? '', a.lang_pref ?? '',
          a.performance_title ?? '', a.performance_duration_sec ?? '',
          a.video_link ?? '',
          new Date(a.created_at).toLocaleDateString('ru'),
        ])
      ]

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="applications.csv"',
        },
      })
    }

    if (type === 'results') {
      const { data: aggs } = await supabase
        .from('aggregates')
        .select(`
          rank, mean, total, diploma_type, computed_at,
          applications(name, performance_number, performance_title, country, city),
          nominations(name_i18n, categories(name_i18n))
        `)
        .not('rank', 'is', null)
        .order('nomination_id').order('rank')

      const getI18n = (f: any) => f?.ru || f?.en || '—'

      const DIPLOMA_RU: Record<string, string> = {
        laureate_1: 'Лауреат I', laureate_2: 'Лауреат II', laureate_3: 'Лауреат III',
        diploma_1: 'Диплом I', diploma_2: 'Диплом II', diploma_3: 'Диплом III',
        special: 'Спец. приз', participant: 'Участник',
      }

      const rows = [
        ['Место', 'Участник', '№', 'Категория', 'Номинация', 'Ср.балл', 'Сумма', 'Диплом', 'Страна', 'Город'],
        ...(aggs ?? []).map((a: any) => [
          a.rank, a.applications?.name ?? '—',
          a.applications?.performance_number ?? '',
          getI18n(a.nominations?.categories?.name_i18n),
          getI18n(a.nominations?.name_i18n),
          a.mean?.toFixed(2) ?? '', a.total?.toFixed(1) ?? '',
          a.diploma_type ? (DIPLOMA_RU[a.diploma_type] ?? a.diploma_type) : '',
          a.applications?.country ?? '', a.applications?.city ?? '',
        ])
      ]

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="results.csv"',
        },
      })
    }

    if (type === 'scores') {
      const { data: scores } = await supabase
        .from('scores')
        .select(`
          total_score, submitted_at,
          users(display_name, email),
          applications(name, performance_number),
          nominations(name_i18n)
        `)
        .eq('festival_id', admin.festival_id!)
        .order('nomination_id').order('application_id')

      const getI18n = (f: any) => f?.ru || f?.en || '—'

      const rows = [
        ['Судья', 'Участник', '№', 'Номинация', 'Балл', 'Время'],
        ...(scores ?? []).map((s: any) => [
          s.users?.display_name || s.users?.email || '—',
          s.applications?.name ?? '—',
          s.applications?.performance_number ?? '',
          getI18n(s.nominations?.name_i18n),
          s.total_score,
          s.submitted_at ? new Date(s.submitted_at).toLocaleString('ru') : '',
        ])
      ]

      const csv = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')

      return new NextResponse('\uFEFF' + csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="scores.csv"',
        },
      })
    }

    return NextResponse.json({ error: 'Unknown export type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
