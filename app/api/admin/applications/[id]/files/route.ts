import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// GET /api/admin/applications/[id]/files — получить список файлов со signed URLs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url)
  const locale = url.searchParams.get('locale') || 'ru'
  const { festivalId } = await requireRole(['admin', 'super_admin', 'organizer', 'stage_admin', 'music_manager'], locale)

  const supabase = createAdminSupabaseClient()

  // Проверяем что заявка принадлежит фестивалю
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', params.id)
    .eq('festival_id', festivalId!)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Загружаем файлы
  const { data: files, error } = await supabase
    .from('application_files')
    .select('*')
    .eq('application_id', params.id)
    .order('uploaded_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Генерируем signed URLs для Supabase Storage файлов
  const filesWithUrls = await Promise.all((files ?? []).map(async (file) => {
    let signedUrl: string | null = null

    if (file.storage_backend === 'supabase' && file.storage_path) {
      const { data } = await supabase.storage
        .from('application-files')
        .createSignedUrl(file.storage_path, 3600) // 1 час
      signedUrl = data?.signedUrl ?? null
    } else if (file.storage_backend === 'r2') {
      // R2 public URL или signed URL
      signedUrl = file.storage_path
    }

    return { ...file, signedUrl }
  }))

  return NextResponse.json({ files: filesWithUrls })
}
