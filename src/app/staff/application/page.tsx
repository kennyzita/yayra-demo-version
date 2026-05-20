'use client'

import { useState } from 'react'

const STEPS = [
  { label: 'Personal info', sub: 'Name, address, contact' },
  { label: 'Availability', sub: 'Schedule & position' },
  { label: 'Eligibility', sub: 'Work authorization' },
  { label: 'Education', sub: 'School & work history' },
  { label: 'Emergency contact', sub: 'Emergency details' },
  { label: 'Documents', sub: 'Uploads & certs' },
  { label: 'Signature', sub: 'Review & sign' },
]

const DAYS_AVAIL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHIFTS = ['7AM – 3PM', '3PM – 11PM', '11PM – 7AM']

const sectionStyle: React.CSSProperties = { border: '1px solid #d8dde6', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const sectionHead: React.CSSProperties = { background: '#0d2d5e', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
const sectionBody: React.CSSProperties = { background: 'white', padding: 20 }
const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 7 }
const inputStyle: React.CSSProperties = { width: '100%', fontSize: 14, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }
const req = <span style={{ color: '#e24b4a', marginLeft: 2 }}>*</span>

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={fieldLabel}>{label}{required && req}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#6b7280' }}>{hint}</span>}
    </div>
  )
}

function UploadBox({ label, hint, required, optional }: { label: string; hint: string; required?: boolean; optional?: boolean }) {
  return (
    <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: '#f9fafb' }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(13,45,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#0d2d5e', flexShrink: 0 }}>
        <i className="ti ti-upload" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{label}{required && <span style={{ color: '#e24b4a' }}> *</span>}</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{hint}</div>
      </div>
      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: optional ? '#f3f4f6' : 'rgba(186,117,23,0.1)', color: optional ? '#6b7280' : '#BA7517' }}>{optional ? 'Optional' : 'Required'}</span>
    </div>
  )
}

function RadioGroup({ name, options }: { name: string; options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#111', cursor: 'pointer', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff' }}>
          <input type="radio" name={name} style={{ accentColor: '#0d2d5e' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function CheckGroup({ options }: { options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#111', cursor: 'pointer', padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff' }}>
          <input type="checkbox" style={{ accentColor: '#0d2d5e' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0d2d5e', marginBottom: 8 }}>{label}</div>
      <div style={{ height: '0.5px', background: '#e5e7eb' }} />
    </div>
  )
}

const STEP_CONTENT = [
  // 0 — Personal info
  <>
    <div style={{ background: 'rgba(13,45,94,0.04)', border: '1px solid rgba(13,45,94,0.12)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 20 }}>
      Reliance Care Services LLC is an equal opportunity employer. Applicants are considered without regard to race, age, sex, gender identity, marital status, family status, political or religious conviction, impairment, or pregnancy.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="First name" required><input type="text" placeholder="First name" style={inputStyle} /></Field>
      <Field label="Middle name"><input type="text" placeholder="Middle name" style={inputStyle} /></Field>
      <Field label="Last name" required><input type="text" placeholder="Last name" style={inputStyle} /></Field>
    </div>
    <Divider label="Address" />
    <div style={{ marginBottom: 14 }}><Field label="Address line 1"><input type="text" placeholder="Street address" style={inputStyle} /></Field></div>
    <div style={{ marginBottom: 14 }}><Field label="Address line 2"><input type="text" placeholder="Apt, suite, unit (optional)" style={inputStyle} /></Field></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="City"><input type="text" placeholder="City" style={inputStyle} /></Field>
      <Field label="State"><input type="text" placeholder="State" style={inputStyle} /></Field>
      <Field label="Zip code"><input type="text" placeholder="Zip" style={inputStyle} /></Field>
    </div>
    <Divider label="Contact" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Phone" required><input type="tel" placeholder="(000) 000-0000" style={inputStyle} /></Field>
      <Field label="Email address" required><input type="email" placeholder="email@example.com" style={inputStyle} /></Field>
      <Field label="Date of birth" required hint="Stored encrypted · HIPAA protected"><input type="date" style={inputStyle} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Social security number" required hint="AES-256 encrypted · never stored in plain text">
        <input type="password" placeholder="XXX-XX-XXXX" style={inputStyle} />
      </Field>
    </div>
  </>,

  // 1 — Availability
  <>
    <Divider label="Allergies & availability" />
    <div style={{ marginBottom: 16 }}>
      <div style={fieldLabel}>Are you allergic to any of the following?{req}</div>
      <CheckGroup options={['Pets', 'Smoke', 'None']} />
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={fieldLabel}>Are you able to work holidays?</div>
      <RadioGroup name="hol" options={['Yes', 'No']} />
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={fieldLabel}>Days available{req}</div>
      <CheckGroup options={DAYS_AVAIL} />
    </div>
    <div style={{ marginBottom: 20 }}>
      <div style={fieldLabel}>Preferred shift{req}</div>
      <CheckGroup options={SHIFTS} />
    </div>
    <Divider label="Position details" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Date available to start"><input type="date" style={inputStyle} /></Field>
      <Field label="How did you hear about us?">
        <select style={inputStyle}><option>Select...</option><option>Referral</option><option>Internet</option></select>
      </Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Position applying for">
        <select style={inputStyle}><option>DSP</option></select>
      </Field>
      <div>
        <div style={fieldLabel}>Type of assignment</div>
        <CheckGroup options={['Part time', 'Full time', 'Live-in']} />
      </div>
    </div>
  </>,

  // 2 — Eligibility
  <>
    {[
      { q: 'Are you a citizen of the United States?', name: 'cit' },
      { q: 'Are you authorized to work in the U.S.?', name: 'auth' },
      { q: 'Have you ever worked for this company?', name: 'prev' },
      { q: 'Do you authorize RCS to conduct a criminal background check?', name: 'bg' },
      { q: 'Do you have malpractice insurance?', name: 'mal' },
    ].map(({ q, name }) => (
      <div key={name} style={{ marginBottom: 16 }}>
        <div style={fieldLabel}>{q}{req}</div>
        <RadioGroup name={name} options={['Yes', 'No']} />
      </div>
    ))}
    <div style={{ marginBottom: 14 }}><Field label="If yes, when?"><input type="date" style={{ ...inputStyle, maxWidth: 200 }} /></Field></div>
    <div style={{ marginBottom: 14 }}><Field label="Please explain (if applicable)"><textarea placeholder="Provide any relevant details..." style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field></div>
    <Field label="If yes, name and address of carrier" required><textarea placeholder="Insurance carrier name and address..." style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
  </>,

  // 3 — Education
  <>
    <Divider label="Education history" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="School name" required><input type="text" placeholder="School name" style={inputStyle} /></Field>
        <Field label="From" required><input type="date" style={inputStyle} /></Field>
        <Field label="To" required><input type="date" style={inputStyle} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[{ lbl: 'Did you graduate?', name: 'grad' }, { lbl: 'Diploma / GED', name: 'ged' }, { lbl: 'Degree', name: 'deg' }].map(f => (
          <div key={f.name}>
            <div style={fieldLabel}>{f.lbl}</div>
            <RadioGroup name={f.name} options={['Yes', 'No']} />
          </div>
        ))}
      </div>
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0d2d5e', cursor: 'pointer', padding: '10px 14px', border: '1px dashed rgba(13,45,94,0.3)', borderRadius: 8, background: 'rgba(13,45,94,0.03)', width: '100%', justifyContent: 'center', fontWeight: 600, fontFamily: 'inherit', marginBottom: 20 }}>
      <i className="ti ti-plus" /> Add another school
    </button>
    <Divider label="Employment history" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="Company name" required><input type="text" placeholder="Company" style={inputStyle} /></Field>
        <Field label="Job title"><input type="text" placeholder="Title" style={inputStyle} /></Field>
        <Field label="Supervisor"><input type="text" placeholder="Supervisor name" style={inputStyle} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="Responsibilities" required><textarea placeholder="Key responsibilities..." style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
        <Field label="Reason for leaving"><textarea placeholder="Reason for leaving..." style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
      </div>
      <div style={fieldLabel}>May we contact your previous supervisor?</div>
      <RadioGroup name="contact0" options={['Yes', 'No']} />
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0d2d5e', cursor: 'pointer', padding: '10px 14px', border: '1px dashed rgba(13,45,94,0.3)', borderRadius: 8, background: 'rgba(13,45,94,0.03)', width: '100%', justifyContent: 'center', fontWeight: 600, fontFamily: 'inherit', marginBottom: 20 }}>
      <i className="ti ti-plus" /> Add another employer
    </button>
    <Divider label="References" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Reference name" required><input type="text" placeholder="Full name" style={inputStyle} /></Field>
        <Field label="Years acquainted" required><input type="text" placeholder="e.g. 3 years" style={inputStyle} /></Field>
      </div>
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#0d2d5e', cursor: 'pointer', padding: '10px 14px', border: '1px dashed rgba(13,45,94,0.3)', borderRadius: 8, background: 'rgba(13,45,94,0.03)', width: '100%', justifyContent: 'center', fontWeight: 600, fontFamily: 'inherit' }}>
      <i className="ti ti-plus" /> Add another reference
    </button>
  </>,

  // 4 — Emergency contact
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
      <Field label="Emergency contact name" required><input type="text" placeholder="Full name" style={inputStyle} /></Field>
      <Field label="Relationship" required>
        <select style={inputStyle}><option value="">Select...</option><option>Spouse</option><option>Friend</option><option>Relative</option><option>Other</option></select>
      </Field>
      <Field label="Phone" required><input type="tel" placeholder="(000) 000-0000" style={inputStyle} /></Field>
    </div>
  </>,

  // 5 — Documents
  <>
    <Divider label="Identification" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      <UploadBox label="Resume" hint="PDF or Word · max 5MB" required />
      <UploadBox label="Driver's license — front" hint="JPG, PNG or PDF" required />
      <UploadBox label="Driver's license — back" hint="JPG, PNG or PDF" required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="Driver's license expiration date" required><input type="date" style={inputStyle} /></Field>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      <UploadBox label="SSN card" hint="Stored encrypted · HIPAA protected" required />
      <UploadBox label="EAD / Green card — front" hint="If applicable" optional />
      <UploadBox label="EAD / Green card — back" hint="If applicable" optional />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
      <Field label="EAD / Green card expiration date" hint="Leave blank if not applicable"><input type="date" style={inputStyle} /></Field>
    </div>
    <Divider label="Certifications" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      <UploadBox label="CPR / First Aid / BLS certificate" hint="PDF or image" required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="CPR / BLS expiration date" required><input type="date" style={inputStyle} /></Field>
    </div>
  </>,

  // 6 — Signature
  <>
    <div style={{ background: 'rgba(13,45,94,0.04)', border: '1px solid rgba(13,45,94,0.12)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#374151', lineHeight: 1.7, marginBottom: 20 }}>
      By signing below you certify that all information provided in this application is true and complete. Any false information or omission may disqualify you from further consideration and may result in dismissal if discovered after employment.
    </div>
    <Divider label="Applicant signature" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Full legal name" required><input type="text" placeholder="Type your full name" style={inputStyle} /></Field>
      <Field label="Date" required><input type="date" style={inputStyle} /></Field>
    </div>
    <div>
      <div style={fieldLabel}>Signature{req}</div>
      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', cursor: 'pointer' }}>
        <span style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-writing" /> Click to sign</span>
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 4, display: 'block' }}>Use your mouse or touchscreen to draw your signature</span>
    </div>
  </>,
]

export default function ApplicationPage() {
  const [step, setStep] = useState(0)
  const total = STEPS.length
  const pct = Math.round(((step + 1) / total) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f5f7' }}>
      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>DSP job application</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>Save draft</button>
        <button style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-download" /> Download PDF
        </button>
        {step === total - 1 && (
          <button style={{ fontSize: 12, padding: '6px 16px', borderRadius: 8, border: 'none', background: '#0d2d5e', color: 'white', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            Submit application
          </button>
        )}
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* Step progress card */}
        <div style={{ ...sectionStyle, marginBottom: 16 }}>
          <div style={sectionHead}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Step {step + 1} of {total} — {STEPS[step].label}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{pct}% complete</span>
          </div>
          <div style={{ background: 'white', padding: '16px 20px' }}>
            {/* Progress bar */}
            <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, marginBottom: 14, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#0d2d5e', borderRadius: 3, width: `${pct}%`, transition: 'width 0.35s' }} />
            </div>
            {/* Step pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s',
                    background: i < step ? 'rgba(48,176,96,0.12)' : i === step ? '#0d2d5e' : '#f3f4f6',
                    color: i < step ? '#187a40' : i === step ? 'white' : '#6b7280',
                  }}
                >
                  {i < step ? <><i className="ti ti-check" style={{ fontSize: 11, marginRight: 4 }} /></> : `${i + 1}. `}{s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Step content */}
        <div style={sectionStyle}>
          <div style={sectionHead}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{STEPS[step].label}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{STEPS[step].sub}</div>
            </div>
          </div>
          <div style={sectionBody}>
            {STEP_CONTENT[step]}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Step {step + 1} of {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} style={{ fontSize: 13, padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', fontWeight: 500 }}>
                <i className="ti ti-arrow-left" /> Previous
              </button>
            )}
            {step < total - 1 && (
              <button onClick={() => setStep(s => s + 1)} style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#0d2d5e', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                Next <i className="ti ti-arrow-right" />
              </button>
            )}
            {step === total - 1 && (
              <button style={{ fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#2d7d4e', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                Submit application <i className="ti ti-send" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
