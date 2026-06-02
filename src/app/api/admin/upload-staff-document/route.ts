import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'

const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const ALLOWED_DOC_TYPES = [
  'W4', 'NJ W4', 'Form I-9', 'Direct Deposit Form', 'CRO Consent',
  "Driver's License / Identification - Front", "Driver's License / Identification - Back",
  "Driver's License - Front", "Driver's License - Back", "Driver's License",
  'EAD / Green card - Front', 'EAD / Green card - Back', 'EAD / Green card',
  'SSN Card', 'CPR Certificate', "Danielle's Law Sign-off",
  "Stephen Komnino's Law", 'Appendix A', 'CARI Clearance',
  'Background Check', 'IdentoGO', 'Reference Letter',
  'Onboarding Forms', 'MRO', 'CRO', 'CARI', 'FARA', 'Everify', 'CDS',
  'Other', 'application',
]

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only Admin or HR can upload on behalf of another staff member
  const { data: callerProfile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const callerRole = (callerProfile?.role as unknown as { name: string } | null)?.name
  if (callerRole !== 'Admin' && callerRole !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const form = await req.formData()
  const file       = form.get('file')       as File   | null
  const docType    = form.get('docType')    as string | null
  const staffId    = form.get('staffId')    as string | null
  const expiryDate = (form.get('expiryDate') as string | null)?.trim() || null

  if (!file || !docType || !staffId) {
    return NextResponse.json({ error: 'Missing file, docType, or staffId' }, { status: 400 })
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Only PDF, images, Word, and Excel documents are allowed.' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 20 MB.' }, { status: 413 })
  }
  if (!ALLOWED_DOC_TYPES.includes(docType)) {
    return NextResponse.json({ error: 'Invalid document type.' }, { status: 400 })
  }

  // Basic UUID validation to prevent path traversal
  if (!/^[0-9a-f-]{36}$/.test(staffId)) {
    return NextResponse.json({ error: 'Invalid staffId.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const path = `${staffId}/${docType}/${safeName}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If a manual expiry date was provided, persist it in billing_staff_data
  if (expiryDate) {
    const { data: existing } = await db
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', staffId)
      .maybeSingle()
    const existingData = ((existing?.data ?? {}) as Record<string, unknown>)
    const prevExpiries = (existingData.docExpiries ?? {}) as Record<string, string>
    await db.from('billing_staff_data').upsert({
      staff_id: staffId,
      data: { ...existingData, docExpiries: { ...prevExpiries, [docType]: expiryDate } },
    })
  }

  return NextResponse.json({ path })
}
