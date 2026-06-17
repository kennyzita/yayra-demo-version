import { createClient as createServerClient } from '@/lib/supabase/server'

export type AuthCheck = { ok: boolean; userId: string | null; role: string | null }

// Verifies the request has a logged-in Supabase session. Returns the user id/role if so.
export async function requireUser(): Promise<AuthCheck> {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { ok: false, userId: null, role: null }

  const { data: profile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const role = (profile?.role as { name: string } | null)?.name ?? null
  return { ok: true, userId: user.id, role }
}

// Verifies the request has a logged-in Supabase session with the Admin or HR role.
export async function requireAdminOrHR(): Promise<AuthCheck> {
  const result = await requireUser()
  if (!result.ok) return result
  if (result.role !== 'Admin' && result.role !== 'HR') return { ...result, ok: false }
  return result
}
