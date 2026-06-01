import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'

// All known subfolders — covers both application uploads and admin uploads
const SUBFOLDERS = [
  'application',
  'W4', 'NJ W4', 'Form I-9', 'Direct Deposit Form', 'CRO Consent',
  "Driver's License / Identification - Front", "Driver's License / Identification - Back",
  "Driver's License - Front", "Driver's License - Back", // legacy
  "Driver's License", // legacy
  'EAD / Green card - Front', 'EAD / Green card - Back',
  'EAD / Green card', // legacy
  'SSN Card',
  'CPR Certificate', "Danielle's Law Sign-off",
  "Stephen Komnino's Law", 'Appendix A', 'CARI Clearance',
  'Background Check', 'IdentoGO', 'Reference Letter',
  // Admin-only document types
  'Onboarding Forms', 'MRO', 'CRO', 'CARI', 'FARA', 'Everify', 'CDS',
  'Other',
]

export interface StaffDocFile {
  folder: string
  name: string
  path: string
  size: number
  createdAt: string
  signedUrl: string
}

export async function GET(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const staffId = req.nextUrl.searchParams.get('staffId')
  if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 })

  // F4: Only allow a user to view their own documents, or Admin/HR to view anyone's
  const { data: callerProfile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const callerRole = (callerProfile?.role as { name: string } | null)?.name
  const isAdminOrHR = callerRole === 'Admin' || callerRole === 'HR'
  if (!isAdminOrHR && staffId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // List all subfolders in parallel
  const folderResults = await Promise.all(
    SUBFOLDERS.map(async folder => {
      const { data } = await db.storage.from(BUCKET).list(`${staffId}/${folder}`, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      return { folder, files: (data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder') }
    })
  )

  // Collect all non-empty file paths
  const allPaths: { folder: string; name: string; path: string; size: number; createdAt: string }[] = []
  for (const { folder, files } of folderResults) {
    for (const f of files) {
      allPaths.push({
        folder,
        name: f.name,
        path: `${staffId}/${folder}/${f.name}`,
        size: (f.metadata as { size?: number } | null)?.size ?? 0,
        createdAt: f.created_at ?? '',
      })
    }
  }

  if (allPaths.length === 0) return NextResponse.json({ files: [] })

  // Batch-sign all URLs (1-hour expiry)
  const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(
    allPaths.map(f => f.path),
    3600,
  )

  const signedMap = new Map((signed ?? []).map(s => [s.path, s.signedUrl ?? '']))

  const files: StaffDocFile[] = allPaths.map(f => ({
    ...f,
    signedUrl: signedMap.get(f.path) ?? '',
  }))

  return NextResponse.json({ files })
}
