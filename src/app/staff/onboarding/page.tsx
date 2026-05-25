'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const FORM_URL =
  'https://www.pdffiller.com/jsfiller-desk13/?flat_pdf_quality=high&mode=link_to_fill&requestHash=1e78520873f1d1a933c35b8467f195b0d6ec3bbec5a60d4ae05f1536620c4146&lang=en&et=l2f&projectId=2072509557&jsf-dss-v2=true&isSkipEditorLoadFrequency=true&jsf-fake-edit-embedded=true&jsf-socket-io=true&jsf-context-menu-to-right-panel=false&jsf-disable-autosave=true&jsf-fake-edit-stream-editing=true&jsf-disable-browser-translation=true&acc-header-redesign=false&jsf-editor-pdfjs-five=true&jsf-simplified-modes-iteration-1=false&richTextFormatting=true&jsf-redesign-full=true&acc-header-redesign-2=false&routeId=0ed42be7ddaace9d569e723e4aacb6a9#8e5a0bba4d0644d78e24d09088c579b3'

export default function OnboardingFormsPage() {
  const supabase = createClient()

  const [loading,      setLoading]      = useState(true)
  const [completed,    setCompleted]    = useState(false)
  const [completedAt,  setCompletedAt]  = useState<string | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [toast,        setToast]        = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
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
      setLoading(false)
    }
    check()
  }, [])

  async function markComplete() {
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
    }

    const { error } = await supabase
      .from('billing_staff_data')
      .upsert({ staff_id: user.id, data: merged })

    if (error) {
      showToast('Error saving status. Please try again.')
    } else {
      setCompleted(true)
      setCompletedAt(new Date().toISOString())
      showToast('Onboarding forms marked as complete!')
    }
    setSaving(false)
  }

  const signedDate = completedAt
    ? new Date(completedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
      Loading…
    </div>
  )

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
          style={{ fontSize: 13, padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
        >
          <i className="ti ti-external-link" style={{ fontSize: 15 }} /> Open in new tab
        </a>
      </div>

      {completed ? (
        /* ── Completion banner ── */
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(48,176,96,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#30B060' }}>
            <i className="ti ti-circle-check" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Forms Completed</div>
          <div style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', maxWidth: 420, lineHeight: 1.7 }}>
            You have completed and signed all required onboarding forms.
            {signedDate && <> Your submission was recorded on <strong>{signedDate}</strong>.</>}
          </div>
          <div style={{ padding: '14px 24px', background: 'rgba(48,176,96,0.08)', border: '1px solid rgba(48,176,96,0.25)', borderRadius: 12, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-lock" /> Your administrator has been notified and will review your submission.
          </div>
          <a
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: '#008080', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500 }}
          >
            <i className="ti ti-external-link" /> View submitted forms
          </a>
        </div>
      ) : (
        /* ── Form embed ── */
        <>
          <div style={{ background: 'rgba(0,128,128,0.06)', borderBottom: '1px solid rgba(0,128,128,0.15)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, color: '#008080' }} />
            <span style={{ fontSize: 13, color: '#004050' }}>
              Complete all fields in the form below, then click <strong>"I've completed and signed all forms"</strong> when done.
            </span>
          </div>

          <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
            <iframe
              src={FORM_URL}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="camera; microphone; clipboard-write"
              title="Onboarding Forms"
            />
          </div>

          <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ flex: 1, fontSize: 13, color: '#6b7280' }}>
              Once you have filled in and signed the form above, click the button to notify your administrator.
            </div>
            <button
              onClick={markComplete}
              disabled={saving}
              style={{ padding: '11px 24px', background: saving ? '#6b7280' : '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', opacity: saving ? 0.8 : 1, fontFamily: 'inherit' }}
            >
              <i className={`ti ${saving ? 'ti-loader-2' : 'ti-circle-check'}`} />
              {saving ? 'Saving…' : "I've completed and signed all forms"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
