import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Generates a minimal HTML diploma as PDF via browser print (or server-side if puppeteer available)
// For production: use Supabase Edge Function with puppeteer/chromium

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()

    const { data: aggregate } = await supabase
      .from('aggregates')
      .select(`
        id, rank, mean, diploma_type, qr_verification_token, published_globally_at,
        applications(
          id, name, performance_number, performance_title, applicant_type, country, city,
          nominations(id, name_i18n, categories(name_i18n)),
          festivals(name, year)
        )
      `)
      .eq('id', params.id)
      .eq('visible_to_participant', true)
      .single()

    if (!aggregate) {
      return new NextResponse('Диплом не найден', { status: 404 })
    }

    const app = aggregate.applications as any
    const festival = app?.festivals
    const nomination = app?.nominations
    const category = nomination?.categories

    const getI18n = (f: Record<string, string> | null) =>
      f?.ru || f?.en || Object.values(f ?? {})[0] || '—'

    const DIPLOMA_LABELS: Record<string, string> = {
      laureate_1: 'ЛАУРЕАТ I СТЕПЕНИ',
      laureate_2: 'ЛАУРЕАТ II СТЕПЕНИ',
      laureate_3: 'ЛАУРЕАТ III СТЕПЕНИ',
      diploma_1: 'ДИПЛОМ I СТЕПЕНИ',
      diploma_2: 'ДИПЛОМ II СТЕПЕНИ',
      diploma_3: 'ДИПЛОМ III СТЕПЕНИ',
      special: 'СПЕЦИАЛЬНЫЙ ПРИЗ',
      participant: 'УЧАСТНИК',
    }

    const diplomaTitle = aggregate.diploma_type
      ? DIPLOMA_LABELS[aggregate.diploma_type] ?? aggregate.diploma_type.toUpperCase()
      : `МЕСТО ${aggregate.rank}`

    const verifyUrl = aggregate.qr_verification_token
      ? `${req.nextUrl.origin}/ru/verify/${aggregate.qr_verification_token}`
      : null

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Диплом — ${app?.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@400;700;900&family=Be+Vietnam+Pro:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Be Vietnam Pro', sans-serif; background: white; }
  .page {
    width: 297mm; height: 210mm; padding: 15mm;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #f5f0ff 0%, #fff9e6 100%);
    position: relative; overflow: hidden;
  }
  .border-deco {
    position: absolute; inset: 8mm;
    border: 2px solid rgba(93,63,211,0.2);
    border-radius: 8mm;
    pointer-events: none;
  }
  .festival-name {
    font-family: 'Epilogue', sans-serif;
    font-size: 14pt; color: #5d3fd3; font-weight: 700;
    text-transform: uppercase; letter-spacing: 3px;
    margin-bottom: 6mm;
  }
  .diploma-title {
    font-family: 'Epilogue', sans-serif;
    font-size: 28pt; font-weight: 900; color: #2d1a6b;
    text-transform: uppercase; letter-spacing: 2px;
    margin-bottom: 4mm; text-align: center;
  }
  .subtitle { font-size: 10pt; color: #666; margin-bottom: 10mm; }
  .name {
    font-family: 'Epilogue', sans-serif;
    font-size: 22pt; font-weight: 700; color: #1a0a4f;
    margin-bottom: 4mm; text-align: center;
  }
  .performance { font-size: 11pt; color: #444; font-style: italic; margin-bottom: 6mm; text-align: center; }
  .nomination {
    font-size: 10pt; color: #5d3fd3; font-weight: 600;
    border: 1.5px solid #5d3fd3; border-radius: 20px;
    padding: 2mm 6mm; margin-bottom: 8mm;
  }
  .rank-badge {
    width: 18mm; height: 18mm; border-radius: 50%;
    background: linear-gradient(135deg, #5d3fd3, #ffd709);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Epilogue', sans-serif; font-size: 20pt; font-weight: 900; color: white;
    margin-bottom: 6mm;
  }
  .footer {
    position: absolute; bottom: 12mm; left: 15mm; right: 15mm;
    display: flex; justify-content: space-between; align-items: flex-end;
  }
  .qr-placeholder { font-size: 7pt; color: #999; text-align: center; }
  .date { font-size: 8pt; color: #999; }
  .stars { position: absolute; opacity: 0.05; font-size: 40pt; }
</style>
</head>
<body>
<div class="page">
  <div class="border-deco"></div>
  <div class="stars" style="top:10mm;left:10mm">★</div>
  <div class="stars" style="top:10mm;right:10mm">★</div>
  <div class="stars" style="bottom:10mm;left:10mm">★</div>
  <div class="stars" style="bottom:10mm;right:10mm">★</div>

  <div class="festival-name">${festival?.name ?? 'ArtTime World Talent Festival'} ${festival?.year ?? ''}</div>
  <div class="diploma-title">${diplomaTitle}</div>
  <div class="subtitle">настоящим удостоверяет, что</div>
  <div class="name">${app?.name ?? '—'}</div>
  ${app?.performance_title ? `<div class="performance">«${app.performance_title}»</div>` : ''}
  <div class="nomination">${getI18n(category?.name_i18n ?? null)} · ${getI18n(nomination?.name_i18n ?? null)}</div>
  ${aggregate.rank ? `<div class="rank-badge">${aggregate.rank}</div>` : ''}

  <div class="footer">
    <div>
      ${verifyUrl ? `<div class="qr-placeholder">🔲 QR<br/>${verifyUrl}</div>` : ''}
    </div>
    <div class="date">
      ${aggregate.published_globally_at
        ? new Date(aggregate.published_globally_at).toLocaleDateString('ru', { year: 'numeric', month: 'long', day: 'numeric' })
        : ''}
    </div>
  </div>
</div>
<script>
  window.onload = () => { window.print() }
</script>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="diploma-${params.id}.html"`,
      },
    })
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 })
  }
}
