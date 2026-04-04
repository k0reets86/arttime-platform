'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2, MessageCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_type: 'admin' | 'participant'
  sender_name: string
  message: string
  is_read: boolean
  created_at: string
}

interface Props {
  applicationId: string
  currentUserName: string
}

export default function ApplicationChat({ applicationId, currentUserName }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Ref на контейнер с сообщениями — скроллим только его, не всю страницу
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Флаг первой загрузки — не скроллим вниз при mount (чтобы страница не прыгала)
  const isInitialLoad = useRef(true)

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader_type: 'admin' }),
      })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  // Начальная загрузка
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Supabase Realtime — подписываемся на новые сообщения в реальном времени
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat-${applicationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'application_messages',
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setTimeout(() => scrollToBottom(), 50)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [applicationId, scrollToBottom])

  // Скроллим вниз: первый раз instant (без анимации), потом smooth
  useEffect(() => {
    if (loading) return
    if (isInitialLoad.current) {
      isInitialLoad.current = false
      // Скролл без анимации внутри чат-блока — страница не прыгает
      setTimeout(() => scrollToBottom(false), 10)
      return
    }
    scrollToBottom()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const handleSend = async () => {
    if (!text.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sender_type: 'admin' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка отправки')
      setMessages(prev => {
        if (prev.some(m => m.id === data.message?.id)) return prev
        return [...prev, data.message]
      })
      setText('')
      textareaRef.current?.focus()
      setTimeout(() => scrollToBottom(), 50)
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
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant flex flex-col" style={{ height: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h2 className="font-headline font-semibold text-on-surface text-sm uppercase tracking-wide">
            Переписка с участником
          </h2>
          {messages.filter(m => m.sender_type === 'participant' && !m.is_read).length > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
              {messages.filter(m => m.sender_type === 'participant' && !m.is_read).length}
            </span>
          )}
        </div>
        <button
          onClick={loadMessages}
          className="p-1.5 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant"
          title="Обновить вручную"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages — overflow только здесь, не на всей странице */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-on-surface-variant/50">
            <MessageCircle className="w-10 h-10 mb-2 opacity-20" />
            <p className="text-sm">Переписка пока не начата</p>
            <p className="text-xs mt-1">Напишите первым или дождитесь сообщения от участника</p>
          </div>
        )}
        {messages.map(msg => {
          const isAdmin = msg.sender_type === 'admin'
          return (
            <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                isAdmin
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-surface-container-low text-on-surface rounded-bl-sm'
              }`}>
                <p className={`text-xs font-medium mb-1 ${isAdmin ? 'text-on-primary/70' : 'text-on-surface-variant'}`}>
                  {msg.sender_name}
                </p>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                <p className={`text-xs mt-1.5 text-right ${isAdmin ? 'text-on-primary/50' : 'text-on-surface-variant/60'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-outline-variant/10">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение участнику... (Enter — отправить, Shift+Enter — новая строка)"
            rows={2}
            className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="primary-gradient text-on-primary h-10 w-10 p-0 shrink-0 rounded-xl"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-on-surface-variant/40 mt-1.5">
          Пишет: {currentUserName} · Участник видит эти сообщения на странице статуса своей заявки
        </p>
      </div>
    </div>
  )
}
