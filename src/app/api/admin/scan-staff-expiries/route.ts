import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { EXPIRY_DOC_TYPES, extractExpiryFromBuffer, mimeFromName, docTypeFromAppFilename } from '@/lib/expiry-ocr'
import { CERT_CANONICAL } from '@/lib/doc-type-utils'
import { requireUser, requireAdminOrHR } from '@/lib/api-auth'

const BUCKET = 'staff-documents'

function makeAdminDb() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// GET /api/admin/scan-staff-expiries?staffId=UUID
// Returns the current cert expiry dates for a staff member.
// Admin/HR can request any staffId; staff can only request their own.
export async function GET(req: NextRequest) {
  const { ok, userId, role } = await requireUser()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staffId') ?? ''
  if (!/^[0-9a-f-]{36}$/.test(staffId)) {
    return NextResponse.json({ error: 'Missing or invalid staffId' }, { status: 400 })
  }

  if (staffId !== userId && role !== 'Admin' && role !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = makeAdminDb()
  if (!db) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const { data: rows } = await db
    .from('staff_cert_expiries')
    .select('cert_type, expiry_date')
    .eq('staff_id', staffId)
    .eq('is_current', true)

  const expiries: Record<string, string> = {}
  for (const row of (rows ?? [])) {
    expiries[row.cert_type] = row.expiry_date
  }
  return NextResponse.json({ expiries })
}

// POST /api/admin/scan-staff-expiries
// Body: { staffId: string }
// Scans all expiry-capable documents using Claude OCR and saves extracted dates via SCD2
export async function POST(req: NextRequest) {
  const { ok, userId: scannedBy } = await requireAdminOrHR()
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
  const rawExpiries: { certType: string; expiryDate: string }[] = []
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
        if (date) {
          rawExpiries.push({ certType: docType, expiryDate: date })
          extracted++
        }
      } catch (err) {
        errors[docType] = String(err)
      }
    })
  )

  // 4. Canonicalize cert types and merge front/back variants (keep earliest expiry date)
  const newExpiries: Record<string, string> = {}
  for (const { certType, expiryDate } of rawExpiries) {
    const canonical = CERT_CANONICAL[certType] ?? certType
    if (!newExpiries[canonical] || expiryDate < newExpiries[canonical]) {
      newExpiries[canonical] = expiryDate
    }
  }

  // 5. Persist via SCD2: expire previous current row then insert new row
  const now = new Date().toISOString()
  await Promise.all(
    Object.entries(newExpiries).map(async ([certType, expiryDate]) => {
      await db.from('staff_cert_expiries')
        .update({ valid_to: now, is_current: false })
        .eq('staff_id', staffId)
        .eq('cert_type', certType)
        .eq('is_current', true)
      await db.from('staff_cert_expiries').insert({
        staff_id: staffId,
        cert_type: certType,
        expiry_date: expiryDate,
        scanned_by: scannedBy,
        valid_from: now,
        is_current: true,
      })
    })
  )

  // Return the full current expiry map
  const { data: rows } = await db
    .from('staff_cert_expiries')
    .select('cert_type, expiry_date')
    .eq('staff_id', staffId)
    .eq('is_current', true)

  const expiries: Record<string, string> = {}
  for (const row of (rows ?? [])) {
    expiries[row.cert_type] = row.expiry_date
  }

  return NextResponse.json({ expiries, found, extracted, errors })
}
