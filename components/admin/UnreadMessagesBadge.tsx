'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

interface UnreadMsg {
  message: string
  created_at: string
  sender_name: string
}

interface Props {
  applicationId: string
  messages: UnreadMsg[]
  locale: string
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ru', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function UnreadMessagesBadge({ applicationId, messages, locale }: Props) {
  const [open, setOpen] = useState(false)
  const count = messages.length
  if (count === 0) return null

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        href={`/${locale}/admin/applications/${applicationId}#chat`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <MessageCircle className="w-3 h-3" />
        {count}
      </Link>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-outline-variant/10 bg-surface-container-low">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
              Новых сообщений: {count}
            </p>
          </div>
          <div className="divide-y divide-outline-variant/10 max-h-48 overflow-y-auto">
            {messages.slice(0, 5).map((msg, i) => (
              <Link
                key={i}
                href={`/${locale}/admin/applications/${applicationId}#chat`}
                className="block px-3 py-2.5 hover:bg-surface-container-low transition-colors"
              >
                <p className="text-xs text-on-surface-variant mb-0.5">{formatTime(msg.created_at)}</p>
                <p className="text-sm text-on-surface line-clamp-2 break-words">{msg.message}</p>
              </Link>
            ))}
          </div>
          {count > 5 && (
            <Link
              href={`/${locale}/admin/applications/${applicationId}#chat`}
              className="block px-3 py-2 text-xs text-primary text-center hover:bg-surface-container-low border-t border-outline-variant/10"
            >
              Ещё {count - 5} сообщений →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
