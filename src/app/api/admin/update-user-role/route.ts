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

  // Fetch the user's current role for SCD Type 2 history
  const { data: currentUser } = await supabaseAdmin
    .from('users')
    .select('role_id')
    .eq('id', userId)
    .single()
  const previousRoleId = (currentUser as any)?.role_id ?? null

  // Update users.role_id
  const { error } = await supabaseAdmin
    .from('users')
    .update({ role_id: roleId })
    .eq('id', userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // SCD Type 2: close the current history record and insert a new one.
  // Errors here are non-fatal — they won't affect the role update result.
  // Requires public.user_role_history table:
  //   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  //   user_id uuid NOT NULL REFERENCES public.users(id),
  //   role_id uuid REFERENCES public.roles(id),
  //   previous_role_id uuid REFERENCES public.roles(id),
  //   changed_by uuid REFERENCES public.users(id),
  //   effective_from timestamptz NOT NULL DEFAULT now(),
  //   effective_to timestamptz,
  //   is_current boolean NOT NULL DEFAULT true
  const now = new Date().toISOString()

  await supabaseAdmin
    .from('user_role_history')
    .update({ effective_to: now, is_current: false })
    .eq('user_id', userId)
    .eq('is_current', true)

  await supabaseAdmin
    .from('user_role_history')
    .insert({
      user_id: userId,
      role_id: roleId,
      previous_role_id: previousRoleId,
      changed_by: caller.id,
      effective_from: now,
      is_current: true,
    })

  return NextResponse.json({ ok: true })
}
