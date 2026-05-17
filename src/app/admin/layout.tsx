import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name, email, role:roles(name)')
    .eq('id', session.user.id)
    .single()

  const roleName = (user?.role as { name: string } | null)?.name ?? 'Admin'
  if (roleName !== 'Admin' && roleName !== 'HR') redirect('/staff/dashboard')

  const firstName = user?.first_name ?? 'A'
  const lastName = user?.last_name ?? 'D'
  const userName = `${firstName} ${lastName}`
  const userInitials = `${firstName[0]}${lastName[0]}`.toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f4f5f7', overflow: 'hidden' }}>
      <Sidebar role="admin" userName={userName} userInitials={userInitials} userRole={roleName} />
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
    </div>
  )
}
