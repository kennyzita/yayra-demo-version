'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const FORM_URL = 'https://pdf.ac/y7ftbzlyGj'

export default function OnboardingFormsPage() {
  const supabase = createClient()

  const [loading,       setLoading]       = useState(true)
  const [completed,     setCompleted]     = useState(false)
  const [completedAt,   setCompletedAt]   = useState<string | null>(null)
  const [revoked,       setRevoked]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [toast,         setToast]         = useState<string | null>(null)
  const [appSubmitted,  setAppSubmitted]  = useState(false)
  const [checkingApp,   setCheckingApp]   = useState(true)
  const [confirmed,     setConfirmed]     = useState(false)
  const [hasOpenedForm, setHasOpenedForm] = useState(false)

  // Detect when user clicks inside the cross-origin PDFiller iframe:
  // clicking the iframe steals focus from the parent window, so we listen
  // for window blur and check that the active element is the iframe.
  useEffect(() => {
    function onWindowBlur() {
      if (document.activeElement?.tagName === 'IFRAME') {
        setHasOpenedForm(true)
      }
    }
    window.addEventListener('blur', onWindowBlur)
    return () => window.removeEventListener('blur', onWindowBlur)
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); setCheckingApp(false); return }
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
      setCheckingApp(false)
    }
    check()
  }, [])

  async function markComplete() {
    if (!confirmed) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data: existing } = await supabase
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', user.id)
      .maybeSingle()

    const merged = {
      ...((existing?.data as Record<string, string>) ?? {}),
      onboarding_forms_signed:    'true',
      onboarding_forms_signed_at: new Date().toISOString(),
      onboarding_forms_revoked:   'false',
    }

    const { error } = await supabase
      .from('billing_staff_data')
      .upsert({ staff_id: user.id, data: merged })

    if (error) {
      showToast('Error saving status. Please try again.')
    } else {
      setCompleted(true)
      setRevoked(false)
      setCompletedAt(new Date().toISOString())
      showToast('Onboarding forms marked as complete!')
    }
    setSaving(false)
  }

  const signedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  if (loading || checkingApp) return (
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

  // ── Already completed (and not revoked by admin) ─────────────────────────────
  if (completed && !revoked) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f5f7' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}

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
            Onboarding forms completed
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.75, marginBottom: 20 }}>
            Your onboarding forms have been submitted. We will reach out to you shortly. If you have any questions, email{' '}
            <a href="mailto:admin@reliancecareservicesllc.com" style={{ color: '#008080', fontWeight: 600, textDecoration: 'none' }}>
              admin@reliancecareservicesllc.com
            </a>
          </div>
          {signedDate && (
            <div style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, background: 'rgba(48,176,96,0.1)', color: '#30B060', fontWeight: 500, display: 'inline-block' }}>
              Submitted on {signedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ── Active form ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f5f7' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 14, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Onboarding Forms</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Complete and sign all required onboarding documents</div>
        </div>
        <div style={{ flex: 1 }} />
        <a
          href={FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setHasOpenedForm(true)}
          style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
        >
          <i className="ti ti-external-link" style={{ fontSize: 15 }} /> Open in new tab
        </a>
      </div>

      {/* Info banner */}
      <div style={{ background: 'rgba(0,128,128,0.06)', borderBottom: '1px solid rgba(0,128,128,0.15)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <i className="ti ti-info-circle" style={{ fontSize: 15, color: '#008080' }} />
        <span style={{ fontSize: 13, color: '#004050' }}>
          Complete all fields in the form below, then confirm and click <strong>"I've completed and signed all forms"</strong>.
        </span>
      </div>

      {revoked && (
        <div style={{ background: 'rgba(186,117,23,0.07)', borderBottom: '1px solid rgba(186,117,23,0.2)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <i className="ti ti-rotate-clockwise" style={{ fontSize: 15, color: '#BA7517' }} />
          <span style={{ fontSize: 13, color: '#92400e' }}>
            Your onboarding forms have been unlocked by an administrator. Please re-complete and re-submit all forms.
          </span>
        </div>
      )}

      {/* Form embed */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <iframe
          src={FORM_URL}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          allow="camera; microphone; clipboard-write"
          title="Onboarding Forms"
        />
      </div>

      {/* Confirmation footer */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '14px 24px', display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        {!hasOpenedForm && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 8 }}>
            <i className="ti ti-lock" style={{ fontSize: 14, color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#92400e' }}>
              You must open and sign the PDFiller form above before you can confirm submission.
            </span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: hasOpenedForm ? 'pointer' : 'not-allowed', flex: 1, minWidth: 260, opacity: hasOpenedForm ? 1 : 0.45 }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => hasOpenedForm && setConfirmed(e.target.checked)}
              disabled={!hasOpenedForm}
              style={{ width: 17, height: 17, accentColor: '#008080', cursor: hasOpenedForm ? 'pointer' : 'not-allowed', flexShrink: 0 }}
            />
            <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
              I confirm I have read, completed, and signed all fields in the form above
            </span>
          </label>
          <button
            onClick={markComplete}
            disabled={saving || !confirmed || !hasOpenedForm}
            title={!hasOpenedForm ? 'Open and sign the form above first' : !confirmed ? 'Please confirm you have completed the form first' : undefined}
            style={{ padding: '11px 24px', background: (!confirmed || !hasOpenedForm) ? '#d1d5db' : saving ? '#6b7280' : '#008080', color: (!confirmed || !hasOpenedForm) ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: (!confirmed || !hasOpenedForm || saving) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', transition: 'all 0.2s', fontFamily: 'inherit' }}
          >
            <i className={`ti ${saving ? 'ti-loader-2' : 'ti-circle-check'}`} />
            {saving ? 'Saving…' : "I've completed and signed all forms"}
          </button>
        </div>
      </div>
    </div>
  )
}
