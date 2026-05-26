'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ─────────────────────────────────────────────────────────────────────

type SchoolEntry    = { name: string; from: string; to: string; graduated: string; diploma: string; degree: string }
type EmployerEntry  = { company: string; title: string; supervisor: string; responsibilities: string; reasonLeaving: string; canContact: string }
type RefEntry       = { name: string; years: string }

export interface AppFormState {
  firstName: string; middleName: string; lastName: string
  address1: string; address2: string; city: string; state: string; zip: string
  phone: string; email: string; dob: string; ssnProvided: boolean
  allergies: string[]; canWorkHolidays: string
  daysAvailable: string[]; preferredShifts: string[]
  dateAvailable: string; heardAbout: string; positionApplying: string; assignmentType: string[]
  isCitizen: string; isAuthorizedWork: string
  workedBefore: string; workedBeforeWhen: string
  bgCheck: string; bgCheckExplain: string
  malpractice: string; malpracticeCarrier: string
  schools: SchoolEntry[]
  employers: EmployerEntry[]
  references: RefEntry[]
  emergencyName: string; emergencyRelationship: string; emergencyPhone: string
  docResume: string; docDLFront: string; dlExpiry: string
  docDLBack: string; docSSN: string
  docEADFront: string; eadExpiry: string; docEADBack: string
  docCPR: string; cprExpiry: string
  signatureName: string; signatureDate: string
}

const BLANK_SCHOOL:    SchoolEntry   = { name: '', from: '', to: '', graduated: '', diploma: '', degree: '' }
const BLANK_EMPLOYER:  EmployerEntry = { company: '', title: '', supervisor: '', responsibilities: '', reasonLeaving: '', canContact: '' }
const BLANK_REF:       RefEntry      = { name: '', years: '' }

const INIT_FORM: AppFormState = {
  firstName: '', middleName: '', lastName: '',
  address1: '', address2: '', city: '', state: '', zip: '',
  phone: '', email: '', dob: '', ssnProvided: false,
  allergies: [], canWorkHolidays: '',
  daysAvailable: [], preferredShifts: [],
  dateAvailable: '', heardAbout: '', positionApplying: 'DSP', assignmentType: [],
  isCitizen: '', isAuthorizedWork: '',
  workedBefore: '', workedBeforeWhen: '',
  bgCheck: '', bgCheckExplain: '',
  malpractice: '', malpracticeCarrier: '',
  schools: [{ ...BLANK_SCHOOL }],
  employers: [{ ...BLANK_EMPLOYER }],
  references: [{ ...BLANK_REF }],
  emergencyName: '', emergencyRelationship: '', emergencyPhone: '',
  docResume: '', docDLFront: '', dlExpiry: '',
  docDLBack: '', docSSN: '',
  docEADFront: '', eadExpiry: '', docEADBack: '',
  docCPR: '', cprExpiry: '',
  signatureName: '', signatureDate: '',
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_META = [
  { label: 'Personal info',     sub: 'Name, address, contact' },
  { label: 'Availability',      sub: 'Schedule & position'    },
  { label: 'Eligibility',       sub: 'Work authorization'     },
  { label: 'Education',         sub: 'School & work history'  },
  { label: 'Emergency contact', sub: 'Emergency details'      },
  { label: 'Documents',         sub: 'Uploads & certs'        },
  { label: 'Signature',         sub: 'Review & sign'          },
]
const PROG      = ['14%', '28%', '42%', '57%', '71%', '85%', '100%']
const DAYS_AVAIL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SHIFTS    = ['7AM – 3PM', '3PM – 11PM', '11PM – 7AM']

// ── Styles ────────────────────────────────────────────────────────────────────

const fi: React.CSSProperties = {
  fontSize: 13, color: '#111', background: '#fff', border: '1px solid #d1d5db',
  borderRadius: 8, padding: '10px 12px', outline: 'none', width: '100%',
  fontFamily: 'inherit', boxSizing: 'border-box' as const,
}
const fLabel: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }
const req = <span style={{ color: '#e24b4a', marginLeft: 2 }}>*</span>

// ── Helper components ─────────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={fLabel}>{label}{required && req}</label>
      {children}
      {hint && <span style={{ fontSize: 11, color: '#9ca3af' }}>{hint}</span>}
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

function RadioGroup({ name, options, value, onChange }: {
  name: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111',
          cursor: 'pointer', padding: '5px 10px',
          border: `1px solid ${value === v ? '#008080' : '#d1d5db'}`, borderRadius: 6,
          background: value === v ? 'rgba(0,128,128,0.06)' : '#fff',
        }}>
          <input type="radio" name={name} checked={value === v} onChange={() => onChange(v)} style={{ accentColor: '#008080' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function CheckGroup({ options, value, onChange }: {
  options: string[]; value: string[]; onChange: (v: string[]) => void
}) {
  const toggle = (opt: string) =>
    value.includes(opt) ? onChange(value.filter(x => x !== opt)) : onChange([...value, opt])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map(v => (
        <label key={v} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#111',
          cursor: 'pointer', padding: '5px 10px',
          border: `1px solid ${value.includes(v) ? '#008080' : '#d1d5db'}`, borderRadius: 6,
          background: value.includes(v) ? 'rgba(0,128,128,0.06)' : '#fff',
        }}>
          <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} style={{ accentColor: '#008080' }} /> {v}
        </label>
      ))}
    </div>
  )
}

function SSNInput({ onProvided }: { onProvided: (v: boolean) => void }) {
  const [val, setVal] = useState('')
  return (
    <input
      type="password" inputMode="numeric" placeholder="9-digit SSN"
      value={val} maxLength={9}
      onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 9); setVal(v); onProvided(v.length === 9) }}
      style={fi}
    />
  )
}

type UploadStatus  = 'idle' | 'uploading' | 'done' | 'error'
type ExtractStatus = 'idle' | 'extracting' | 'done' | 'error'

function DocUpload({
  label, hint, required, optional,
  extractExpiry, expiryLabel, expiryValue,
  docKey,
  onUploaded, onExpiryChange,
}: {
  label: string; hint: string; required?: boolean; optional?: boolean
  extractExpiry?: boolean; expiryLabel?: string; expiryValue?: string
  docKey: string
  onUploaded: (path: string) => void
  onExpiryChange?: (date: string) => void
}) {
  const ref       = useRef<HTMLInputElement>(null)
  const [file,    setFile]    = useState<File | null>(null)
  const [upSt,    setUpSt]    = useState<UploadStatus>('idle')
  const [exSt,    setExSt]    = useState<ExtractStatus>('idle')

  async function handleFile(f: File) {
    setFile(f)
    setUpSt('uploading')
    setExSt('idle')

    const fd = new FormData()
    fd.append('file', f)
    fd.append('docKey', docKey)

    try {
      const res  = await fetch('/api/upload-document', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setUpSt('error'); return }
      setUpSt('done')
      onUploaded(json.path)
    } catch {
      setUpSt('error')
      return
    }

    if (extractExpiry) {
      setExSt('extracting')
      try {
        const ef = new FormData(); ef.append('file', f)
        const res  = await fetch('/api/extract-expiry', { method: 'POST', body: ef })
        const json = await res.json()
        if (json.date) { setExSt('done'); onExpiryChange?.(json.date) }
        else setExSt('error')
      } catch { setExSt('error') }
    }
  }

  const busy = upSt === 'uploading'

  return (
    <div>
      <div
        onClick={() => !busy && ref.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && !busy) handleFile(f) }}
        style={{
          border: `1px dashed ${upSt === 'done' ? '#008080' : upSt === 'error' ? '#ef4444' : '#d1d5db'}`,
          borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center',
          gap: 12, cursor: busy ? 'default' : 'pointer',
          background: upSt === 'done' ? 'rgba(0,128,128,0.03)' : '#f9fafb', transition: 'all 0.15s',
        }}
      >
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#008080', flexShrink: 0 }}>
          {busy
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
            : <i className={`ti ${upSt === 'done' ? 'ti-file-check' : 'ti-upload'}`} />
          }
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {file ? file.name : label}{required && !optional && <span style={{ color: '#e24b4a' }}> *</span>}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
            {busy ? 'Uploading…' : file ? `${(file.size / 1024).toFixed(0)} KB · click to replace` : hint}
          </div>
        </div>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500, flexShrink: 0,
          background: upSt === 'done' ? 'rgba(0,128,128,0.12)' : optional ? '#f3f4f6' : 'rgba(186,117,23,0.1)',
          color: upSt === 'done' ? '#008080' : optional ? '#6b7280' : '#BA7517' }}>
          {upSt === 'done' ? 'Uploaded' : busy ? '…' : optional ? 'Optional' : 'Required'}
        </span>
      </div>
      {upSt === 'error' && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Upload failed — please try again.</div>}

      {extractExpiry && file && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>{expiryLabel ?? 'Expiration date'}</label>
          {exSt === 'extracting' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}><path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
              Extracting…
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="date" value={expiryValue ?? ''} onChange={e => onExpiryChange?.(e.target.value)} style={{ ...fi, width: 'auto', minWidth: 160 }} />
              {exSt === 'done'  && <span style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-sparkles" style={{ fontSize: 12 }} /> Auto-filled</span>}
              {exSt === 'error' && <span style={{ fontSize: 11, color: '#9ca3af' }}>Enter manually</span>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ApplicationPage() {
  const supabase   = createClient()
  const total      = STEP_META.length
  const [step,     setStep]      = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast,    setToast]     = useState<string | null>(null)
  const [userId,   setUserId]    = useState<string | null>(null) // used for submit only
  const [form,     setForm]      = useState<AppFormState>(INIT_FORM)

  const sf = <K extends keyof AppFormState>(k: K, v: AppFormState[K]) =>
    setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      setForm(p => ({ ...p, email: user.email ?? '' }))

      const { data } = await supabase.from('billing_staff_data').select('data').eq('staff_id', user.id).maybeSingle()
      const saved = data?.data as Record<string, unknown> | null
      if (saved?.application_submitted === 'true') {
        setSubmitted(true)
        if (saved.form) setForm(p => ({ ...p, ...(saved.form as Partial<AppFormState>) }))
      }
    }
    init()
  }, [])

  async function handleSubmit() {
    if (!userId) return
    setSubmitting(true)
    const { data: existing } = await supabase.from('billing_staff_data').select('data').eq('staff_id', userId).maybeSingle()
    const merged = {
      ...((existing?.data as Record<string, unknown>) ?? {}),
      application_submitted: 'true',
      application_submitted_at: new Date().toISOString(),
      application_status: 'pending',
      form,
    }
    const { error } = await supabase.from('billing_staff_data').upsert({ staff_id: userId, data: merged })
    if (error) { setToast('Error submitting. Please try again.'); setTimeout(() => setToast(null), 3500) }
    else setSubmitted(true)
    setSubmitting(false)
  }

  // ── Step renderers ──────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      // 0 — Personal info
      case 0: return (
        <div>
          <div style={{ background: 'rgba(0,128,128,0.05)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
            Reliance Care Services is an equal opportunity employer. Applicants are considered without regard to race, age, sex, gender identity, marital status, family status, political or religious conviction, impairment, or pregnancy.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Field label="First name" required><input value={form.firstName} onChange={e => sf('firstName', e.target.value)} type="text" placeholder="First name" style={fi} /></Field>
            <Field label="Middle name"><input value={form.middleName} onChange={e => sf('middleName', e.target.value)} type="text" placeholder="Middle name" style={fi} /></Field>
            <Field label="Last name" required><input value={form.lastName} onChange={e => sf('lastName', e.target.value)} type="text" placeholder="Last name" style={fi} /></Field>
          </div>
          <SectionTitle label="Address" />
          <div style={{ marginBottom: 12 }}><Field label="Address line 1"><input value={form.address1} onChange={e => sf('address1', e.target.value)} type="text" placeholder="Street address" style={fi} /></Field></div>
          <div style={{ marginBottom: 12 }}><Field label="Address line 2"><input value={form.address2} onChange={e => sf('address2', e.target.value)} type="text" placeholder="Apt, suite, unit (optional)" style={fi} /></Field></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <Field label="City"><input value={form.city} onChange={e => sf('city', e.target.value)} type="text" placeholder="City" style={fi} /></Field>
            <Field label="State"><input value={form.state} onChange={e => sf('state', e.target.value)} type="text" placeholder="State" style={fi} /></Field>
            <Field label="Zip code"><input value={form.zip} onChange={e => sf('zip', e.target.value)} type="text" placeholder="Zip" style={fi} /></Field>
          </div>
          <SectionTitle label="Contact" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Phone" required><input value={form.phone} onChange={e => sf('phone', e.target.value)} type="tel" placeholder="(000) 000-0000" style={fi} /></Field>
            <Field label="Email address" required><input value={form.email} onChange={e => sf('email', e.target.value)} type="email" placeholder="email@example.com" style={fi} /></Field>
            <Field label="Date of birth" required hint="Stored encrypted · HIPAA protected"><input value={form.dob} onChange={e => sf('dob', e.target.value)} type="date" style={fi} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Social security number" required hint="9 digits · never stored in plain text — only a confirmation flag is saved">
              <SSNInput onProvided={v => sf('ssnProvided', v)} />
            </Field>
          </div>
        </div>
      )

      // 1 — Availability
      case 1: return (
        <div>
          <SectionTitle label="Allergies & availability" />
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Are you allergic to any of the following?{req}</div>
            <CheckGroup options={['Pets', 'Smoke', 'None']} value={form.allergies} onChange={v => sf('allergies', v)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Are you able to work holidays?</div>
            <RadioGroup name="hol" options={['Yes', 'No']} value={form.canWorkHolidays} onChange={v => sf('canWorkHolidays', v)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Days available{req}</div>
            <CheckGroup options={DAYS_AVAIL} value={form.daysAvailable} onChange={v => sf('daysAvailable', v)} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={fLabel}>Preferred shift{req}</div>
            <CheckGroup options={SHIFTS} value={form.preferredShifts} onChange={v => sf('preferredShifts', v)} />
          </div>
          <SectionTitle label="Position details" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Date available to start"><input value={form.dateAvailable} onChange={e => sf('dateAvailable', e.target.value)} type="date" style={fi} /></Field>
            <Field label="How did you hear about us?">
              <select value={form.heardAbout} onChange={e => sf('heardAbout', e.target.value)} style={fi}>
                <option value="">Select...</option>
                <option>Referral</option><option>Internet</option><option>Social media</option><option>Job board</option><option>Other</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Position applying for">
              <select value={form.positionApplying} onChange={e => sf('positionApplying', e.target.value)} style={fi}><option>DSP</option></select>
            </Field>
            <div>
              <div style={fLabel}>Type of assignment</div>
              <CheckGroup options={['Part time', 'Full time', 'Live-in']} value={form.assignmentType} onChange={v => sf('assignmentType', v)} />
            </div>
          </div>
        </div>
      )

      // 2 — Eligibility
      case 2: return (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Are you a citizen of the United States?{req}</div>
            <RadioGroup name="cit" options={['Yes', 'No']} value={form.isCitizen} onChange={v => sf('isCitizen', v)} />
          </div>
          {form.isCitizen === 'No' && (
            <div style={{ marginBottom: 16, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(0,128,128,0.3)' }}>
              <div style={fLabel}>Are you authorized to work in the U.S.?{req}</div>
              <RadioGroup name="auth" options={['Yes', 'No']} value={form.isAuthorizedWork} onChange={v => sf('isAuthorizedWork', v)} />
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Have you ever worked for this company?{req}</div>
            <RadioGroup name="prev" options={['Yes', 'No']} value={form.workedBefore} onChange={v => sf('workedBefore', v)} />
          </div>
          {form.workedBefore === 'Yes' && (
            <div style={{ marginBottom: 16, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(0,128,128,0.3)' }}>
              <Field label="If yes, when?"><input value={form.workedBeforeWhen} onChange={e => sf('workedBeforeWhen', e.target.value)} type="date" style={{ ...fi, maxWidth: 200 }} /></Field>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Do you authorize RCS to conduct a criminal background check?{req}</div>
            <RadioGroup name="bg" options={['Yes', 'No']} value={form.bgCheck} onChange={v => sf('bgCheck', v)} />
          </div>
          {form.bgCheck === 'No' && (
            <div style={{ marginBottom: 16, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(0,128,128,0.3)' }}>
              <Field label="Please explain (if applicable)">
                <textarea value={form.bgCheckExplain} onChange={e => sf('bgCheckExplain', e.target.value)} placeholder="Provide any relevant details..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} />
              </Field>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={fLabel}>Do you have malpractice insurance?{req}</div>
            <RadioGroup name="mal" options={['Yes', 'No']} value={form.malpractice} onChange={v => sf('malpractice', v)} />
          </div>
          {form.malpractice === 'Yes' && (
            <div style={{ marginBottom: 16, marginLeft: 16, paddingLeft: 12, borderLeft: '2px solid rgba(0,128,128,0.3)' }}>
              <Field label="If yes, name and address of carrier">
                <textarea value={form.malpracticeCarrier} onChange={e => sf('malpracticeCarrier', e.target.value)} placeholder="Insurance carrier name and address..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} />
              </Field>
            </div>
          )}
        </div>
      )

      // 3 — Education
      case 3: return (
        <div>
          <SectionTitle label="Education history" />
          {form.schools.map((s, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 10, background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
                <Field label="School name" required><input value={s.name} onChange={e => { const a = [...form.schools]; a[i] = { ...a[i], name: e.target.value }; sf('schools', a) }} type="text" placeholder="School name" style={fi} /></Field>
                <Field label="From" required><input value={s.from} onChange={e => { const a = [...form.schools]; a[i] = { ...a[i], from: e.target.value }; sf('schools', a) }} type="date" style={fi} /></Field>
                <Field label="To" required><input value={s.to} onChange={e => { const a = [...form.schools]; a[i] = { ...a[i], to: e.target.value }; sf('schools', a) }} type="date" style={fi} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                {(['graduated', 'diploma', 'degree'] as const).map(f => (
                  <div key={f}><div style={fLabel}>{f === 'graduated' ? 'Did you graduate?' : f === 'diploma' ? 'Diploma / GED' : 'Degree'}</div>
                    <RadioGroup name={`${f}${i}`} options={['Yes', 'No']} value={s[f]} onChange={v => { const a = [...form.schools]; a[i] = { ...a[i], [f]: v }; sf('schools', a) }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => sf('schools', [...form.schools, { ...BLANK_SCHOOL }])} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit', marginBottom: 20 }}>
            <i className="ti ti-plus" /> Add another school
          </button>

          <SectionTitle label="Employment history" />
          {form.employers.map((e, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 10, background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 12 }}>
                <Field label="Company name" required><input value={e.company} onChange={ev => { const a = [...form.employers]; a[i] = { ...a[i], company: ev.target.value }; sf('employers', a) }} type="text" placeholder="Company" style={fi} /></Field>
                <Field label="Job title"><input value={e.title} onChange={ev => { const a = [...form.employers]; a[i] = { ...a[i], title: ev.target.value }; sf('employers', a) }} type="text" placeholder="Title" style={fi} /></Field>
                <Field label="Supervisor"><input value={e.supervisor} onChange={ev => { const a = [...form.employers]; a[i] = { ...a[i], supervisor: ev.target.value }; sf('employers', a) }} type="text" placeholder="Supervisor name" style={fi} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                <Field label="Responsibilities" required><textarea value={e.responsibilities} onChange={ev => { const a = [...form.employers]; a[i] = { ...a[i], responsibilities: ev.target.value }; sf('employers', a) }} placeholder="Key responsibilities..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
                <Field label="Reason for leaving"><textarea value={e.reasonLeaving} onChange={ev => { const a = [...form.employers]; a[i] = { ...a[i], reasonLeaving: ev.target.value }; sf('employers', a) }} placeholder="Reason for leaving..." style={{ ...fi, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }} /></Field>
              </div>
              <div style={fLabel}>May we contact your previous supervisor?</div>
              <RadioGroup name={`contact${i}`} options={['Yes', 'No']} value={e.canContact} onChange={v => { const a = [...form.employers]; a[i] = { ...a[i], canContact: v }; sf('employers', a) }} />
            </div>
          ))}
          <button onClick={() => sf('employers', [...form.employers, { ...BLANK_EMPLOYER }])} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit', marginBottom: 20 }}>
            <i className="ti ti-plus" /> Add another employer
          </button>

          <SectionTitle label="References" />
          {form.references.map((r, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 16, marginBottom: 10, background: '#fff' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Reference name" required><input value={r.name} onChange={e => { const a = [...form.references]; a[i] = { ...a[i], name: e.target.value }; sf('references', a) }} type="text" placeholder="Full name" style={fi} /></Field>
                <Field label="Years acquainted" required><input value={r.years} onChange={e => { const a = [...form.references]; a[i] = { ...a[i], years: e.target.value }; sf('references', a) }} type="text" placeholder="e.g. 3 years" style={fi} /></Field>
              </div>
            </div>
          ))}
          <button onClick={() => sf('references', [...form.references, { ...BLANK_REF }])} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#008080', cursor: 'pointer', padding: '8px 12px', border: '1px dashed rgba(0,128,128,0.4)', borderRadius: 6, background: 'rgba(0,128,128,0.04)', width: '100%', justifyContent: 'center', fontWeight: 500, fontFamily: 'inherit' }}>
            <i className="ti ti-plus" /> Add another reference
          </button>
        </div>
      )

      // 4 — Emergency contact
      case 4: return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <Field label="Emergency contact name" required><input value={form.emergencyName} onChange={e => sf('emergencyName', e.target.value)} type="text" placeholder="Full name" style={fi} /></Field>
          <Field label="Relationship" required>
            <select value={form.emergencyRelationship} onChange={e => sf('emergencyRelationship', e.target.value)} style={fi}>
              <option value="">Select...</option>
              <option>Spouse</option><option>Parent</option><option>Sibling</option><option>Friend</option><option>Relative</option><option>Other</option>
            </select>
          </Field>
          <Field label="Phone" required><input value={form.emergencyPhone} onChange={e => sf('emergencyPhone', e.target.value)} type="tel" placeholder="(000) 000-0000" style={fi} /></Field>
        </div>
      )

      // 5 — Documents
      case 5: return (
        <div>
          <SectionTitle label="Identification" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <DocUpload label="Resume" hint="PDF or Word · max 5MB" required docKey="resume"
              onUploaded={p => sf('docResume', p)} />
            <DocUpload label="Driver's license — front" hint="JPG, PNG or PDF · expiry extracted automatically" required
              docKey="dl-front" extractExpiry expiryLabel="DL expiration date" expiryValue={form.dlExpiry}
              onUploaded={p => sf('docDLFront', p)} onExpiryChange={v => sf('dlExpiry', v)} />
            <DocUpload label="Driver's license — back" hint="JPG, PNG or PDF" required
              docKey="dl-back" onUploaded={p => sf('docDLBack', p)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <DocUpload label="SSN card" hint="Stored encrypted · HIPAA protected" required
              docKey="ssn" onUploaded={p => sf('docSSN', p)} />
            <DocUpload label="EAD / Green card — front" hint="If applicable · expiry extracted automatically" optional
              docKey="ead-front" extractExpiry expiryLabel="EAD / Green card expiration date" expiryValue={form.eadExpiry}
              onUploaded={p => sf('docEADFront', p)} onExpiryChange={v => sf('eadExpiry', v)} />
            <DocUpload label="EAD / Green card — back" hint="If applicable" optional
              docKey="ead-back" onUploaded={p => sf('docEADBack', p)} />
          </div>
          <SectionTitle label="Certifications" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <DocUpload label="CPR / First Aid / BLS certificate" hint="PDF or image · expiry extracted automatically" required
              docKey="cpr" extractExpiry expiryLabel="CPR / BLS expiration date" expiryValue={form.cprExpiry}
              onUploaded={p => sf('docCPR', p)} onExpiryChange={v => sf('cprExpiry', v)} />
          </div>
        </div>
      )

      // 6 — Signature
      case 6: return (
        <div>
          <div style={{ background: 'rgba(0,128,128,0.05)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
            By signing below you certify that all information provided in this application is true and complete. Any false information or omission may disqualify you from further consideration and may result in dismissal if discovered after employment.
          </div>
          <SectionTitle label="Applicant signature" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Field label="Full legal name" required><input value={form.signatureName} onChange={e => sf('signatureName', e.target.value)} type="text" placeholder="Type your full name" style={fi} /></Field>
            <Field label="Date" required><input value={form.signatureDate} onChange={e => sf('signatureDate', e.target.value)} type="date" style={fi} /></Field>
          </div>
          <div>
            <label style={fLabel}>Signature{req}</label>
            <div style={{ border: '1px solid #d1d5db', borderRadius: 8, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', cursor: 'pointer' }}>
              <span style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-writing" /> Click to sign</span>
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>Use your mouse or touchscreen to draw your signature</span>
          </div>
        </div>
      )

      default: return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast}
        </div>
      )}

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
        {submitted ? (
          <span style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-circle-check" /> Application submitted
          </span>
        ) : step === total - 1 && (
          <button onClick={handleSubmit} disabled={submitting}
            style={{ fontSize: 12, padding: '6px 16px', borderRadius: 6, border: 'none', background: submitting ? '#6b7280' : '#004050', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit', opacity: submitting ? 0.8 : 1 }}>
            {submitting ? 'Submitting…' : 'Submit application'}
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
            {submitted && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#059669' }}>
                <i className="ti ti-circle-check" style={{ fontSize: 16, flexShrink: 0 }} />
                <span>Your application has been submitted and is under review. You can browse but cannot re-submit.</span>
              </div>
            )}
            <div style={{ height: 3, background: '#f3f4f6', borderRadius: 2, marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#008080', borderRadius: 2, width: PROG[step], transition: 'width 0.4s' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 2 }}>{STEP_META[step].label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>{STEP_META[step].sub}</div>
            {renderStep()}
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
              ) : submitted ? (
                <span style={{ fontSize: 13, padding: '7px 16px', borderRadius: 6, background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="ti ti-circle-check" /> Application submitted
                </span>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  style={{ fontSize: 13, padding: '7px 18px', borderRadius: 6, border: 'none', background: submitting ? '#6b7280' : '#004050', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', opacity: submitting ? 0.8 : 1 }}>
                  {submitting ? 'Submitting…' : 'Submit application'} <i className="ti ti-send" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
