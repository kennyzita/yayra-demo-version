import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

  if (!ALLOWED_MIMES.includes(file.type))
    return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, or WebP allowed.' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 413 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ext  = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
  const path = `${user.id}/profile/avatar.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadErr } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '0', upsert: true, contentType: file.type,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Store path in auth user_metadata — works for every user type (admin, staff, DSP)
  await db.auth.admin.updateUserById(user.id, {
    user_metadata: { avatar_path: path },
  })

  // Also try billing_staff_data as secondary store (best-effort, ignore failure)
  const { data: existing } = await db
    .from('billing_staff_data').select('data').eq('staff_id', user.id).maybeSingle()
  await db.from('billing_staff_data').upsert(
    { staff_id: user.id, data: { ...((existing?.data as Record<string, unknown>) ?? {}), avatar_path: path } },
    { onConflict: 'staff_id' },
  ).catch(() => {})

  const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 86400)
  return NextResponse.json({ path, signedUrl: signed?.signedUrl })
}
