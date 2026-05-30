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

// F15: allowlist of valid docKey values — prevents path traversal
const ALLOWED_DOC_KEYS = [
  'photo_id', 'ssn', 'resume', 'ead', 'i9', 'w4', 'nj_w4',
  'direct_deposit', 'cro_consent', 'drivers_license', 'cpr_cert',
  'danielles_law', 'stephen_komninos', 'appendix_a', 'cari',
  'background_check', 'identogo', 'reference_letter', 'other',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file   = form.get('file')   as File   | null
  const docKey = form.get('docKey') as string | null
  if (!file || !docKey) return NextResponse.json({ error: 'Missing file or docKey' }, { status: 400 })

  // F14/F22: MIME type and file size validation
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF, images, and Word documents are allowed.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
  }

  // F15: Path traversal prevention — validate docKey against allowlist
  if (!ALLOWED_DOC_KEYS.includes(docKey)) {
    return NextResponse.json({ error: 'Invalid document type.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ext  = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
  const path = `${user.id}/application/${docKey}_${Date.now()}.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type,
  })

  if (error) {
    console.error('upload-document error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path })
}
