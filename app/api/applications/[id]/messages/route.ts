/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'

// GET — история чата по заявке
// Доступно: администраторам (через сессию) ИЛИ участнику (по ?token=applicationId без auth)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const token = req.nextUrl.searchParams.get('token') // участник передаёт token=applicationId

    const supabase = createAdminSupabaseClient()

    // Проверяем, что заявка существует
    const { data: app } = await supabase
      .from('applications')
      .select('id, name')
      .eq('id', id)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    // Если запрос от участника — token должен совпадать с id заявки (это и есть публичный токен)
    if (!token) {
      // Проверяем auth-сессию администратора
      const serverClient = createServerSupabaseClient()
      const { data: { user } } = await serverClient.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else if (token !== id) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 403 })
    }

    const { data: messages, error } = await supabase
      .from('application_messages')
      .select('id, sender_type, sender_name, message, is_read, created_at')
      .eq('application_id', id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ messages: messages ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Ошибка сервера' }, { status: 500 })
  }
}

// POST — отправить сообщение
// sender_type: 'admin' — только авторизованные, 'participant' — по token
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { message, sender_type, token } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Проверяем заявку
    const { data: app } = await supabase
      .from('applications')
      .select('id, name, contact_name')
      .eq('id', id)
      .single()

    if (!app) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 })
    }

    let senderName = ''
    let resolvedSenderId: string | null = null

    if (sender_type === 'participant') {
      // Участник авторизуется через токен (= id заявки)
      if (!token || token !== id) {
        return NextResponse.json({ error: 'Неверный токен участника' }, { status: 403 })
      }
      senderName = (app as any).contact_name || 'Участник'
    } else if (sender_type === 'admin') {
      // Проверяем сессию администратора
      const serverClient = createServerSupabaseClient()
      const { data: { user } } = await serverClient.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      resolvedSenderId = user.id

      // Берём display_name из public.users
      const { data: dbUser } = await supabase
        .from('users')
        .select('display_name, role')
        .eq('id', user.id)
        .single()

      senderName = dbUser?.display_name || 'Администратор'
    } else {
      return NextResponse.json({ error: 'Неверный sender_type' }, { status: 400 })
    }

    const { data: newMsg, error } = await supabase
      .from('application_messages')
      .insert({
        application_id: id,
        sender_id: resolvedSenderId,
        sender_type,
        sender_name: senderName,
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ message: newMsg })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Ошибка сервера' }, { status: 500 })
  }
}

// PATCH — пометить сообщения как прочитанные
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const serverClient = createServerSupabaseClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminSupabaseClient()
    const { reader_type } = await req.json()

    // Помечаем как прочитанные сообщения противоположной стороны
    const markType = reader_type === 'admin' ? 'participant' : 'admin'
    await supabase
      .from('application_messages')
      .update({ is_read: true })
      .eq('application_id', id)
      .eq('sender_type', markType)
      .eq('is_read', false)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Ошибка сервера' }, { status: 500 })
  }
}
