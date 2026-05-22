'use client'

import { useState } from 'react'

const STEP_META = [
  { label: 'Personal info', sub: 'Name, address, contact' },
  { label: 'Availability', sub: 'Schedule & position' },
  { label: 'Eligibility', sub: 'Work authorization' },
  { label: 'Education', sub: 'School & work history' },
  { label: 'Emergency contact', sub: 'Emergency details' },
  { label: 'Documents', sub: 'Uploads & certs' },
  { label: 'Signature', sub: 'Review & sign' },
]

const PROG = ['14%', '28%', '42%', '57%', '71%', '85%', '100%']
const DAYS_AVAIL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHIFTS = ['7AM – 3PM', '3PM – 11PM', '11PM – 7AM']

const fi: React.CSSProperties = { fontSize: 13, color: '#111', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' as const }
const fLabel: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }
const req = <span style={{ color: '#e24b4a', marginLeft: 2 }}>*</span>

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={fLabel}>{label}{required && req}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</span>}
    </div>
  )
}

function UploadBox({ label, hint, required, optional }: { label: string; hint: string; required?: boolean; optional?: boolean }) {
  return (
    <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: '#f9fafb' }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#008080', flexShrink: 0 }}>
        <i className="ti ti-upload" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{label}{required && <span style={{ color: '#e24b4a' }}> *</span>}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{hint}</div>
      </div>
      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: optional ? '#f3f4f6' : 'rgba(186,117,23,0.1)', color: optional ? '#6b7280' : '#BA7517' }}>
        {optional ? 'Optional' : 'Required'}
      </span>
    </div>
  )
}

function RadioGroup({ name, options }: { name: string; options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111', cursor: 'pointer', padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}>
          <input type="radio" name={name} style={{ accentColor: '#008080' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function CheckGroup({ options }: { options: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111', cursor: 'pointer', padding: '5px 10px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff' }}>
          <input type="checkbox" style={{ accentColor: '#008080' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 6 }}>{label}</div>
      <div style={{ height: '0.5px', background: '#e5e7eb' }} />
    </div>
  )
}

const STEPS: React.ReactNode[] = [
  // 0 — Personal info
  <div key="0">
    <div style={{ background: 'rgba(0,128,128,0.05)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
      Reliance Care Services is an equal opportunity employer. Applicants are considered without regard to race, age, sex, gender identity, marital status, family status, political or religious conviction, impairment, or pregnancy.
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="First name" required><input type="text" placeholder="First name" style={fi} /></Field>
      <Field label="Middle name"><input type="text" placeholder="Middle name" style={fi} /></Field>
      <Field label="Last name" required><input type="text" placeholder="Last name" style={fi} /></Field>
    </div>
    <SectionTitle label="Address" />
    <div style={{ marginBottom: 12 }}><Field label="Address line 1"><input type="text" placeholder="Street address" style={fi} /></Field></div>
    <div style={{ marginBottom: 12 }}><Field label="Address line 2"><input type="text" placeholder="Apt, suite, unit (optional)" style={fi} /></Field></div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="City"><input type="text" placeholder="City" style={fi} /></Field>
      <Field label="State"><input type="text" placeholder="State" style={fi} /></Field>
      <Field label="Zip code"><input type="text" placeholder="Zip" style={fi} /></Field>
    </div>
    <SectionTitle label="Contact" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Phone" required><input type="tel" placeholder="(000) 000-0000" style={fi} /></Field>
      <Field label="Email address" required><input type="email" placeholder="email@example.com" style={fi} /></Field>
      <Field label="Date of birth" required hint="Stored encrypted · HIPAA protected"><input type="date" style={fi} /></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Social security number" required hint="AES-256 encrypted · never stored in plain text">
        <input type="password" placeholder="XXX-XX-XXXX" style={fi} />
      </Field>
    </div>
  </div>,

  // 1 — Availability
  <div key="1">
    <SectionTitle label="Allergies & availability" />
    <div style={{ marginBottom: 16 }}>
      <div style={fLabel}>Are you allergic to any of the following?{req}</div>
      <CheckGroup options={['Pets', 'Smoke', 'None']} />
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={fLabel}>Are you able to work holidays?</div>
      <RadioGroup name="hol" options={['Yes', 'No']} />
    </div>
    <div style={{ marginBottom: 16 }}>
      <div style={fLabel}>Days available{req}</div>
      <CheckGroup options={DAYS_AVAIL} />
    </div>
    <div style={{ marginBottom: 20 }}>
      <div style={fLabel}>Preferred shift{req}</div>
      <CheckGroup options={SHIFTS} />
    </div>
    <SectionTitle label="Position details" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Date available to start"><input type="date" style={fi} /></Field>
      <Field label="How did you hear about us?"><select style={fi}><option>Select...</option><option>Referral</option><option>Internet</option></select></Field>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="Position applying for"><select style={fi}><option>DSP</option></select></Field>
      <div>
        <div style={fLabel}>Type of assignment</div>
        <CheckGroup options={['Part time', 'Full time', 'Live-in']} />
      </div>
    </div>
  </div>,

  // 2 — Eligibility
  <div key="2">
    {[
      { q: 'Are you a citizen of the United States?', name: 'cit' },
      { q: 'Are you authorized to work in the U.S.?', name: 'auth' },
      { q: 'Have you ever worked for this company?', name: 'prev' },
      { q: 'Do you authorize RCS to conduct a criminal background check?', name: 'bg' },
      { q: 'Do you have malpractice insurance?', name: 'mal' },
    ].map(({ q, name }) => (
      <div key={name} style={{ marginBottom: 16 }}>
        <div style={fLabel}>{q}{req}</div>
        <RadioGroup name={name} options={['Yes', 'No']} />
      </div>
    ))}
    <div style={{ marginBottom: 14 }}><Field label="If yes, when?"><input type="date" style={{ ...fi, maxWidth: 200 }} /></Field></div>
    <div style={{ marginBottom: 14 }}><Field label="Please explain (if applicable)"><textarea placeholder="Provide any relevant details..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field></div>
    <Field label="If yes, name and address of carrier" required><textarea placeholder="Insurance carrier name and address..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
  </div>,

  // 3 — Education
  <div key="3">
    <SectionTitle label="Education history" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="School name" required><input type="text" placeholder="School name" style={fi} /></Field>
        <Field label="From" required><input type="date" style={fi} /></Field>
        <Field label="To" required><input type="date" style={fi} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[{ lbl: 'Did you graduate?', name: 'grad' }, { lbl: 'Diploma / GED', name: 'ged' }, { lbl: 'Degree', name: 'deg' }].map(f => (
          <div key={f.name}><div style={fLabel}>{f.lbl}</div><RadioGroup name={f.name} options={['Yes', 'No']} /></div>
        ))}
      </div>
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit', marginBottom: 20 }}>
      <i className="ti ti-plus" /> Add another school
    </button>
    <SectionTitle label="Employment history" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="Company name" required><input type="text" placeholder="Company" style={fi} /></Field>
        <Field label="Job title"><input type="text" placeholder="Title" style={fi} /></Field>
        <Field label="Supervisor"><input type="text" placeholder="Supervisor name" style={fi} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
        <Field label="Responsibilities" required><textarea placeholder="Key responsibilities..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
        <Field label="Reason for leaving"><textarea placeholder="Reason for leaving..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
      </div>
      <div style={fLabel}>May we contact your previous supervisor?</div>
      <RadioGroup name="contact0" options={['Yes', 'No']} />
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit', marginBottom: 20 }}>
      <i className="ti ti-plus" /> Add another employer
    </button>
    <SectionTitle label="References" />
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fff' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Reference name" required><input type="text" placeholder="Full name" style={fi} /></Field>
        <Field label="Years acquainted" required><input type="text" placeholder="e.g. 3 years" style={fi} /></Field>
      </div>
    </div>
    <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit' }}>
      <i className="ti ti-plus" /> Add another reference
    </button>
  </div>,

  // 4 — Emergency contact
  <div key="4">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
      <Field label="Emergency contact name" required><input type="text" placeholder="Full name" style={fi} /></Field>
      <Field label="Relationship" required>
        <select style={fi}><option value="">Select...</option><option>Spouse</option><option>Friend</option><option>Relative</option><option>Other</option></select>
      </Field>
      <Field label="Phone" required><input type="tel" placeholder="(000) 000-0000" style={fi} /></Field>
    </div>
  </div>,

  // 5 — Documents
  <div key="5">
    <SectionTitle label="Identification" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      <UploadBox label="Resume" hint="PDF or Word · max 5MB" required />
      <UploadBox label="Driver's license — front" hint="JPG, PNG or PDF" required />
      <UploadBox label="Driver's license — back" hint="JPG, PNG or PDF" required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
      <Field label="Driver's license expiration date" required><input type="date" style={fi} /></Field>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      <UploadBox label="SSN card" hint="Stored encrypted · HIPAA protected" required />
      <UploadBox label="EAD / Green card — front" hint="If applicable" optional />
      <UploadBox label="EAD / Green card — back" hint="If applicable" optional />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
      <Field label="EAD / Green card expiration date" hint="Leave blank if not applicable"><input type="date" style={fi} /></Field>
    </div>
    <SectionTitle label="Certifications" />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
      <UploadBox label="CPR / First Aid / BLS certificate" hint="PDF or image" required />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <Field label="CPR / BLS expiration date" required><input type="date" style={fi} /></Field>
    </div>
  </div>,

  // 6 — Signature
  <div key="6">
    <div style={{ background: 'rgba(0,128,128,0.05)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
      By signing below you certify that all information provided in this application is true and complete. Any false information or omission may disqualify you from further consideration and may result in dismissal if discovered after employment.
    </div>
    <SectionTitle label="Applicant signature" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
      <Field label="Full legal name" required><input type="text" placeholder="Type your full name" style={fi} /></Field>
      <Field label="Date" required><input type="date" style={fi} /></Field>
    </div>
    <div>
      <label style={fLabel}>Signature{req}</label>
      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', cursor: 'pointer' }}>
        <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-writing" /> Click to sign</span>
      </div>
      <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>Use your mouse or touchscreen to draw your signature</span>
    </div>
  </div>,
]

export default function ApplicationPage() {
  const [step, setStep] = useState(0)
  const total = STEP_META.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#008080', cursor: 'pointer', padding: '6px 10px', borderRadius: 6 }}>
          <i className="ti ti-arrow-left" /> Back
        </div>
        <div style={{ width: '0.5px', height: 16, background: '#e5e7eb' }} />
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>DSP job application</span>
        <div style={{ flex: 1 }} />
        <button style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>Save draft</button>
        <button style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #008080', background: 'transparent', color: '#008080', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-download" /> Download PDF
        </button>
        {step === total - 1 && (
          <button style={{ fontSize: 12, padding: '6px 16px', borderRadius: 6, border: 'none', background: '#004050', color: 'white', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
            Submit application
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Steps sidebar */}
        <div style={{ width: 210, minWidth: 210, background: '#fff', borderRight: '0.5px solid #e5e7eb', padding: '20px 0', overflowY: 'auto', flexShrink: 0 }}>
          {STEP_META.map((s, i) => (
            <div key={i}>
              <div onClick={() => setStep(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', cursor: 'pointer', background: i === step ? 'rgba(0,128,128,0.06)' : 'transparent' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                  background: i < step ? '#30B060' : i === step ? '#004050' : '#f3f4f6',
                  color: i < step || i === step ? 'white' : '#9ca3af',
                  border: i > step ? '0.5px solid #e5e7eb' : 'none',
                }}>
                  {i < step ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: i === step ? '#111' : '#6b7280' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{s.sub}</div>
                </div>
              </div>
              {i < total - 1 && <div style={{ width: 1, height: 10, background: '#e5e7eb', margin: '0 0 0 27px' }} />}
            </div>
          ))}
        </div>

        {/* Form area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: '#f3f4f6', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#008080', borderRadius: 2, width: PROG[step], transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 2 }}>{STEP_META[step].label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>{STEP_META[step].sub}</div>
            {STEPS[step]}
          </div>

          {/* Footer nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderTop: '0.5px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Step {step + 1} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button onClick={() => setStep(s => s - 1)} style={{ fontSize: 13, padding: '7px 16px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  <i className="ti ti-arrow-left" /> Previous
                </button>
              )}
              {step < total - 1 ? (
                <button onClick={() => setStep(s => s + 1)} style={{ fontSize: 13, padding: '7px 18px', borderRadius: 6, border: 'none', background: '#004050', color: 'white', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  Next <i className="ti ti-arrow-right" />
                </button>
              ) : (
                <button style={{ fontSize: 13, padding: '7px 18px', borderRadius: 6, border: 'none', background: '#004050', color: 'white', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
                  Submit application <i className="ti ti-send" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
