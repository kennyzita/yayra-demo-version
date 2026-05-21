import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

// Service-role admin client — never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  // Verify caller is an authenticated Admin/HR user
  const serverClient = createServerClient()
  const { data: { user: caller } } = await serverClient.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serverClient
    .from('users')
    .select('tenant_id, role:roles(name)')
    .eq('id', caller.id)
    .single()

  const callerRole = (callerProfile?.role as { name: string } | null)?.name
  if (callerRole !== 'Admin' && callerRole !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { first_name, last_name, email, password, role_id } = await req.json()

  if (!first_name || !last_name || !email || !password || !role_id) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }

  // Create auth user
  const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

  // Create public.users record
  const { error: profileErr } = await supabaseAdmin.from('users').insert({
    id: newUser.user.id,
    tenant_id: callerProfile!.tenant_id,
    role_id,
    first_name,
    last_name,
    email,
    status: 'active',
  })

  if (profileErr) {
    // Rollback auth user if profile creation fails
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, id: newUser.user.id })
}

export async function DELETE(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user: caller } } = await serverClient.auth.getUser()
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await serverClient
    .from('users')
    .select('role:roles(name)')
    .eq('id', caller.id)
    .single()

  const callerRole = (callerProfile?.role as { name: string } | null)?.name
  if (callerRole !== 'Admin') {
    return NextResponse.json({ error: 'Only Admins can delete users.' }, { status: 403 })
  }

  const { userId } = await req.json()
  if (userId === caller.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  // Remove public.users record first (FK cascade will handle audit_logs)
  await supabaseAdmin.from('users').delete().eq('id', userId)
  // Remove auth user
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
