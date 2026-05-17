import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('role:roles(name)')
    .eq('id', session.user.id)
    .single()

  const roleName = (user?.role as { name: string } | null)?.name
  if (roleName === 'Admin' || roleName === 'HR') {
    redirect('/admin/dashboard')
  }
  redirect('/staff/dashboard')
}
