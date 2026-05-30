'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeactivatedPage() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, color: '#dc2626' }}>
          <i className="ti ti-user-off" />
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 10 }}>
          Account Deactivated
        </div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 32 }}>
          Your account has been deactivated by an administrator.
          Please contact your manager or HR if you believe this is a mistake.
        </div>

        <button
          onClick={handleSignOut}
          style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: '#004050', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
