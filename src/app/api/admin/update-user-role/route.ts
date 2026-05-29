import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user: caller } } = await serverClient.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serverClient
    .from('users')
    .select('role:roles(name)')
    .eq('id', caller.id)
    .single()

  const callerRole = (Array.isArray(callerProfile?.role)
    ? (callerProfile.role as any[])[0]
    : callerProfile?.role) as { name: string } | null
  if (callerRole?.name !== 'Admin' && callerRole?.name !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, roleId } = await req.json()
  if (!userId || !roleId) {
    return NextResponse.json({ error: 'userId and roleId are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update({ role_id: roleId })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
