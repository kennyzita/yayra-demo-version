import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Primary: read from auth user_metadata (set by update-avatar, works for all user types)
  let avatarPath: string | null = (user.user_metadata?.avatar_path as string) || null

  // Fallback: read from billing_staff_data JSONB
  if (!avatarPath) {
    const { data: bsd } = await db
      .from('billing_staff_data').select('data').eq('staff_id', user.id).maybeSingle()
    avatarPath = ((bsd?.data as Record<string, unknown> | null)?.avatar_path as string) || null
  }

  if (!avatarPath) return NextResponse.json({ error: 'No avatar' }, { status: 404 })

  const { data: signed, error } = await db.storage
    .from('staff-documents').createSignedUrl(avatarPath, 86400)

  if (error || !signed?.signedUrl)
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })

  return NextResponse.json({ signedUrl: signed.signedUrl })
}
