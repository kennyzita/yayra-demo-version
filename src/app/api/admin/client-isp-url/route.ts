import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'

export async function GET(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const role = (profile?.role as unknown as { name: string } | null)?.name

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // DSP Staff: must be assigned to this client
  if (role !== 'Admin' && role !== 'HR') {
    const { data: assignment } = await db
      .from('assignments').select('id')
      .eq('dsp_id', user.id).eq('client_id', clientId).maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: bcd } = await db
    .from('billing_client_data').select('data').eq('client_id', clientId).maybeSingle()
  const path = (bcd?.data as Record<string, unknown> | null)?.isp_doc_path as string | null
  if (!path) return NextResponse.json({ error: 'No ISP document uploaded for this client' }, { status: 404 })

  const { data: signed, error: signErr } = await db.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (signErr || !signed)
    return NextResponse.json({ error: signErr?.message ?? 'Failed to generate URL' }, { status: 500 })

  const fileName = path.split('/').pop() ?? 'isp_document'
  return NextResponse.json({ signedUrl: signed.signedUrl, fileName })
}
