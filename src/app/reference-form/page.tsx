'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const fi: React.CSSProperties = {
  fontSize: 14, color: '#111', background: '#fff', border: '1px solid #d1d5db',
  borderRadius: 8, padding: '10px 12px', outline: 'none', width: '100%',
  fontFamily: 'inherit', boxSizing: 'border-box' as const,
}
const fLabel: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
      <label style={fLabel}>{label}{required && <span style={{ color: '#e24b4a', marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  )
}

const RATINGS = ['Excellent', 'Good', 'Satisfactory', 'Below average', 'Poor'] as const

export default function ReferenceFormPage() {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    refName: '',
    refTitle: '',
    refOrganization: '',
    refPhone: '',
    refEmail: '',
    relationship: '',
    knownYears: '',
    applicantName: '',
    overallRating: '',
    reliability: '',
    communication: '',
    teamwork: '',
    patientCare: '',
    wouldRehire: '',
    strengths: '',
    concerns: '',
    additionalComments: '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.refName || !form.applicantName || !form.overallRating) {
      setError('Please fill in all required fields.')
      return
    }
    setError('')
    setSubmitting(true)
    const supabase = createClient()
    const { error: dbError } = await supabase.from('reference_responses').insert({
      ref_name: form.refName,
      ref_title: form.refTitle,
      ref_organization: form.refOrganization,
      ref_phone: form.refPhone,
      ref_email: form.refEmail,
      relationship: form.relationship,
      known_years: form.knownYears,
      applicant_name: form.applicantName,
      overall_rating: form.overallRating,
      reliability: form.reliability,
      communication: form.communication,
      teamwork: form.teamwork,
      patient_care: form.patientCare,
      would_rehire: form.wouldRehire,
      strengths: form.strengths,
      concerns: form.concerns,
      additional_comments: form.additionalComments,
      submitted_at: new Date().toISOString(),
    })
    setSubmitting(false)
    if (dbError) {
      setError('There was a problem submitting your response. Please try again.')
      console.error(dbError)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 48, maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(48,176,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28, color: '#30B060' }}>✓</div>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: '0 0 12px' }}>Thank you for your response</h2>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            Your reference has been submitted successfully. We appreciate you taking the time to support this candidate's application with Reliance Care Services.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 16px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: '#004050', borderRadius: '10px 10px 0 0', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#008080,#30B060)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>Reliance Care Services</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Employment Reference Form</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 28 }}>

          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 24px', background: 'rgba(0,128,128,0.05)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: 14 }}>
            Thank you for agreeing to provide a reference. Please complete the form below honestly and to the best of your ability. Your response is confidential and will only be used as part of our hiring process.
          </p>

          {/* Reference info */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#004050', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, paddingBottom: 8, borderBottom: '0.5px solid #e5e7eb' }}>Your information</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Your full name" required>
              <input style={fi} value={form.refName} onChange={e => set('refName', e.target.value)} placeholder="Jane Smith" />
            </Field>
            <Field label="Your job title">
              <input style={fi} value={form.refTitle} onChange={e => set('refTitle', e.target.value)} placeholder="e.g. Supervisor" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Organization / Company">
              <input style={fi} value={form.refOrganization} onChange={e => set('refOrganization', e.target.value)} placeholder="Organization name" />
            </Field>
            <Field label="Your phone number">
              <input style={fi} value={form.refPhone} onChange={e => set('refPhone', e.target.value)} placeholder="(555) 000-0000" type="tel" />
            </Field>
          </div>

          <Field label="Your email address">
            <input style={fi} value={form.refEmail} onChange={e => set('refEmail', e.target.value)} placeholder="you@example.com" type="email" />
          </Field>

          {/* Applicant info */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#004050', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 16px', paddingBottom: 8, borderBottom: '0.5px solid #e5e7eb' }}>About the applicant</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Field label="Applicant's full name" required>
              <input style={fi} value={form.applicantName} onChange={e => set('applicantName', e.target.value)} placeholder="Full name of the applicant" />
            </Field>
            <Field label="Your relationship to applicant" required>
              <select style={fi} value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                <option value="">Select…</option>
                <option>Former supervisor</option>
                <option>Current supervisor</option>
                <option>Colleague / Co-worker</option>
                <option>Professional contact</option>
                <option>Other</option>
              </select>
            </Field>
          </div>

          <Field label="How long have you known the applicant?">
            <input style={fi} value={form.knownYears} onChange={e => set('knownYears', e.target.value)} placeholder="e.g. 3 years" />
          </Field>

          {/* Ratings */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#004050', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 16px', paddingBottom: 8, borderBottom: '0.5px solid #e5e7eb' }}>Performance ratings</div>

          {([
            ['overallRating', 'Overall performance rating', true],
            ['reliability',   'Reliability & punctuality',  false],
            ['communication', 'Communication skills',        false],
            ['teamwork',      'Teamwork & collaboration',    false],
            ['patientCare',   'Care & compassion for others', false],
          ] as [keyof typeof form, string, boolean][]).map(([key, label, required]) => (
            <Field key={key} label={label} required={required}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {RATINGS.map(r => (
                  <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer', padding: '7px 14px', borderRadius: 8, border: `1px solid ${form[key] === r ? '#008080' : '#e5e7eb'}`, background: form[key] === r ? 'rgba(0,128,128,0.07)' : '#fafafa' }}>
                    <input type="radio" name={key} value={r} checked={form[key] === r} onChange={() => set(key, r)} style={{ accentColor: '#008080' }} />
                    {r}
                  </label>
                ))}
              </div>
            </Field>
          ))}

          <Field label="Would you rehire or recommend this person?" required>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Yes', 'No', 'With reservations'].map(v => (
                <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer', padding: '7px 14px', borderRadius: 8, border: `1px solid ${form.wouldRehire === v ? '#008080' : '#e5e7eb'}`, background: form.wouldRehire === v ? 'rgba(0,128,128,0.07)' : '#fafafa' }}>
                  <input type="radio" name="wouldRehire" value={v} checked={form.wouldRehire === v} onChange={() => set('wouldRehire', v)} style={{ accentColor: '#008080' }} />
                  {v}
                </label>
              ))}
            </div>
          </Field>

          {/* Open-ended */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#004050', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '8px 0 16px', paddingBottom: 8, borderBottom: '0.5px solid #e5e7eb' }}>Additional comments</div>

          <Field label="Key strengths of the applicant">
            <textarea style={{ ...fi, resize: 'vertical', minHeight: 90 }} value={form.strengths} onChange={e => set('strengths', e.target.value)} placeholder="Describe the applicant's main strengths…" />
          </Field>

          <Field label="Any concerns or areas for improvement">
            <textarea style={{ ...fi, resize: 'vertical', minHeight: 90 }} value={form.concerns} onChange={e => set('concerns', e.target.value)} placeholder="Optional — describe any concerns…" />
          </Field>

          <Field label="Any additional comments">
            <textarea style={{ ...fi, resize: 'vertical', minHeight: 80 }} value={form.additionalComments} onChange={e => set('additionalComments', e.target.value)} placeholder="Anything else you'd like to add…" />
          </Field>

          {error && (
            <div style={{ background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: 12, fontSize: 13, color: '#e24b4a', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '13px 0', background: '#008080', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, fontFamily: 'inherit' }}
          >
            {submitting ? 'Submitting…' : 'Submit Reference'}
          </button>

          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
            Reliance Care Services · admin@reliancecareservicesllc.com
          </p>
        </form>
      </div>
    </div>
  )
}
