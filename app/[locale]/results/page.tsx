/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trophy, Download, QrCode } from 'lucide-react'

// Public results page for participants (no auth required)
export default async function ResultsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string }
  searchParams: { id?: string }
}) {
  const supabase = createServerSupabaseClient()
  const applicationId = searchParams.id

  let application = null
  let aggregate = null

  if (applicationId) {
    const { data: app } = await supabase
      .from('applications')
      .select(`
        id, name, performance_number, performance_title,
        nominations(id, name_i18n, categories(name_i18n))
      `)
      .eq('id', applicationId)
      .single()

    if (app) {
      application = app
      const { data: agg } = await supabase
        .from('aggregates')
        .select('id, rank, mean, total, diploma_type, published_globally_at, qr_verification_token')
        .eq('application_id', applicationId)
        .eq('visible_to_participant', true)
        .single()
      aggregate = agg
    }
  }

  const DIPLOMA_LABELS: Record<string, string> = {
    laureate_1: 'Лауреат I степени',
    laureate_2: 'Лауреат II степени',
    laureate_3: 'Лауреат III степени',
    diploma_1: 'Диплом I степени',
    diploma_2: 'Диплом II степени',
    diploma_3: 'Диплом III степени',
    special: 'Специальный приз',
    participant: 'Участник',
  }

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  return (
    <div className="min-h-screen bg-surface py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <Trophy className="w-12 h-12 mx-auto text-secondary mb-3" />
          <h1 className="font-headline text-3xl font-bold text-on-surface">Результаты</h1>
          <p className="text-on-surface-variant mt-1">Введите ID заявки для просмотра</p>
        </div>

        {/* Search form */}
        <form method="GET" className="bg-surface-container-lowest rounded-xl p-5 shadow-radiant">
          <div className="flex gap-3">
            <input
              name="id"
              defaultValue={applicationId}
              placeholder="ID заявки (например: abc123...)"
              className="flex-1 h-10 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <Button type="submit" className="primary-gradient text-on-primary shrink-0">
              Найти
            </Button>
          </div>
        </form>

        {/* Result card */}
        {applicationId && !application && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant text-center text-on-surface-variant">
            Заявка не найдена
          </div>
        )}

        {application && !aggregate && (
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-radiant text-center">
            <p className="font-medium text-on-surface">{application.name}</p>
            <p className="text-on-surface-variant mt-2 text-sm">Результаты ещё не опубликованы</p>
          </div>
        )}

        {application && aggregate && (
          <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
            {/* Top gradient band */}
            <div className="primary-gradient h-2" />
            <div className="p-6 text-center space-y-4">
              <div>
                <p className="text-sm text-on-surface-variant">{getI18n((application.nominations as any)?.categories?.name_i18n ?? null)}</p>
                <p className="text-sm font-medium text-on-surface-variant">{getI18n((application.nominations as any)?.name_i18n ?? null)}</p>
              </div>

              <div>
                <h2 className="font-headline text-2xl font-bold text-on-surface">{application.name}</h2>
                {application.performance_title && (
                  <p className="text-on-surface-variant italic">«{application.performance_title}»</p>
                )}
                {application.performance_number && (
                  <p className="text-xs text-on-surface-variant mt-1">Номер выступления: {application.performance_number}</p>
                )}
              </div>

              {/* Rank */}
              <div className="flex justify-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-headline font-black text-3xl ${
                  aggregate.rank === 1 ? 'bg-yellow-100 text-yellow-600 ring-4 ring-yellow-200' :
                  aggregate.rank === 2 ? 'bg-gray-100 text-gray-500 ring-4 ring-gray-200' :
                  aggregate.rank === 3 ? 'bg-orange-100 text-orange-500 ring-4 ring-orange-200' :
                  'bg-primary/10 text-primary ring-4 ring-primary/20'
                }`}>
                  {aggregate.rank}
                </div>
              </div>

              {aggregate.diploma_type && (
                <div className="inline-block">
                  <Badge variant="secondary" className="text-sm px-4 py-1.5">
                    {DIPLOMA_LABELS[aggregate.diploma_type] ?? aggregate.diploma_type}
                  </Badge>
                </div>
              )}

              {aggregate.mean !== null && (
                <p className="text-on-surface-variant text-sm">
                  Средний балл: <strong className="text-on-surface">{aggregate.mean.toFixed(2)}</strong>
                </p>
              )}

              {/* Download diploma / QR */}
              <div className="flex gap-3 justify-center pt-2">
                {aggregate.id && (
                  <Button asChild className="primary-gradient text-on-primary">
                    <a href={`/api/diploma/${aggregate.id}`} download>
                      <Download className="w-4 h-4 mr-2" /> Скачать диплом
                    </a>
                  </Button>
                )}
                {aggregate.qr_verification_token && (
                  <Button asChild variant="outline">
                    <Link href={`/${locale}/verify/${aggregate.qr_verification_token}`}>
                      <QrCode className="w-4 h-4 mr-2" /> Проверить
                    </Link>
                  </Button>
                )}
              </div>

              <p className="text-xs text-on-surface-variant">
                Опубликовано {new Date(aggregate.published_globally_at!).toLocaleDateString('ru')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
