'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2, MessageCircle, RefreshCw } from 'lucide-react'

interface Message {
  id: string
  sender_type: 'admin' | 'participant'
  sender_name: string
  message: string
  is_read: boolean
  created_at: string
}

interface Props {
  applicationId: string  // == token
  participantName: string
}

export default function ParticipantChat({ applicationId, participantName }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages?token=${applicationId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 20000)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const newFromAdmin = messages.filter(m => m.sender_type === 'admin' && !m.is_read).length

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          sender_type: 'participant',
          token: applicationId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки')
      setMessages(prev => [...prev, data.message])
      setText('')
      textareaRef.current?.focus()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="mt-8">
      {/* Кнопка открытия */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white border border-outline-variant/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium text-on-surface">Связь с организаторами</p>
            <p className="text-xs text-on-surface-variant">
              {messages.length === 0 ? 'Задайте вопрос оргкомитету' : `${messages.length} сообщений`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {newFromAdmin > 0 && (
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center font-medium">
              {newFromAdmin}
            </span>
          )}
          <span className="text-on-surface-variant text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Панель чата */}
      {open && (
        <div className="mt-2 bg-white border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
          {/* Сообщения */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/10">
            <p className="text-sm font-medium text-on-surface">Переписка с оргкомитетом</p>
            <button onClick={loadMessages} className="p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: 320 }}>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-center py-6 text-on-surface-variant/50">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Переписка пока пустая</p>
                <p className="text-xs mt-1">Напишите нам, если есть вопросы</p>
              </div>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_type === 'participant'
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-surface-container-low text-on-surface rounded-bl-sm'
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${isMe ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
                      {isMe ? 'Вы' : msg.sender_type === 'admin' ? 'Администратор' : msg.sender_name}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className={`text-xs mt-1.5 text-right ${isMe ? 'text-on-primary/50' : 'text-on-surface-variant/60'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Поле ввода */}
          <div className="px-4 py-3 border-t border-outline-variant/10">
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите вопрос или комментарий..."
                rows={2}
                className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
