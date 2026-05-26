import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'staff-documents'

export async function POST(req: NextRequest) {
  // Verify authenticated user
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file   = form.get('file')   as File   | null
  const docKey = form.get('docKey') as string | null
  if (!file || !docKey) return NextResponse.json({ error: 'Missing file or docKey' }, { status: 400 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const ext  = file.name.split('.').pop() || 'bin'
  const path = `${user.id}/application/${docKey}_${Date.now()}.${ext}`

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'application/octet-stream',
  })

  if (error) {
    console.error('upload-document error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ path })
}
