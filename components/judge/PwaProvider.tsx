'use client'

import { useEffect, useState } from 'react'
import { Download, X, Wifi, WifiOff } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaProvider() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [swRegistered, setSwRegistered] = useState(false)

  useEffect(() => {
    // Регистрируем Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          setSwRegistered(true)
          console.log('[PWA] SW registered:', reg.scope)

          // Подписываемся на Background Sync
          reg.addEventListener('updatefound', () => {
            console.log('[PWA] SW updated')
          })
        })
        .catch(err => console.warn('[PWA] SW registration failed:', err))
    }

    // Слушаем сообщения от SW
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_START') {
        console.log('[PWA] Background sync started')
      }
    })

    // Install prompt
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(installEvent)
      // Показываем баннер через 3 секунды, если не установлено
      setTimeout(() => setShowBanner(true), 3000)
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
    }
  }

  return (
    <>
      {/* Баннер установки PWA */}
      {showBanner && installPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 bg-surface-container-highest rounded-2xl p-4 shadow-elevated flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface">Установить приложение</p>
            <p className="text-xs text-on-surface-variant">Работает офлайн на фестивале</p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-medium"
          >
            Установить
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="shrink-0 p-1 rounded-full hover:bg-surface-container-low"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      )}

      {/* Индикатор офлайн-режима (глобальный) */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs font-medium text-center py-1.5 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3 h-3" />
          Офлайн — оценки сохраняются локально
        </div>
      )}
    </>
  )
}
