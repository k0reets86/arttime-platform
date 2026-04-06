import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireRoleApi } from '@/lib/auth/requireRole'

export async function POST(req: NextRequest) {
  try {
    const { festivalId } = await requireRoleApi(['admin'])

    const { email, display_name, festival_id } = await req.json()
    if (!email || !display_name) {
      return NextResponse.json({ error: 'email и display_name обязательны' }, { status: 400 })
    }
    if (festival_id && festival_id !== festivalId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminSupabaseClient()

    // Use inviteUserByEmail — Supabase sends invitation email automatically
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'
    const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { display_name, role: 'judge' },
      redirectTo: `${baseUrl}/ru/judge`,
    })

    if (authError) {
      // If user already exists, update their profile and return success
      if (authError.message.includes('already been registered') || authError.message.includes('already exists') || authError.code === 'email_exists') {
        const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (existingUser) {
          await adminClient.auth.admin.updateUserById(existingUser.id, {
            user_metadata: { display_name, role: 'judge' },
          })
          await adminClient.from('users').upsert({
            id: existingUser.id, email, display_name,
            role: 'judge', festival_id: festivalId, active: true,
          }, { onConflict: 'id' })
          return NextResponse.json({
            success: true,
            message: `Судья ${display_name} уже зарегистрирован. Профиль обновлён — они могут войти через ${email}.`
          })
        }
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Create/update profile row
    if (authData.user) {
      await adminClient.from('users').upsert({
        id: authData.user.id, email, display_name,
        role: 'judge', festival_id: festivalId, active: true,
      }, { onConflict: 'id' })
    }

    return NextResponse.json({
      success: true,
      message: `Приглашение отправлено на ${email}. Судья получит письмо со ссылкой для установки пароля и входа.`
    })
  } catch (err: any) {
    if (err.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err.message === 'Forbidden')    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
