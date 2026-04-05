'use client'

import { useEffect, useState, useRef } from 'react'
import { Music, Image, FileText, ExternalLink, Download, Play, Pause, Youtube } from 'lucide-react'

interface AppFile {
  id: string
  type: 'music' | 'photo' | 'doc' | 'video'
  original_name: string
  size_bytes: number
  storage_path: string
  storage_backend: string
  created_at: string
  signedUrl: string | null
}

interface Props {
  applicationId: string
  videoLink?: string | null
  locale?: string
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  if (type === 'music') return <Music className="w-4 h-4 text-purple-500" />
  if (type === 'photo') return <Image className="w-4 h-4 text-blue-500" />
  if (type === 'doc') return <FileText className="w-4 h-4 text-orange-500" />
  return <FileText className="w-4 h-4 text-gray-500" />
}

function AudioPlayer({ url, name }: { url: string; name: string }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      // Пауза всех остальных плееров
      document.querySelectorAll('audio').forEach(a => a.pause())
      audioRef.current.play()
      setPlaying(true)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnded = () => setPlaying(false)
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 transition-colors"
        title={playing ? 'Пауза' : 'Воспроизвести'}
      >
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <audio ref={audioRef} src={url} preload="none" />
      {playing && (
        <span className="text-xs text-purple-600 animate-pulse">▶ воспроизведение...</span>
      )}
    </div>
  )
}

export default function ApplicationFilesPanel({ applicationId, videoLink, locale = 'ru' }: Props) {
  const [files, setFiles] = useState<AppFile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/admin/applications/${applicationId}/files?locale=${locale}`)
      .then(r => r.json())
      .then(d => setFiles(d.files ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [applicationId, locale])

  const music = files.filter(f => f.type === 'music')
  const photos = files.filter(f => f.type === 'photo')
  const docs = files.filter(f => f.type === 'doc')
  const hasContent = files.length > 0 || videoLink

  if (loading) {
    return <p className="text-sm text-on-surface-variant animate-pulse">Загрузка файлов...</p>
  }

  if (!hasContent) {
    return <p className="text-sm text-on-surface-variant italic">Файлы не прикреплены</p>
  }

  return (
    <div className="space-y-4">
      {/* YouTube / видео ссылка */}
      {videoLink && (
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
          <Youtube className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-on-surface-variant mb-1 font-medium">YouTube / Видео-ссылка</p>
            <a
              href={videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-red-600 hover:underline break-all flex items-center gap-1"
            >
              {videoLink} <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      )}

      {/* Фонограммы */}
      {music.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide flex items-center gap-1">
            <Music className="w-3.5 h-3.5 text-purple-500" /> Фонограммы ({music.length})
          </p>
          {music.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <FileIcon type={f.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{f.original_name}</p>
                <p className="text-xs text-on-surface-variant">{formatSize(f.size_bytes)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {f.signedUrl && <AudioPlayer url={f.signedUrl} name={f.original_name} />}
                {f.signedUrl && (
                  <a href={f.signedUrl} download={f.original_name} className="text-purple-600 hover:text-purple-800">
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Фото */}
      {photos.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide flex items-center gap-1">
            <Image className="w-3.5 h-3.5 text-blue-500" /> Фото ({photos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map(f => (
              <div key={f.id} className="relative group">
                {f.signedUrl ? (
                  <a href={f.signedUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.signedUrl}
                      alt={f.original_name}
                      className="w-full h-24 object-cover rounded-lg border border-blue-100 group-hover:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </a>
                ) : (
                  <div className="w-full h-24 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center">
                    <Image className="w-6 h-6 text-blue-300" />
                  </div>
                )}
                <p className="text-xs text-on-surface-variant mt-1 truncate">{f.original_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Документы */}
      {docs.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-orange-500" /> Документы ({docs.length})
          </p>
          {docs.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
              <FileIcon type={f.type} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-on-surface truncate">{f.original_name}</p>
                <p className="text-xs text-on-surface-variant">{formatSize(f.size_bytes)}</p>
              </div>
              {f.signedUrl && (
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={f.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-800"
                    title="Открыть"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <a href={f.signedUrl} download={f.original_name} className="text-orange-600 hover:text-orange-800">
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
