import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { EXPIRY_DOC_TYPES, extractExpiryFromBuffer } from '@/lib/expiry-ocr'
import { CERT_CANONICAL } from '@/lib/doc-type-utils'
import Anthropic from '@anthropic-ai/sdk'

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
  'Documentation Used', 'Other', 'application',
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

  // Auto-extract expiry via OCR if doc type can have one and no manual date given
  let autoExtractedExpiry: string | null = null
  const isExpiryDoc = (EXPIRY_DOC_TYPES as readonly string[]).includes(docType)
  if (isExpiryDoc && !expiryDate && process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      autoExtractedExpiry = await extractExpiryFromBuffer(buffer, file.type, anthropic)
    } catch { /* OCR optional — upload still succeeds */ }
  }

  const finalExpiry = expiryDate ?? autoExtractedExpiry
  if (finalExpiry) {
    const canonicalCertType = CERT_CANONICAL[docType] ?? docType
    const now = new Date().toISOString()
    await db.from('staff_cert_expiries')
      .update({ valid_to: now, is_current: false })
      .eq('staff_id', staffId)
      .eq('cert_type', canonicalCertType)
      .eq('is_current', true)
    await db.from('staff_cert_expiries').insert({
      staff_id: staffId,
      cert_type: canonicalCertType,
      expiry_date: finalExpiry,
      scanned_by: user.id,
      valid_from: now,
      is_current: true,
    })
  }

  return NextResponse.json({ path, extractedExpiry: autoExtractedExpiry })
}
