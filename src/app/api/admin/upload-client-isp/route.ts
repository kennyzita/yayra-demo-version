import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const role = (profile?.role as unknown as { name: string } | null)?.name
  if (role !== 'Admin' && role !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form     = await req.formData()
  const file     = form.get('file')     as File   | null
  const clientId = form.get('clientId') as string | null
  if (!file || !clientId) return NextResponse.json({ error: 'Missing file or clientId' }, { status: 400 })

  if (!ALLOWED_MIMES.includes(file.type))
    return NextResponse.json({ error: 'Invalid file type. Allowed: PDF, Word, images.' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'File too large. Maximum 20 MB.' }, { status: 413 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path     = `clients/${clientId}/isp/${Date.now()}_${safeName}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: uploadErr } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600', upsert: true, contentType: file.type,
  })
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  // Persist path in billing_client_data JSONB
  const { data: existing } = await db
    .from('billing_client_data').select('data').eq('client_id', clientId).maybeSingle()
  const { error: upsertErr } = await db.from('billing_client_data').upsert(
    { client_id: clientId, data: { ...((existing?.data as Record<string, unknown>) ?? {}), isp_doc_path: path } },
    { onConflict: 'client_id' },
  )
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  return NextResponse.json({ path })
}
