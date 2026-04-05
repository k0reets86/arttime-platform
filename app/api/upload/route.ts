import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2/upload'
const uuidv4 = () => crypto.randomUUID()

// Лимиты согласно ТЗ раздел 13.6
const MAX_SIZE_VIDEO = 500 * 1024 * 1024    // 500 MB
const MAX_SIZE_DEFAULT = 50 * 1024 * 1024   // 50 MB

const ALLOWED_TYPES: Record<string, string> = {
  // Видео
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/x-msvideo': 'video',
  'video/webm': 'video',
  // Фото
  'image/jpeg': 'photo',
  'image/jpg': 'photo',
  'image/png': 'photo',
  'image/gif': 'photo',
  'image/webp': 'photo',
  'image/heic': 'photo',
  'image/heif': 'photo',
  'image/bmp': 'photo',
  'image/tiff': 'photo',
  // Музыка
  'audio/mpeg': 'music',
  'audio/mp3': 'music',
  'audio/wav': 'music',
  'audio/x-wav': 'music',
  'audio/aac': 'music',
  'audio/ogg': 'music',
  'audio/flac': 'music',
  'audio/mp4': 'music',
  'audio/m4a': 'music',
  'audio/x-m4a': 'music',
  // Документы
  'application/pdf': 'doc',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'doc',
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient()
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const applicationId = formData.get('applicationId') as string | null
    const fileType = formData.get('type') as string | null // 'photo' | 'music' | 'doc' | 'video'

    if (!file || !applicationId) {
      return NextResponse.json({ error: 'file и applicationId обязательны' }, { status: 400 })
    }

    // Проверяем тип файла
    const detectedType = ALLOWED_TYPES[file.type]
    if (!detectedType) {
      return NextResponse.json({
        error: `Недопустимый тип файла: ${file.type}. Разрешены: mp4, mov, jpg, png, gif, webp, heic, mp3, wav, aac, flac, ogg, pdf, doc, docx`
      }, { status: 400 })
    }

    const resolvedType = fileType || detectedType

    // Проверяем размер
    const maxSize = detectedType === 'video' ? MAX_SIZE_VIDEO : MAX_SIZE_DEFAULT
    if (file.size > maxSize) {
      const maxMB = maxSize / 1024 / 1024
      return NextResponse.json({
        error: `Файл слишком большой. Максимум ${maxMB} MB для ${detectedType}`
      }, { status: 400 })
    }

    // Проверяем что заявка существует (без аутентификации — участник не залогинен)
    const { data: application } = await supabase
      .from('applications')
      .select('id, festival_id')
      .eq('id', applicationId)
      .single()

    if (!application) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    // Загружаем в R2
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split('.').pop() || 'bin'
    const key = `applications/${applicationId}/${resolvedType}/${uuidv4()}.${ext}`

    let storagePath: string
    let storageBackend: 'r2' | 'supabase'

    // Для небольших файлов-документов — Supabase Storage (если R2 не настроен)
    const useR2 = !!(process.env.CLOUDFLARE_R2_BUCKET_NAME && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID)

    if (useR2) {
      storagePath = await uploadToR2(buffer, key, file.type)
      storageBackend = 'r2'
    } else {
      // Fallback: Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('application-files')
        .upload(key, buffer, { contentType: file.type, upsert: false })
      if (storageError) {
        return NextResponse.json({ error: storageError.message }, { status: 500 })
      }
      storagePath = storageData.path
      storageBackend = 'supabase'
    }

    // Записываем в APPLICATION_FILES
    const { data: fileRecord, error: dbError } = await supabase
      .from('application_files')
      .insert({
        application_id: applicationId,
        type: resolvedType,
        storage_backend: storageBackend,
        storage_path: storagePath,
        original_name: file.name,
        size_bytes: file.size,
      })
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        type: resolvedType,
        original_name: file.name,
        size_bytes: file.size,
        url: storagePath,
      }
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

// DELETE — удалить файл
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    const applicationId = searchParams.get('applicationId')

    if (!fileId || !applicationId) {
      return NextResponse.json({ error: 'fileId и applicationId обязательны' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('application_files')
      .delete()
      .eq('id', fileId)
      .eq('application_id', applicationId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 })
  }
}
