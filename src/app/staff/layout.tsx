import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name, role:roles(name)')
    .eq('id', authUser.id)
    .single()

  const firstName = user?.first_name ?? 'Maria'
  const lastName = user?.last_name ?? 'Santos'
  const roleName = (user?.role as { name: string } | null)?.name ?? 'DSP Staff'
  if (roleName === 'Deactivate') redirect('/deactivated')
  const userName = `${firstName} ${lastName}`
  const userInitials = `${firstName[0]}${lastName[0]}`.toUpperCase()

  return (
    <div style={{ display: 'flex', height: '100dvh', background: '#f4f5f7', overflow: 'hidden' }}>
      <Sidebar role="staff" userName={userName} userInitials={userInitials} userRole={roleName} />
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>{children}</main>
    </div>
  )
}
