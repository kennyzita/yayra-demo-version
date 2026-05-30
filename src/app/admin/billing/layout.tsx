import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('users')
    .select('role:roles(name)')
    .eq('id', user.id)
    .single()

  const roleName = (data?.role as { name: string } | null)?.name ?? ''
  if (roleName === 'HR') redirect('/admin/dashboard')

  return <>{children}</>
}
