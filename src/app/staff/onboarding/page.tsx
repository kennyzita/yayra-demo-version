'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmployeeOnboardingSection } from '@/components/onboarding/EmployeeOnboardingSection'

export default function OnboardingFormsPage() {
  const supabase = createClient()

  const [loading,      setLoading]      = useState(true)
  const [userId,       setUserId]       = useState<string | null>(null)
  const [completed,    setCompleted]    = useState(false)
  const [completedAt,  setCompletedAt]  = useState<string | null>(null)
  const [revoked,      setRevoked]      = useState(false)
  const [appSubmitted, setAppSubmitted] = useState(false)

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data } = await supabase
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', user.id)
      .maybeSingle()
    const extra = (data?.data ?? {}) as Record<string, string>
    if (extra.onboarding_forms_signed === 'true') {
      setCompleted(true)
      setCompletedAt(extra.onboarding_forms_signed_at ?? null)
    }
    if (extra.onboarding_forms_revoked === 'true') setRevoked(true)
    if (extra.application_submitted === 'true') setAppSubmitted(true)
    setLoading(false)
  }

  useEffect(() => { checkStatus() }, [])

  const signedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
      Loading…
    </div>
  )

  if (!appSubmitted) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 20, padding: 32 }}>
      <div style={{ fontSize: 56, color: '#d97706' }}>
        <i className="ti ti-lock" />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#111', textAlign: 'center' }}>Complete Your DSP Application First</div>
      <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 420, lineHeight: 1.7 }}>
        You must submit your DSP job application before you can access the onboarding forms.
      </div>
      <a
        href="/staff/application"
        style={{ padding: '11px 24px', background: '#008080', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <i className="ti ti-file-text" /> Go to DSP Application
      </a>
    </div>
  )

  // Completed and not revoked — show success card
  if (completed && !revoked) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f5f7' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Onboarding Forms</div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '48px 52px', maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(48,176,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#30B060', margin: '0 auto 20px' }}>
            <i className="ti ti-circle-check" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 12 }}>
            Onboarding forms signed
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.75, marginBottom: 20 }}>
            Your onboarding forms have been submitted. We will reach out to you shortly. If you have any questions, email{' '}
            <a href="mailto:admin@reliancecareservicesllc.com" style={{ color: '#008080', fontWeight: 600, textDecoration: 'none' }}>
              admin@reliancecareservicesllc.com
            </a>
          </div>
          {signedDate && (
            <div style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, background: 'rgba(48,176,96,0.1)', color: '#30B060', fontWeight: 500, display: 'inline-block' }}>
              Signed on {signedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Active — show the onboarding form
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f5f7', overflowY: 'auto' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Onboarding Forms</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Complete and sign all required onboarding documents</div>
        </div>
      </div>

      {revoked && (
        <div style={{ background: 'rgba(186,117,23,0.07)', borderBottom: '1px solid rgba(186,117,23,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <i className="ti ti-rotate-clockwise" style={{ fontSize: 15, color: '#BA7517' }} />
          <span style={{ fontSize: 13, color: '#92400e' }}>
            Your onboarding forms have been unlocked by an administrator. Please re-complete and re-sign.
          </span>
        </div>
      )}

      <div style={{ flex: 1, padding: 24 }}>
        {userId && (
          <EmployeeOnboardingSection
            employeeId={userId}
            mode="employee"
            onSigned={() => checkStatus()}
          />
        )}
      </div>
    </div>
  )
}
