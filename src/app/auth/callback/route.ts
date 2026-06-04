import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? '/'
  // F6: Prevent open redirect — only allow relative paths that start with /
  // and do not start with // (protocol-relative URLs like //evil.com)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    } catch (err) {
      console.error('[auth/callback] unexpected error:', err)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
