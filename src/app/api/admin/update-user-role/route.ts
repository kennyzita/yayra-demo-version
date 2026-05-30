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

  // HR restrictions: cannot touch users who are currently Admin, cannot assign Admin role
  if (callerRole?.name === 'HR') {
    const [{ data: targetUser }, { data: newRole }] = await Promise.all([
      supabaseAdmin.from('users').select('role:roles(name)').eq('id', userId).single(),
      supabaseAdmin.from('roles').select('name').eq('id', roleId).single(),
    ])
    const targetCurrentRole = (Array.isArray(targetUser?.role)
      ? (targetUser.role as any[])[0]
      : targetUser?.role) as { name: string } | null
    if (targetCurrentRole?.name === 'Admin') {
      return NextResponse.json({ error: 'Forbidden: HR cannot change the role of an Admin user' }, { status: 403 })
    }
    if (newRole?.name === 'Admin') {
      return NextResponse.json({ error: 'Forbidden: HR cannot assign the Admin role' }, { status: 403 })
    }
  }

  // Update users.role_id
  const { error } = await supabaseAdmin
    .from('users')
    .update({ role_id: roleId })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // SCD Type 2: close the current row, insert the new one.
  // Previous role is implicitly the row with is_current = false before this one.
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('user_role_history')
    .update({ effective_to: now, is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true)

  await supabaseAdmin
    .from('user_role_history')
    .insert({ user_id: userId, role_id: roleId, changed_by: caller.id, effective_from: now, is_current: true })

  return NextResponse.json({ ok: true })
}
