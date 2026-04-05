'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Music, ChevronDown, ChevronUp, Download, Loader2,
  ListMusic, Shuffle, Repeat, Repeat1
} from 'lucide-react'

interface Track {
  id: string
  slotNumber: number
  performerName: string
  performanceTitle: string | null
  applicationId: string
  signedUrl: string | null
  fileName: string | null
  loadState: 'idle' | 'loading' | 'ready' | 'error'
}

interface ProgramSlot {
  id: string
  slot_number: number
  applications: {
    id: string
    name: string
    performance_title: string | null
    performance_duration_sec: number | null
  } | null
}

interface Props {
  programSlots: ProgramSlot[]
  locale: string
}

function fmt(sec: number) {
  if (!isFinite(sec) || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type RepeatMode = 'none' | 'all' | 'one'

export default function WinampPlayer({ programSlots, locale }: Props) {
  const [tracks, setTracks] = useState<Track[]>(() =>
    programSlots
      .filter(s => s.applications)
      .map(s => ({
        id: s.id,
        slotNumber: s.slot_number,
        performerName: s.applications!.name,
        performanceTitle: s.applications!.performance_title,
        applicationId: s.applications!.id,
        signedUrl: null,
        fileName: null,
        loadState: 'idle',
      }))
  )

  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [muted, setMuted] = useState(false)
  const [repeat, setRepeat] = useState<RepeatMode>('none')
  const [shuffle, setShuffle] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [allLoaded, setAllLoaded] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const playlistRef = useRef<HTMLDivElement>(null)

  // Load music URL for a single track
  const loadTrack = useCallback(async (idx: number) => {
    const track = tracks[idx]
    if (!track || track.loadState !== 'idle') return

    setTracks(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], loadState: 'loading' }
      return next
    })

    try {
      const res = await fetch(`/api/admin/applications/${track.applicationId}/files?locale=${locale}`)
      const data = await res.json()
      const f = (data.files ?? []).find((f: any) => f.type === 'music' && f.signedUrl)
      setTracks(prev => {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          signedUrl: f?.signedUrl ?? null,
          fileName: f?.original_name ?? null,
          loadState: f?.signedUrl ? 'ready' : 'error',
        }
        return next
      })
    } catch {
      setTracks(prev => {
        const next = [...prev]
        next[idx] = { ...next[idx], loadState: 'error' }
        return next
      })
    }
  }, [tracks, locale])

  // Load all tracks
  const loadAll = useCallback(async () => {
    setLoadingAll(true)
    const promises = tracks.map((t, i) =>
      t.loadState === 'idle' ? loadTrack(i) : Promise.resolve()
    )
    await Promise.all(promises)
    setLoadingAll(false)
    setAllLoaded(true)
  }, [tracks, loadTrack])

  // Play track at index
  const playTrack = useCallback(async (idx: number) => {
    const track = tracks[idx]
    if (!track) return

    // Load if needed
    if (track.loadState === 'idle') {
      await loadTrack(idx)
    }

    setCurrentIdx(idx)

    // Auto scroll playlist
    setTimeout(() => {
      const row = playlistRef.current?.querySelector(`[data-idx="${idx}"]`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
  }, [tracks, loadTrack])

  // When currentIdx or signedUrl changes — update audio src
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || currentIdx === null) return
    const track = tracks[currentIdx]
    if (!track?.signedUrl) return

    audio.src = track.signedUrl
    audio.volume = muted ? 0 : volume
    audio.load()
    audio.play().catch(() => null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, tracks[currentIdx ?? -1]?.signedUrl])

  // Audio event bindings
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
      // Next track logic
      if (repeat === 'one') {
        audio.play().catch(() => null)
        return
      }
      setCurrentIdx(prev => {
        if (prev === null) return null
        if (shuffle) {
          const available = tracks.map((_, i) => i).filter(i => i !== prev)
          if (available.length === 0) return prev
          return available[Math.floor(Math.random() * available.length)]
        }
        const next = prev + 1
        if (next >= tracks.length) {
          return repeat === 'all' ? 0 : null
        }
        return next
      })
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
    }
  }, [tracks, repeat, shuffle])

  // Volume sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume
    }
  }, [volume, muted])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || currentIdx === null) return
    if (playing) audio.pause()
    else audio.play().catch(() => null)
  }

  const seek = (val: number) => {
    const audio = audioRef.current
    if (audio) { audio.currentTime = val; setCurrentTime(val) }
  }

  const prev = () => {
    if (currentIdx === null) return
    if (currentTime > 3) { seek(0); return }
    const pidx = shuffle
      ? Math.floor(Math.random() * tracks.length)
      : Math.max(0, currentIdx - 1)
    playTrack(pidx)
  }

  const next = () => {
    if (currentIdx === null) return
    const nidx = shuffle
      ? Math.floor(Math.random() * tracks.length)
      : Math.min(tracks.length - 1, currentIdx + 1)
    playTrack(nidx)
  }

  const currentTrack = currentIdx !== null ? tracks[currentIdx] : null
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const readyCount = tracks.filter(t => t.loadState === 'ready').length
  const repeatIcon = repeat === 'none' ? Repeat : repeat === 'all' ? Repeat : Repeat1

  if (tracks.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden border border-purple-200/60 shadow-lg bg-gradient-to-b from-[#1a0a2e] to-[#2d0050]">
      <audio ref={audioRef} preload="auto" />

      {/* ── HEADER / MAIN CONTROLS ── */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        {/* Title bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-purple-300 uppercase tracking-widest">
              Программа · Плеер
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-purple-500">
              {readyCount}/{tracks.length} треков
            </span>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="text-purple-400 hover:text-purple-200 transition-colors"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Now playing */}
        <div className="min-h-[36px]">
          {currentTrack ? (
            <div>
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {currentTrack.slotNumber}. {currentTrack.performerName}
              </p>
              {currentTrack.performanceTitle && (
                <p className="text-purple-300 text-xs truncate">{currentTrack.performanceTitle}</p>
              )}
              {currentTrack.loadState === 'loading' && (
                <span className="text-purple-400 text-xs flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Загрузка...
                </span>
              )}
              {currentTrack.loadState === 'error' && (
                <span className="text-red-400 text-xs">Файл не найден</span>
              )}
            </div>
          ) : (
            <p className="text-purple-500 text-xs">Выберите трек для воспроизведения</p>
          )}
        </div>

        {/* Seekbar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={e => seek(parseFloat(e.target.value))}
            disabled={!currentTrack?.signedUrl}
            className="w-full h-1.5 rounded-full cursor-pointer appearance-none"
            style={{
              background: currentTrack?.signedUrl
                ? `linear-gradient(to right, #a855f7 ${pct}%, #4c1d95 ${pct}%)`
                : '#4c1d95',
              accentColor: '#a855f7',
            }}
          />
          <div className="flex justify-between text-[10px] text-purple-500 tabular-nums">
            <span>{fmt(currentTime)}</span>
            <span>{duration > 0 ? fmt(duration) : '—'}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left: shuffle + repeat */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShuffle(s => !s)}
              className={`p-1.5 rounded-lg transition-colors ${shuffle ? 'text-purple-300 bg-purple-800' : 'text-purple-600 hover:text-purple-400'}`}
              title="Случайный порядок"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setRepeat(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')}
              className={`p-1.5 rounded-lg transition-colors ${repeat !== 'none' ? 'text-purple-300 bg-purple-800' : 'text-purple-600 hover:text-purple-400'}`}
              title={`Повтор: ${repeat}`}
            >
              {repeat === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Center: prev / play / next */}
          <div className="flex items-center gap-3">
            <button
              onClick={prev}
              disabled={currentIdx === null}
              className="p-2 text-purple-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              disabled={!currentTrack?.signedUrl}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white shadow-lg shadow-purple-900 transition-all active:scale-95"
            >
              {playing
                ? <Pause className="w-5 h-5" />
                : <Play className="w-5 h-5 ml-0.5" />
              }
            </button>
            <button
              onClick={next}
              disabled={currentIdx === null}
              className="p-2 text-purple-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Right: volume */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted(m => !m)}
              className="text-purple-500 hover:text-purple-300 transition-colors"
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
              className="w-20 h-1 cursor-pointer"
              style={{
                accentColor: '#a855f7',
                background: `linear-gradient(to right, #a855f7 ${(muted ? 0 : volume) * 100}%, #4c1d95 ${(muted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Download current + load-all */}
        <div className="flex items-center justify-between pt-1">
          {currentTrack?.signedUrl ? (
            <a
              href={currentTrack.signedUrl}
              download={currentTrack.fileName ?? 'track.mp3'}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Скачать трек
            </a>
          ) : <span />}

          {!allLoaded && (
            <button
              onClick={loadAll}
              disabled={loadingAll}
              className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-300 transition-colors"
            >
              {loadingAll
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Music className="w-3 h-3" />
              }
              {loadingAll ? 'Загрузка...' : 'Загрузить все треки'}
            </button>
          )}
        </div>
      </div>

      {/* ── PLAYLIST ── */}
      {!collapsed && (
        <div
          ref={playlistRef}
          className="border-t border-purple-900/60 max-h-64 overflow-y-auto"
        >
          {tracks.map((track, idx) => {
            const isActive = currentIdx === idx
            return (
              <div
                key={track.id}
                data-idx={idx}
                onClick={() => playTrack(idx)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-purple-800/70 text-white'
                    : 'text-purple-300 hover:bg-purple-900/40'
                }`}
              >
                {/* Track number */}
                <span className="text-[10px] text-purple-500 font-mono w-6 shrink-0 text-right">
                  {track.slotNumber}
                </span>

                {/* Status icon */}
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {isActive && playing ? (
                    <div className="flex items-end gap-0.5 h-4">
                      <span className="w-0.5 bg-purple-400 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '12px', animationDelay: '0ms' }} />
                      <span className="w-0.5 bg-purple-400 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '8px', animationDelay: '150ms' }} />
                      <span className="w-0.5 bg-purple-400 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '14px', animationDelay: '300ms' }} />
                      <span className="w-0.5 bg-purple-400 animate-[bounce_0.6s_ease-in-out_infinite]" style={{ height: '6px', animationDelay: '450ms' }} />
                    </div>
                  ) : track.loadState === 'loading' ? (
                    <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                  ) : track.loadState === 'error' ? (
                    <span className="text-red-500 text-xs">✗</span>
                  ) : track.loadState === 'ready' ? (
                    <Music className="w-3 h-3 text-purple-500" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-700" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-purple-200'}`}>
                    {track.performerName}
                  </p>
                  {track.performanceTitle && (
                    <p className="text-[10px] text-purple-500 truncate">{track.performanceTitle}</p>
                  )}
                </div>

                {/* File name if loaded */}
                {track.fileName && (
                  <span className="text-[10px] text-purple-600 truncate max-w-[100px] hidden sm:block">
                    {track.fileName}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
