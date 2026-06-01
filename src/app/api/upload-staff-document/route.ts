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

// F16: allowlist matching the SUBFOLDERS in list-staff-documents — prevents path traversal
const ALLOWED_DOC_TYPES = [
  'W4', 'NJ W4', 'Form I-9', 'Direct Deposit Form', 'CRO Consent',
  "Driver's License / Identification - Front", "Driver's License / Identification - Back",
  "Driver's License", 'EAD / Green card', 'CPR Certificate',
  "Danielle's Law Sign-off", "Stephen Komnino's Law", 'Appendix A',
  'CARI Clearance', 'Background Check', 'IdentoGO',
  'Reference Letter', 'Other', 'application',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file    = form.get('file')    as File   | null
  const docType = form.get('docType') as string | null
  if (!file || !docType) return NextResponse.json({ error: 'Missing file or docType' }, { status: 400 })

  // F14/F22: MIME type and file size validation
  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF, images, and Word documents are allowed.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 10 MB.' }, { status: 413 })
  }

  // F16: Path traversal prevention — validate docType against allowlist
  if (!ALLOWED_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: 'Invalid document type.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const path = `${user.id}/${docType}/${safeName}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ path })
}
