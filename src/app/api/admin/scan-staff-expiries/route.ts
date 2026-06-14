import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { EXPIRY_DOC_TYPES, extractExpiryFromBuffer, mimeFromName, docTypeFromAppFilename } from '@/lib/expiry-ocr'

const BUCKET = 'staff-documents'

function makeAdminDb() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function checkAdminOrHR(): Promise<boolean> {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const role = (profile?.role as { name: string } | null)?.name
  return role === 'Admin' || role === 'HR'
}

// GET /api/admin/scan-staff-expiries?staffId=UUID
// Returns the current saved expiry dates for a staff member
export async function GET(req: NextRequest) {
  if (!await checkAdminOrHR()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const staffId = req.nextUrl.searchParams.get('staffId') ?? ''
  if (!/^[0-9a-f-]{36}$/.test(staffId)) {
    return NextResponse.json({ error: 'Missing or invalid staffId' }, { status: 400 })
  }

  const db = makeAdminDb()
  if (!db) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data } = await db.from('billing_staff_data').select('data').eq('staff_id', staffId).maybeSingle()
  const expiries = ((data?.data as Record<string, unknown> | null)?.docExpiries ?? {}) as Record<string, string>
  return NextResponse.json({ expiries })
}

// POST /api/admin/scan-staff-expiries
// Body: { staffId: string }
// Scans all expiry-capable documents using Claude OCR and saves extracted dates
export async function POST(req: NextRequest) {
  if (!await checkAdminOrHR()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API not configured' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const staffId = (body.staffId ?? '') as string
  if (!/^[0-9a-f-]{36}$/.test(staffId)) {
    return NextResponse.json({ error: 'Missing or invalid staffId' }, { status: 400 })
  }

  const db = makeAdminDb()
  if (!db) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // Build a map of docType → storage path to scan.
  // Priority: specific doc-type folder first, then application folder (onboarding uploads).
  const toScan = new Map<string, string>() // docType → storage path
  const errors: Record<string, string> = {}

  // 1. Check specific {staffId}/{docType}/ folders
  await Promise.all(
    EXPIRY_DOC_TYPES.map(async docType => {
      try {
        const { data: files } = await db.storage.from(BUCKET).list(`${staffId}/${docType}`, {
          limit: 10,
          sortBy: { column: 'created_at', order: 'desc' },
        })
        const latest = (files ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')[0]
        if (latest && mimeFromName(latest.name)) {
          toScan.set(docType, `${staffId}/${docType}/${latest.name}`)
        }
      } catch { /* folder may not exist */ }
    })
  )

  // 2. Also check the application/ folder (used by staff self-upload during onboarding)
  try {
    const { data: appFiles } = await db.storage.from(BUCKET).list(`${staffId}/application`, {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' },
    })
    for (const f of (appFiles ?? []).filter(f => f.name !== '.emptyFolderPlaceholder')) {
      const docType = docTypeFromAppFilename(f.name)
      if (!docType || toScan.has(docType)) continue  // already have from specific folder
      if (!mimeFromName(f.name)) continue             // unsupported format (Word, Excel, etc.)
      toScan.set(docType, `${staffId}/application/${f.name}`)
    }
  } catch { /* application folder may not exist */ }

  const found = toScan.size
  const newExpiries: Record<string, string> = {}
  let extracted = 0

  // 3. Run OCR on each found file
  await Promise.all(
    [...toScan.entries()].map(async ([docType, filePath]) => {
      try {
        const fileName = filePath.split('/').pop()!
        const mimeType = mimeFromName(fileName)!
        const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(filePath)
        if (dlErr || !blob) { errors[docType] = dlErr?.message ?? 'Download failed'; return }

        const buf = Buffer.from(await blob.arrayBuffer())
        const date = await extractExpiryFromBuffer(buf, mimeType, anthropic)
        if (date) { newExpiries[docType] = date; extracted++ }
      } catch (err) {
        errors[docType] = String(err)
      }
    })
  )

  // Merge with existing saved expiries (new scan results win for extracted dates)
  if (Object.keys(newExpiries).length > 0) {
    const { data: existing } = await db
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', staffId)
      .maybeSingle()
    const existingData = (existing?.data ?? {}) as Record<string, unknown>
    const prevExpiries = (existingData.docExpiries ?? {}) as Record<string, string>
    await db.from('billing_staff_data').upsert({
      staff_id: staffId,
      data: { ...existingData, docExpiries: { ...prevExpiries, ...newExpiries } },
    })
  }

  // Return the full current expiry map
  const { data: updated } = await db
    .from('billing_staff_data').select('data').eq('staff_id', staffId).maybeSingle()
  const expiries = ((updated?.data as Record<string, unknown> | null)?.docExpiries ?? {}) as Record<string, string>

  return NextResponse.json({ expiries, found, extracted, errors })
}
