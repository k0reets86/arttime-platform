'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X, WifiOff, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa_banner_dismissed'

export default function PwaProvider() {
  const pathname = usePathname()
  const isJudgeRoute = pathname?.includes('/judge') || pathname?.includes('/admin')

  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Регистрируем Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[PWA] SW registered:', reg.scope)
          reg.addEventListener('updatefound', () => console.log('[PWA] SW updated'))
        })
        .catch(err => console.warn('[PWA] SW registration failed:', err))
    }

    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_START') console.log('[PWA] Background sync started')
    })

    // Install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(installEvent)
      // Показываем только если не было отклонено ранее и маршрут правильный
      if (isJudgeRoute && !localStorage.getItem(DISMISSED_KEY)) {
        setTimeout(() => setShowBanner(true), 5000)
      }
    }
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)

    // Online/offline
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const result = await installPrompt.userChoice
    if (result.outcome === 'accepted') {
      setInstallPrompt(null)
      setShowBanner(false)
      localStorage.setItem(DISMISSED_KEY, '1')
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    // Не запоминаем навсегда — просто скрываем до следующей сессии
    // Если хотят совсем убрать — нажимают крестик ещё раз в будущем
    // (можно добавить count чтобы через 3 раза запомнить)
    sessionStorage.setItem(DISMISSED_KEY, '1')
  }

  if (!isJudgeRoute) return null

  return (
    <>
      {/* Компактный тост установки PWA — правый нижний угол */}
      {showBanner && installPrompt && (
        <div className="fixed bottom-4 right-4 z-50 bg-surface-container-highest border border-outline-variant/20 rounded-xl px-3 py-2.5 shadow-lg flex items-center gap-2.5 animate-in slide-in-from-bottom-4 max-w-[260px]">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-on-surface leading-tight">Установить приложение</p>
            <p className="text-[11px] text-on-surface-variant leading-tight">Работает офлайн</p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 px-2 py-1 rounded-lg bg-primary text-on-primary text-xs font-medium"
          >
            Установить
          </button>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-0.5 rounded-full hover:bg-surface-container-low"
          >
            <X className="w-3.5 h-3.5 text-on-surface-variant" />
          </button>
        </div>
      )}

      {/* Индикатор офлайн-режима */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3 h-3" />
          Офлайн — оценки сохраняются локально
        </div>
      )}
    </>
  )
}
