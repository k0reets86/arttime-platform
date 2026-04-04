'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CreditCard, Loader2 } from 'lucide-react'

interface Props {
  applicationId: string
}

export default function PayButton({ applicationId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handlePay}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 text-white rounded-full px-6"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
          : <CreditCard className="w-4 h-4 mr-2" />
        }
        {loading ? 'Перенаправление...' : 'Оплатить'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
