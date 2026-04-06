import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { CheckCircle, XCircle, Ticket, User, Hash, Calendar } from 'lucide-react'

export default async function VerifyTicketPage({
  params: { locale, token },
}: {
  params: { locale: string; token: string }
}) {
  const supabase = createAdminSupabaseClient()

  const { data: payment } = await supabase
    .from('payments')
    .select(`
      id, amount, currency, quantity, notes, created_at,
      ticket_type_id,
      festivals(name, year),
      users:cashier_id(display_name)
    `)
    .eq('ticket_token', token)
    .eq('type', 'ticket')
    .eq('status', 'paid')
    .single()

  // Try to get package name
  let packageName = '—'
  if (payment?.ticket_type_id) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('name_i18n')
      .eq('id', payment.ticket_type_id)
      .single()
    if (pkg?.name_i18n) {
      const n = pkg.name_i18n as Record<string, string>
      packageName = n.ru || n.en || Object.values(n)[0] || '—'
    }
  }

  // Parse buyer name from notes "Билет: NAME"
  let buyerName: string | null = null
  if (payment?.notes) {
    const match = (payment.notes as string).match(/^Билет:\s*(.+)/)
    if (match) buyerName = match[1]
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-8">
        <div className="max-w-sm text-center bg-surface-container-lowest rounded-xl p-8 shadow-radiant">
          <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="font-headline text-xl font-bold text-on-surface mb-2">Билет не найден</h1>
          <p className="text-on-surface-variant text-sm">
            QR-код недействителен или билет не существует.
          </p>
          <p className="font-mono text-xs text-on-surface-variant mt-4 break-all opacity-60">{token}</p>
        </div>
      </div>
    )
  }

  const festival = payment.festivals as any
  const cashier = payment.users as any
  const createdAt = new Date(payment.created_at as string)
  const dateStr = `${String(createdAt.getUTCDate()).padStart(2,'0')}.${String(createdAt.getUTCMonth()+1).padStart(2,'0')}.${createdAt.getUTCFullYear()}`

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-5">

        {/* Valid badge */}
        <div className="flex items-center justify-center gap-2">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <span className="font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm border border-green-200">
            ✓ Билет действителен
          </span>
        </div>

        {/* Main card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-radiant overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary-dim px-6 py-5 text-on-primary">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <p className="font-headline font-bold text-lg leading-tight">Входной билет</p>
                <p className="text-white/70 text-xs">{festival?.name ?? 'ArtTime Festival'}</p>
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div className="divide-y divide-outline-variant/10">
            {buyerName && (
              <div className="flex items-center gap-3 px-6 py-4">
                <User className="w-4 h-4 text-on-surface-variant shrink-0" />
                <div>
                  <p className="text-xs text-on-surface-variant">Имя покупателя</p>
                  <p className="text-sm font-semibold text-on-surface">{buyerName}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 px-6 py-4">
              <Hash className="w-4 h-4 text-on-surface-variant shrink-0" />
              <div>
                <p className="text-xs text-on-surface-variant">Тип билета</p>
                <p className="text-sm font-medium text-on-surface">{packageName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4">
              <Ticket className="w-4 h-4 text-on-surface-variant shrink-0" />
              <div>
                <p className="text-xs text-on-surface-variant">Количество билетов</p>
                <p className="text-2xl font-bold text-primary">{payment.quantity ?? 1}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4">
              <Calendar className="w-4 h-4 text-on-surface-variant shrink-0" />
              <div>
                <p className="text-xs text-on-surface-variant">Дата продажи</p>
                <p className="text-sm text-on-surface">{dateStr}</p>
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">Сумма оплаты</span>
              <span className="text-lg font-bold text-on-surface">
                {(payment.amount as number).toFixed(2)} {payment.currency ?? 'EUR'}
              </span>
            </div>
          </div>

          {/* Token footer */}
          <div className="px-6 py-3 bg-surface-container-low">
            <p className="font-mono text-[10px] text-on-surface-variant text-center break-all opacity-60">{token}</p>
          </div>
        </div>

        <p className="text-center text-xs text-on-surface-variant">
          Отсканировано в {new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
