import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', session.user.id)
    .single()

  const userName = user ? `${user.first_name} ${user.last_name}` : 'Staff'
  const userEmail = user?.email ?? session.user.email ?? ''

  return (
    <div className="flex h-screen bg-[#F8FAFA] overflow-hidden">
      <Sidebar role="staff" userName={userName} userEmail={userEmail} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
