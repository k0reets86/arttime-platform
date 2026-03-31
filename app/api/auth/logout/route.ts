import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  await supabase.auth.signOut()

  // Redirect to login
  const locale = req.headers.get('referer')?.match(/\/(ru|en|de|uk)\//)?.[1] ?? 'ru'
  return NextResponse.redirect(new URL(`/${locale}/login`, req.url))
}
