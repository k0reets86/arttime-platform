'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock, Hash, Loader2 } from 'lucide-react'

interface Props {
  applicationId: string
  currentStatus: string
  locale: string
}

export default function ApplicationActions({ applicationId, currentStatus, locale }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const doAction = async (action: string, extra?: Record<string, unknown>) => {
    setLoading(action)
    setError('')
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const handleAssignNumber = async () => {
    const num = prompt('Введите номер выступления:')
    if (num === null) return
    const n = parseInt(num, 10)
    if (isNaN(n) || n < 1) {
      setError('Неверный номер')
      return
    }
    await doAction('assign_number', { performance_number: n })
  }

  const isLoading = (a: string) => loading === a

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2 flex-wrap justify-end">
        {currentStatus !== 'approved' && (
          <Button
            size="sm"
            onClick={() => doAction('approve')}
            disabled={!!loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading('approve')
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle className="w-4 h-4" />
            }
            <span className="ml-1.5">Одобрить</span>
          </Button>
        )}
        {currentStatus !== 'rejected' && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => doAction('reject')}
            disabled={!!loading}
          >
            {isLoading('reject')
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <XCircle className="w-4 h-4" />
            }
            <span className="ml-1.5">Отклонить</span>
          </Button>
        )}
        {currentStatus !== 'waitlist' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => doAction('waitlist')}
            disabled={!!loading}
          >
            {isLoading('waitlist')
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Clock className="w-4 h-4" />
            }
            <span className="ml-1.5">В лист ожидания</span>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleAssignNumber}
          disabled={!!loading}
        >
          {isLoading('assign_number')
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Hash className="w-4 h-4" />
          }
          <span className="ml-1.5">Номер выступления</span>
        </Button>
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
