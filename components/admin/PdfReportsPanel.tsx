'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Award, Star, Calendar, Download } from 'lucide-react'

interface Props {
  locale: string
  festivalId: string
  nominations: Array<{ id: string; name_i18n: any }>
}

const getI18n = (f: any) => f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

// ─── PDF generator helpers (client-side, no jspdf required) ──────────────

function openPrintWindow(html: string, title: string) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Be Vietnam Pro', Arial, sans-serif; font-size: 12px; color: #1a1a2e; }
    @media print {
      @page { margin: 15mm; size: A4; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
    .toolbar { padding: 12px 20px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;
      display: flex; gap: 10px; align-items: center; }
    .toolbar button { padding: 8px 20px; background: #5d3fd3; color: white; border: none;
      border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; }
    .toolbar button:hover { background: #4a32b3; }
    .doc-page { padding: 30px; }
    h1 { font-size: 22px; color: #5d3fd3; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #333; margin: 20px 0 8px; border-bottom: 2px solid #5d3fd3; padding-bottom: 4px; }
    h3 { font-size: 13px; color: #444; margin: 12px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { background: #5d3fd3; color: white; padding: 8px 10px; text-align: left; font-size: 11px; }
    td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
    tr:nth-child(even) td { background: #f9f8ff; }
    .diploma { border: 3px solid #5d3fd3; border-radius: 12px; padding: 40px; text-align: center;
      margin: 20px auto; max-width: 600px; }
    .diploma-title { font-size: 32px; letter-spacing: 8px; color: #5d3fd3; font-weight: 700; }
    .diploma-sub { font-size: 14px; color: #888; margin-top: 4px; }
    .diploma-name { font-size: 22px; font-weight: 700; color: #1a1a2e; margin: 20px 0 8px; }
    .diploma-text { font-size: 13px; color: #444; line-height: 1.7; margin: 12px 0; }
    .diploma-score { font-size: 28px; font-weight: 700; color: #5d3fd3; }
    .diploma-sigs { display: flex; justify-content: space-around; margin-top: 40px; font-size: 11px; color: #666; }
    .diploma-sig-line { width: 160px; border-top: 1px solid #999; padding-top: 6px; }
    .meta { font-size: 11px; color: #888; margin-bottom: 20px; }
    .program-slot { border-left: 3px solid #5d3fd3; padding: 8px 12px; margin: 6px 0; background: #f9f8ff; border-radius: 0 8px 8px 0; }
    .time { font-weight: 700; color: #5d3fd3; font-size: 13px; }
    .participant { font-weight: 600; }
    .category { color: #888; font-size: 11px; }
    .gold { color: #FFD700; } .silver { color: #C0C0C0; } .bronze { color: #CD7F32; }
  </style>
</head>
<body>
<div class="toolbar no-print">
  <button onclick="window.print()">🖨️ Печать / Сохранить PDF</button>
  <span style="color:#666;font-size:12px">Используйте «Сохранить как PDF» в диалоге печати браузера</span>
</div>
${html}
</body>
</html>`)
  w.document.close()
}

// ─── Generators ───────────────────────────────────────────────────────────

async function generateDiplomas(setLoading: (b: boolean) => void, setError: (s: string) => void) {
  setLoading(true); setError('')
  try {
    const res = await fetch('/api/admin/pdf-data?type=diplomas')
    if (!res.ok) throw new Error('Ошибка загрузки данных')
    const { festival, template, aggregates } = await res.json()

    const defaultTemplate = {
      title: 'ДИПЛОМ',
      subtitle: festival?.name ?? 'ArtTime',
      body_text: 'Настоящим подтверждается, что {name} принял(а) участие в номинации «{nomination}» и набрал(а) {score} баллов.',
      director_name: '',
      jury_chair_name: '',
      primary_color: '#5d3fd3',
      secondary_color: '#ffd709',
    }
    const t = template ?? defaultTemplate

    const diplomas = (aggregates as any[]).map((agg: any, i: number) => {
      const name = agg.applications?.name ?? '—'
      const nomination = getI18n(agg.nominations?.name_i18n)
      const score = typeof agg.final_score === 'number' ? agg.final_score.toFixed(1) : '—'
      const bodyText = (t.body_text || defaultTemplate.body_text)
        .replace(/{name}/g, name)
        .replace(/{nomination}/g, nomination)
        .replace(/{score}/g, score)

      const diplomaClass = agg.diploma_type === 'gold' ? 'gold' : agg.diploma_type === 'silver' ? 'silver' : agg.diploma_type === 'bronze' ? 'bronze' : ''

      return `
        <div class="diploma page-break">
          <div class="diploma-title" style="color:${t.primary_color}">${t.title}</div>
          <div class="diploma-sub">${t.subtitle}</div>
          <div class="diploma-name">${name}</div>
          <div class="diploma-text">${bodyText}</div>
          <div class="diploma-score ${diplomaClass}" style="color:${t.primary_color}">${score}</div>
          <div style="font-size:11px;color:#888;margin-top:8px">${nomination} · Место: #${agg.rank ?? '—'}</div>
          ${(t.director_name || t.jury_chair_name) ? `
          <div class="diploma-sigs">
            ${t.director_name ? `<div><div class="diploma-sig-line">${t.director_name}</div><div>Директор</div></div>` : ''}
            ${t.jury_chair_name ? `<div><div class="diploma-sig-line">${t.jury_chair_name}</div><div>Председатель жюри</div></div>` : ''}
          </div>` : ''}
        </div>`
    }).join('')

    const html = `<div class="doc-page">
      <h1>Дипломы участников</h1>
      <p class="meta">${festival?.name ?? ''} ${festival?.year ?? ''} · Всего дипломов: ${aggregates.length}</p>
      ${aggregates.length === 0 ? '<p style="color:#888">Нет опубликованных результатов для генерации дипломов</p>' : diplomas}
    </div>`

    openPrintWindow(html, `Дипломы — ${festival?.name ?? 'ArtTime'}`)
  } catch (e: any) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}

async function generateProtocol(
  nominationId: string | null,
  nominations: Array<{ id: string; name_i18n: any }>,
  setLoading: (b: boolean) => void,
  setError: (s: string) => void
) {
  setLoading(true); setError('')
  try {
    const url = nominationId
      ? `/api/admin/pdf-data?type=protocol&nomination_id=${nominationId}`
      : '/api/admin/pdf-data?type=protocol'
    const res = await fetch(url)
    if (!res.ok) throw new Error('Ошибка загрузки данных')
    const { festival, scores } = await res.json()

    // Group by nomination, then by application
    const byNomination: Record<string, any[]> = {}
    for (const s of scores as any[]) {
      const nomName = getI18n(s.nominations?.name_i18n)
      if (!byNomination[nomName]) byNomination[nomName] = []
      byNomination[nomName].push(s)
    }

    const sections = Object.entries(byNomination).map(([nomName, nomScores]) => {
      // Group by application
      const byApp: Record<string, any[]> = {}
      for (const s of nomScores) {
        const appName = s.applications?.name ?? '—'
        if (!byApp[appName]) byApp[appName] = []
        byApp[appName].push(s)
      }

      const rows = Object.entries(byApp).map(([appName, appScores]) => {
        const criteria = appScores.map((s: any) =>
          `<span style="font-size:10px">${getI18n(s.criteria?.name_i18n)}: <b>${s.score}</b></span>`
        ).join(' | ')
        const avgScore = appScores.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / (appScores.length || 1)
        const judge = appScores[0]?.judge_assignments?.users?.display_name ||
          appScores[0]?.judge_assignments?.users?.email || '—'
        return `<tr>
          <td>${appName}</td>
          <td>${criteria}</td>
          <td style="font-weight:700;color:#5d3fd3">${avgScore.toFixed(2)}</td>
        </tr>`
      }).join('')

      return `<h2>${nomName}</h2>
        <table>
          <thead><tr><th>Участник</th><th>Оценки по критериям</th><th>Средний балл</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }).join('')

    const html = `<div class="doc-page">
      <h1>Протокол судейства</h1>
      <p class="meta">${festival?.name ?? ''} ${festival?.year ?? ''} · Всего оценок: ${scores.length} · Сформирован: ${new Date().toLocaleString('ru')}</p>
      ${scores.length === 0 ? '<p style="color:#888">Оценки пока не внесены</p>' : sections}
    </div>`

    openPrintWindow(html, `Протокол судейства — ${festival?.name ?? 'ArtTime'}`)
  } catch (e: any) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}

async function generateProgram(setLoading: (b: boolean) => void, setError: (s: string) => void) {
  setLoading(true); setError('')
  try {
    const res = await fetch('/api/admin/pdf-data?type=program')
    if (!res.ok) throw new Error('Ошибка загрузки данных')
    const { festival, program } = await res.json()

    // Group by day
    const byDay: Record<string, any[]> = {}
    for (const slot of program as any[]) {
      const day = slot.day_label || 'День 1'
      if (!byDay[day]) byDay[day] = []
      byDay[day].push(slot)
    }

    const days = Object.entries(byDay).map(([day, slots]) => {
      const slotsHtml = slots.map((slot: any) => {
        const app = slot.applications
        const timeStr = slot.start_time
          ? `${slot.start_time}${slot.end_time ? ` – ${slot.end_time}` : ''}`
          : '—'
        return `<div class="program-slot">
          <div class="time">${timeStr}</div>
          <div class="participant">${app ? `#${app.performance_number ?? '?'} ${app.name}` : '—'}</div>
          <div class="category">${app ? getI18n(app.nominations?.name_i18n) : ''} ${slot.stage_label ? `· Сцена: ${slot.stage_label}` : ''}</div>
          ${slot.tech_comment ? `<div style="font-size:10px;color:#888;margin-top:2px">Тех. заметка: ${slot.tech_comment}</div>` : ''}
        </div>`
      }).join('')
      return `<h2>${day}</h2>${slotsHtml}`
    }).join('')

    const html = `<div class="doc-page">
      <h1>Программа фестиваля</h1>
      <p class="meta">${festival?.name ?? ''} ${festival?.year ?? ''} · ${festival?.city ?? ''} · Всего выступлений: ${program.length}</p>
      ${program.length === 0 ? '<p style="color:#888">Программа ещё не составлена</p>' : days}
    </div>`

    openPrintWindow(html, `Программа — ${festival?.name ?? 'ArtTime'}`)
  } catch (e: any) {
    setError(e.message)
  } finally {
    setLoading(false)
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export default function PdfReportsPanel({ locale, festivalId, nominations }: Props) {
  const [loadingDiplomas, setLoadingDiplomas] = useState(false)
  const [loadingProtocol, setLoadingProtocol] = useState(false)
  const [loadingProgram, setLoadingProgram] = useState(false)
  const [selectedNomination, setSelectedNomination] = useState<string>('')
  const [error, setError] = useState('')

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-radiant border border-outline-variant/10">
      <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
        <FileText className="w-5 h-5 text-on-surface-variant" />
        <h2 className="font-headline font-semibold text-on-surface">PDF документы</h2>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Документы открываются в новом окне. Используйте <strong>Файл → Печать → «Сохранить как PDF»</strong> в браузере.
        </p>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Дипломы */}
          <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-on-surface text-sm">Дипломы участников</p>
                <p className="text-xs text-on-surface-variant">Все опубликованные результаты</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={loadingDiplomas}
              onClick={() => generateDiplomas(setLoadingDiplomas, setError)}
            >
              {loadingDiplomas ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Открыть PDF
            </Button>
          </div>

          {/* Протокол */}
          <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-on-surface text-sm">Протокол судейства</p>
                <p className="text-xs text-on-surface-variant">Оценки по номинации</p>
              </div>
            </div>
            {nominations.length > 0 && (
              <select
                value={selectedNomination}
                onChange={e => setSelectedNomination(e.target.value)}
                className="w-full text-xs border border-outline-variant rounded-lg px-2 py-1.5 bg-surface-container-lowest text-on-surface"
              >
                <option value="">Все номинации</option>
                {nominations.map(n => (
                  <option key={n.id} value={n.id}>{getI18n(n.name_i18n)}</option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={loadingProtocol}
              onClick={() => generateProtocol(selectedNomination || null, nominations, setLoadingProtocol, setError)}
            >
              {loadingProtocol ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Открыть PDF
            </Button>
          </div>

          {/* Программа */}
          <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-on-surface text-sm">Программа фестиваля</p>
                <p className="text-xs text-on-surface-variant">Порядок выступлений</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={loadingProgram}
              onClick={() => generateProgram(setLoadingProgram, setError)}
            >
              {loadingProgram ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
              Открыть PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
