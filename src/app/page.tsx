import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: user } = await supabase
    .from('users')
    .select('role:roles(name)')
    .eq('id', authUser.id)
    .single()

  const roleName = (user?.role as { name: string } | null)?.name
  if (roleName === 'Admin' || roleName === 'HR') {
    redirect('/admin/dashboard')
  }
  if (roleName === 'DSP') {
    redirect('/staff/application')
  }
  redirect('/staff/dashboard')
}
