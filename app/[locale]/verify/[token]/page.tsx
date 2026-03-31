import { createServerSupabaseClient } from '@/lib/supabase/server'
import { CheckCircle, XCircle, Trophy } from 'lucide-react'

export default async function VerifyPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string }
}) {
  const supabase = createServerSupabaseClient()

  const { data: aggregate } = await supabase
    .from('aggregates')
    .select(`
      id, rank, mean, diploma_type, published_globally_at,
      applications(
        id, name, performance_number, performance_title,
        nominations(id, name_i18n, categories(name_i18n)),
        festivals(name, year)
      )
    `)
    .eq('qr_verification_token', token)
    .single()

  const DIPLOMA_LABELS: Record<string, string> = {
    laureate_1: 'Лауреат I степени', laureate_2: 'Лауреат II степени', laureate_3: 'Лауреат III степени',
    diploma_1: 'Диплом I степени', diploma_2: 'Диплом II степени', diploma_3: 'Диплом III степени',
    special: 'Специальный приз', participant: 'Участник',
  }

  const getI18n = (f: Record<string, string> | null) =>
    f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

  if (!aggregate) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="max-w-sm text-center bg-surface-container-lowest rounded-xl p-8 shadow-radiant">
          <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="font-headline text-xl font-bold text-on-surface mb-2">Диплом не найден</h1>
          <p className="text-on-surface-variant text-sm">
            QR-код не действителен или диплом был отозван.
          </p>
          <p className="font-mono text-xs text-on-surface-variant mt-4 break-all">{token}</p>
        </div>
      </div>
    )
  }

  const app = aggregate.applications as any
  const festival = app?.festivals
  const nomination = app?.nominations

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="max-w-sm w-full">
        {/* Valid badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <span className="font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm">
            ✓ Диплом подлинный
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-radiant overflow-hidden">
          <div className="primary-gradient h-2" />
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-on-surface-variant uppercase tracking-wide font-medium">
              {festival?.name} {festival?.year}
            </p>

            <h1 className="font-headline text-2xl font-bold text-on-surface">{app?.name}</h1>

            {app?.performance_title && (
              <p className="text-on-surface-variant italic text-sm">«{app.performance_title}»</p>
            )}

            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {getI18n(nomination?.categories?.name_i18n ?? null)} · {getI18n(nomination?.name_i18n ?? null)}
            </div>

            {aggregate.rank && (
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center font-headline font-black text-2xl ${
                aggregate.rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                aggregate.rank === 2 ? 'bg-gray-100 text-gray-500' :
                aggregate.rank === 3 ? 'bg-orange-100 text-orange-500' :
                'bg-primary/10 text-primary'
              }`}>
                {aggregate.rank}
              </div>
            )}

            {aggregate.diploma_type && (
              <p className="font-bold text-on-surface text-lg">
                {DIPLOMA_LABELS[aggregate.diploma_type] ?? aggregate.diploma_type}
              </p>
            )}

            {aggregate.mean !== null && (
              <p className="text-sm text-on-surface-variant">
                Средний балл: <strong>{aggregate.mean?.toFixed(2)}</strong>
              </p>
            )}

            {aggregate.published_globally_at && (
              <p className="text-xs text-on-surface-variant pt-2 border-t border-outline-variant/10">
                Выдан {new Date(aggregate.published_globally_at).toLocaleDateString('ru', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant mt-4 font-mono break-all opacity-50">
          {token}
        </p>
      </div>
    </div>
  )
}
