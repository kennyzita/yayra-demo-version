'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppFormState } from '@/app/staff/application/page'

// ── Cert expiry config ─────────────────────────────────────────────────────────

const CERT_CONFIG: Record<string, number> = {
  'CPR Certificate': 730,
  'CARI Clearance': 1095,
  'Background Check': 365,
}

interface ExpiringCert { type: string; daysLeft: number; expiryDate: Date }

// ── Types ──────────────────────────────────────────────────────────────────────

type PillState   = 'yes' | 'no' | 'pending'
type BinState    = 'yes' | 'no'
type ResultState = 'none' | 'negative' | 'positive'

const PILL_CYCLE: PillState[]     = ['yes', 'no', 'pending']
const RESULT_CYCLE: ResultState[] = ['none', 'negative', 'positive']

// ── Pill components ────────────────────────────────────────────────────────────

function CompliancePill({ state, onChange }: { state: PillState; onChange: () => void }) {
  const cfg = {
    yes:     { bg: 'rgba(48,176,96,0.1)',  color: '#30B060', icon: 'ti-check', label: 'Yes'     },
    no:      { bg: 'rgba(226,75,74,0.1)',  color: '#E24B4A', icon: 'ti-x',     label: 'No'      },
    pending: { bg: 'rgba(186,117,23,0.1)', color: '#BA7517', icon: 'ti-clock', label: 'Pending' },
  }[state]
  return (
    <button onClick={onChange} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: cfg.bg, color: cfg.color, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
      <i className={`ti ${cfg.icon}`} /> {cfg.label}
    </button>
  )
}

function BinPill({ state, onChange, disabled }: { state: BinState; onChange: () => void; disabled?: boolean }) {
  const cfg = state === 'yes'
    ? { bg: 'rgba(48,176,96,0.1)',  color: '#30B060', icon: 'ti-check', label: 'Yes' }
    : { bg: 'rgba(226,75,74,0.1)', color: '#E24B4A', icon: 'ti-x',     label: 'No'  }
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: cfg.bg, color: cfg.color, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', opacity: disabled ? 0.55 : 1 }}
    >
      <i className={`ti ${cfg.icon}`} /> {cfg.label}
    </button>
  )
}

function ResultPill({ state, onChange }: { state: ResultState; onChange: () => void }) {
  if (state === 'none') {
    return (
      <button onClick={onChange} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: '#f3f4f6', color: '#9ca3af', border: '1px dashed #d1d5db', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
        — Set result
      </button>
    )
  }
  const cfg = state === 'negative'
    ? { bg: 'rgba(48,176,96,0.1)',  color: '#30B060', icon: 'ti-check',          label: 'Negative' }
    : { bg: 'rgba(226,75,74,0.1)', color: '#E24B4A', icon: 'ti-alert-triangle', label: 'Positive' }
  return (
    <button onClick={onChange} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: cfg.bg, color: cfg.color, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
      <i className={`ti ${cfg.icon}`} /> {cfg.label}
    </button>
  )
}

// ── Signature pad ──────────────────────────────────────────────────────────────

function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing   = useRef(false)

  useEffect(() => {
    if (!value || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    const img = new window.Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = value
  }, []) // restore on mount only

  function pos(canvas: HTMLCanvasElement, e: React.MouseEvent | React.TouchEvent) {
    const r = canvas.getBoundingClientRect()
    const sx = canvas.width / r.width
    const sy = canvas.height / r.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - r.left) * sx, y: (t.clientY - r.top) * sy }
    }
    return { x: ((e as React.MouseEvent).clientX - r.left) * sx, y: ((e as React.MouseEvent).clientY - r.top) * sy }
  }

  function start(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return
    e.preventDefault(); drawing.current = true
    const ctx = canvas.getContext('2d')!
    const p = pos(canvas, e)
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }

  function move(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return
    const canvas = canvasRef.current; if (!canvas) return
    e.preventDefault()
    const ctx = canvas.getContext('2d')!
    const p = pos(canvas, e)
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111'
    ctx.lineTo(p.x, p.y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    const canvas = canvasRef.current; if (!canvas) return
    onChange(canvas.toDataURL('image/png'))
  }

  function clear() {
    const canvas = canvasRef.current; if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  return (
    <div>
      <div style={{ position: 'relative', border: `1px solid ${value ? 'rgba(48,176,96,0.4)' : '#d1d5db'}`, borderRadius: 8, background: '#f9fafb', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef} width={600} height={110}
          style={{ display: 'block', width: '100%', height: 110, cursor: 'crosshair', touchAction: 'none' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {!value && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 12, color: '#d1d5db', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="ti ti-writing" /> Draw signature here
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: value ? '#30B060' : '#9ca3af' }}>
          {value ? '✓ Signature captured' : 'Use mouse or touchscreen to sign'}
        </span>
        {value && (
          <button onClick={clear} style={{ fontSize: 11, color: '#6b7280', cursor: 'pointer', background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 8px', fontFamily: 'inherit' }}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface StaffUser { id: string; first_name: string; last_name: string }

// ── Main component ─────────────────────────────────────────────────────────────

export default function StaffProgressPage() {
  const supabase = createClient()

  // Staff list (DSP Staff role only)
  const [staffList,     setStaffList]     = useState<StaffUser[]>([])
  const [selectedId,    setSelectedId]    = useState('')
  const [loadingStaff,  setLoadingStaff]  = useState(true)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [toast,         setToast]         = useState('')

  // Staff onboarding data loaded per-selection
  const [formsSignedAt, setFormsSignedAt] = useState<string | null>(null)
  const [formsSigned,   setFormsSigned]   = useState(false)
  const [eadUploaded,   setEadUploaded]   = useState(false)
  const [lastLogin,     setLastLogin]     = useState<string | null>(null)

  // Expiring certs
  const [expiringCerts,  setExpiringCerts]  = useState<ExpiringCert[]>([])

  // Admin identity
  const [adminName,      setAdminName]      = useState('')
  const [adminSignature, setAdminSignature] = useState('')

  // Compliance
  const [compliance, setCompliance] = useState<[PillState, PillState][]>([
    ['yes', 'yes'], ['yes', 'yes'], ['yes', 'pending'], ['yes', 'pending'], ['yes', 'yes'],
  ])
  const [complianceResults, setComplianceResults] = useState<ResultState[]>([
    'negative', 'negative', 'none', 'none', 'negative',
  ])

  // System access
  const [cdsAccess,     setCdsAccess]     = useState<BinState>('yes')
  const [managerAccess, setManagerAccess] = useState<BinState>('yes')
  const [portalAccess,  setPortalAccess]  = useState<BinState>('yes')

  // Training
  const [training,      setTraining]      = useState<PillState[]>(['yes', 'yes', 'yes', 'pending', 'pending', 'yes'])
  const [trainingDates, setTrainingDates] = useState<string[]>([
    '2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-09-01', '',
  ])

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function cycleCompliance(row: number, col: 0 | 1) {
    setCompliance(prev => prev.map((r, i) => {
      if (i !== row) return r
      const next = PILL_CYCLE[(PILL_CYCLE.indexOf(r[col]) + 1) % PILL_CYCLE.length]
      return col === 0 ? [next, r[1]] : [r[0], next]
    }))
  }

  function cycleResult(i: number) {
    setComplianceResults(prev => prev.map((v, idx) =>
      idx === i ? RESULT_CYCLE[(RESULT_CYCLE.indexOf(v) + 1) % RESULT_CYCLE.length] : v
    ))
  }

  function toggleCds() {
    const next: BinState = cdsAccess === 'yes' ? 'no' : 'yes'
    if (next === 'yes' && managerAccess === 'yes') {
      showToast("Cannot set CDS to Yes while Manager's Zone access is Yes")
      return
    }
    setCdsAccess(next)
  }

  function toggleManager() {
    const next: BinState = managerAccess === 'yes' ? 'no' : 'yes'
    if (next === 'yes') setCdsAccess('no') // enforce mutual exclusivity
    setManagerAccess(next)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2800)
  }

  // ── Load DSP Staff list (exact role match) ────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, role:roles(name)')
        .order('first_name')
      const dspStaff = (data ?? []).filter(u => {
        const name = (u.role as unknown as { name: string } | null)?.name ?? ''
        return name === 'DSP Staff'
      })
      setStaffList(dspStaff.map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name })))
      setLoadingStaff(false)
    }
    load()
  }, [])

  // ── Load logged-in admin name ─────────────────────────────────────────────────

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('first_name, last_name').eq('id', user.id).maybeSingle()
      if (data) {
        const row = data as { first_name?: string; last_name?: string }
        setAdminName(`${row.first_name ?? ''} ${row.last_name ?? ''}`.trim())
      }
    }
    loadAdmin()
  }, [])

  // ── Load selected staff onboarding + last login ───────────────────────────────

  useEffect(() => {
    if (!selectedId) {
      setFormsSigned(false); setFormsSignedAt(null)
      setEadUploaded(false); setLastLogin(null)
      setExpiringCerts([])
      return
    }
    setLoadingStatus(true)
    async function loadStatus() {
      const [staffRes, loginJson, docsJson] = await Promise.all([
        supabase.from('billing_staff_data').select('data').eq('staff_id', selectedId).maybeSingle(),
        fetch(`/api/get-user-last-login?userId=${selectedId}`).then(r => r.json()).catch(() => ({ lastLogin: null })),
        fetch(`/api/list-staff-documents?staffId=${selectedId}`).then(r => r.json()).catch(() => ({ files: [] })),
      ])

      const extra = (staffRes.data?.data ?? {}) as Record<string, unknown>
      const signed = extra.onboarding_forms_signed === 'true'
      setFormsSigned(signed)
      setFormsSignedAt(signed ? ((extra.onboarding_forms_signed_at as string) ?? null) : null)

      const formData = extra.form as AppFormState | undefined
      setEadUploaded(!!(formData?.docEADFront))

      setLastLogin((loginJson as { lastLogin: string | null }).lastLogin ?? null)
      setAdminSignature('')

      const allFiles: { folder: string; createdAt: string }[] = (docsJson as any).files ?? []
      const nowMs = Date.now()
      const expiring: ExpiringCert[] = []
      for (const [certType, validityDays] of Object.entries(CERT_CONFIG)) {
        const certFiles = allFiles.filter(f => f.folder === certType)
        if (certFiles.length === 0) continue
        const latestMs = Math.max(...certFiles.map(f => new Date(f.createdAt).getTime()))
        const expiryMs = latestMs + validityDays * 86400000
        const daysLeft = Math.floor((expiryMs - nowMs) / 86400000)
        if (daysLeft <= 90) expiring.push({ type: certType, daysLeft, expiryDate: new Date(expiryMs) })
      }
      setExpiringCerts(expiring)
      setLoadingStatus(false)
    }
    loadStatus()
  }, [selectedId])

  // ── Derived values ────────────────────────────────────────────────────────────

  const selectedStaff = staffList.find(s => s.id === selectedId)

  const signedDate = formsSignedAt
    ? new Date(formsSignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const formattedLastLogin = lastLogin
    ? new Date(lastLogin).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Never'

  const onboardItems = [
    { done: true,                            label: 'DSP application submitted'    },
    { done: formsSigned, warn: !formsSigned, label: 'W4 completed'                 },
    { done: formsSigned, warn: !formsSigned, label: 'Form I-9 submitted'           },
    { done: true,                            label: "Driver's license uploaded"    },
    { done: true,                            label: 'CPR certificate uploaded'     },
    { done: formsSigned, warn: !formsSigned, label: 'CRO consent signed'           },
    { done: formsSigned, warn: !formsSigned, label: 'Direct deposit form'          },
    { done: formsSigned, warn: !formsSigned, label: 'NJ W4'                        },
    { done: false,        miss: true,        label: 'CARI clearance'               },
    { done: formsSigned, warn: !formsSigned, label: "Danielle's Law sign-off"      },
    { done: formsSigned, warn: !formsSigned, label: "Stephen Komnino's Law"        },
    { done: formsSigned, warn: !formsSigned, label: 'Appendix A'                   },
    { done: eadUploaded, warn: !eadUploaded, label: 'Work authorization uploaded'  },
  ]

  const completedCount = onboardItems.filter(i => i.done).length
  const obPct = Math.round((completedCount / onboardItems.length) * 100)

  const complianceRowLabels = ['CRO check', 'Drug testing', 'CARI clearance', 'Fingerprinting', 'FARA check']
  const trainingRowLabels   = ['Prior training', '60-day orientation', '90-day review', '120-day milestone', '180-day milestone', 'Internal training']

  const milestones = [
    { label: 'Prior training', done: training[0] === 'yes', current: training[0] !== 'yes' },
    { label: '60 days',        done: training[1] === 'yes', current: training[0] === 'yes' && training[1] !== 'yes' },
    { label: '90 days',        done: training[2] === 'yes', current: training[1] === 'yes' && training[2] !== 'yes' },
    { label: '120 days',       done: training[3] === 'yes', current: training[2] === 'yes' && training[3] !== 'yes' },
    { label: '180 days',       done: training[4] === 'yes', current: training[3] === 'yes' && training[4] !== 'yes' },
  ]

  const trainingDoneCount = training.filter(t => t === 'yes').length

  // ── Styles ────────────────────────────────────────────────────────────────────

  const sb: React.CSSProperties = { background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const sh: React.CSSProperties = { background: '#0d2d5e', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const thStyle: React.CSSProperties = { padding: '9px 16px', fontSize: 10, fontWeight: 600, color: '#6b7280', textAlign: 'left' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }
  const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' as const, color: '#111' }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f5f7' }}>

      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 22px', height: 54, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Staff progress report</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-download" /> Export PDF
        </button>
        <button onClick={() => showToast('Report saved')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #008080', background: '#008080', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-device-floppy" /> Save report
        </button>
      </div>

      <div style={{ padding: '18px 22px' }}>

        {/* DSP Staff selector */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>Select DSP staff</span>
          <div style={{ position: 'relative', flex: 1 }}>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              disabled={loadingStaff}
              style={{ width: '100%', fontSize: 13, padding: '9px 36px 9px 12px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', color: '#111', outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
            >
              <option value="">— {loadingStaff ? 'Loading…' : 'Select DSP staff member'} —</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 12, color: '#008080', pointerEvents: 'none' }}>❯</span>
          </div>
        </div>

        {!selectedId ? (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <i className="ti ti-user-search" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#d1d5db' }} />
            Select a DSP staff member to view their progress report.
          </div>
        ) : loadingStatus ? (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Loading report…
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
              {[
                { val: completedCount,                          lbl: 'Checks complete',     pill: 'On track',     pillBg: 'rgba(48,176,96,0.1)',   pillColor: '#30B060' },
                { val: onboardItems.length - completedCount,   lbl: 'Pending items',       pill: 'Action needed', pillBg: 'rgba(186,117,23,0.1)', pillColor: '#BA7517' },
                { val: `${obPct}%`,                             lbl: 'Onboarding complete', pill: 'In progress',  pillBg: 'rgba(0,128,128,0.1)',   pillColor: '#008080' },
                { val: `${trainingDoneCount}/${trainingRowLabels.length}`, lbl: 'Training milestones', pill: 'In progress', pillBg: 'rgba(48,176,96,0.1)', pillColor: '#30B060' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 15, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#111' }}>{c.val}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.lbl}</div>
                  <div style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '2px 9px', borderRadius: 10, fontWeight: 500, background: c.pillBg, color: c.pillColor }}>{c.pill}</div>
                </div>
              ))}
            </div>

            {/* ── Onboarding success ──────────────────────────────────────────── */}
            <div style={sb}>
              <div style={sh}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Onboarding success</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {formsSigned && signedDate && (
                    <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: 'rgba(48,176,96,0.2)', color: '#4ade80', fontWeight: 600 }}>
                      Forms signed {signedDate}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{obPct}% complete</span>
                </div>
              </div>
              <div style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151' }}>Overall progress</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#008080' }}>{obPct}%</span>
                </div>
                <div style={{ height: 9, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#008080,#30B060)', borderRadius: 5, width: `${obPct}%`, transition: 'width 0.4s' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {onboardItems.map((item, i) => {
                    const miss      = 'miss' in item && item.miss
                    const iconBg    = item.done ? 'rgba(48,176,96,0.1)'  : item.warn ? 'rgba(186,117,23,0.1)' : 'rgba(226,75,74,0.1)'
                    const iconColor = item.done ? '#30B060'              : item.warn ? '#BA7517'              : '#E24B4A'
                    const icon      = item.done ? 'ti-check'             : item.warn ? 'ti-clock'             : 'ti-x'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', border: `1px solid ${item.done ? 'rgba(48,176,96,0.2)' : '#e5e7eb'}`, borderRadius: 8, background: item.done ? 'rgba(48,176,96,0.04)' : '#fff', transition: 'all 0.3s' }}>
                        <div style={{ width: 21, height: 21, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                          <i className={`ti ${icon}`} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: item.done ? '#15803d' : '#111' }}>{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── Expiring certs ──────────────────────────────────────────────── */}
            <div style={sb}>
              <div style={{ ...sh, justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Expiring certs</span>
                <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, fontWeight: 600, background: expiringCerts.length > 0 ? 'rgba(226,75,74,0.25)' : 'rgba(48,176,96,0.25)', color: expiringCerts.length > 0 ? '#fca5a5' : '#4ade80' }}>
                  {expiringCerts.length > 0 ? `${expiringCerts.length} expiring` : 'All current'}
                </span>
              </div>
              {expiringCerts.length === 0 ? (
                <div style={{ padding: '18px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <i className="ti ti-circle-check" style={{ fontSize: 16, color: '#30B060' }} />
                  <span style={{ fontSize: 13, color: '#6b7280' }}>All certificates are up to date</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Certificate</th>
                      <th style={thStyle}>Expiry date</th>
                      <th style={thStyle}>Days remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringCerts.map((cert, i) => {
                      const expired = cert.daysLeft <= 0
                      const urgent  = cert.daysLeft > 0 && cert.daysLeft <= 14
                      const color   = expired || urgent ? '#E24B4A' : cert.daysLeft <= 30 ? '#BA7517' : '#d97706'
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{cert.type}</td>
                          <td style={tdStyle}>{cert.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, padding: '3px 9px', borderRadius: 10, fontWeight: 600, background: `${color}18`, color }}>
                              {expired
                                ? `Expired ${Math.abs(cert.daysLeft)}d ago`
                                : `${cert.daysLeft} days`}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Compliance checks ───────────────────────────────────────────── */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Compliance checks</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Check</th>
                    <th style={thStyle}>Scheduled</th>
                    <th style={thStyle}>Completed</th>
                    <th style={thStyle}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceRowLabels.map((label, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{label}</td>
                      <td style={tdStyle}><CompliancePill state={compliance[i][0]} onChange={() => cycleCompliance(i, 0)} /></td>
                      <td style={tdStyle}><CompliancePill state={compliance[i][1]} onChange={() => cycleCompliance(i, 1)} /></td>
                      <td style={tdStyle}><ResultPill state={complianceResults[i]} onChange={() => cycleResult(i)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── System access ────────────────────────────────────────────────── */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>System access</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Item</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {/* CDS account */}
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>CDS account created</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BinPill state={cdsAccess} onChange={toggleCds} disabled={managerAccess === 'yes'} />
                        {managerAccess === 'yes' && (
                          <span style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>Locked — Manager's Zone active</span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>Active since Apr 2026</td>
                  </tr>
                  {/* Manager's Zone */}
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>Manager's Zone access</td>
                    <td style={tdStyle}><BinPill state={managerAccess} onChange={toggleManager} /></td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>Role: DSP Staff</td>
                  </tr>
                  {/* Portal access */}
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>Reliance Care Services portal access</td>
                    <td style={tdStyle}>
                      <BinPill state={portalAccess} onChange={() => setPortalAccess(p => p === 'yes' ? 'no' : 'yes')} />
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: lastLogin ? '#374151' : '#9ca3af' }}>
                      Last login: {formattedLastLogin}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Training milestones ─────────────────────────────────────────── */}
            <div style={sb}>
              <div style={sh}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Training milestones</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{trainingDoneCount} of {trainingRowLabels.length} completed</span>
              </div>
              <div style={{ padding: '16px 18px' }}>
                {/* Visual timeline */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {milestones.map((m, i) => (
                    <>
                      <div key={`dot-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${m.done ? '#008080' : m.current ? '#30B060' : '#d1d5db'}`, background: m.done ? '#008080' : m.current ? '#30B060' : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: m.done || m.current ? 'white' : '#9ca3af' }}>
                          {m.done ? <i className="ti ti-check" style={{ fontSize: 11 }} /> : i + 1}
                        </div>
                      </div>
                      {i < milestones.length - 1 && <div key={`line-${i}`} style={{ flex: 1, height: 2, background: m.done ? '#008080' : '#e5e7eb' }} />}
                    </>
                  ))}
                </div>
                <div style={{ display: 'flex', marginTop: 5 }}>
                  {milestones.map((m, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: m.current ? '#30B060' : '#6b7280', fontWeight: m.current ? 600 : 400 }}>{m.label}</div>
                  ))}
                </div>

                {/* Training table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Training item</th>
                      <th style={thStyle}>Due date</th>
                      <th style={thStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingRowLabels.map((label, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{label}</td>
                        <td style={tdStyle}>
                          {i < trainingRowLabels.length - 1 ? (
                            <input
                              type="date"
                              value={trainingDates[i]}
                              onChange={e => setTrainingDates(prev => prev.map((d, idx) => idx === i ? e.target.value : d))}
                              style={{ fontSize: 12, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', color: '#374151', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}
                            />
                          ) : (
                            <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>Ongoing</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <CompliancePill
                            state={training[i]}
                            onChange={() => setTraining(prev => prev.map((v, idx) =>
                              idx === i ? PILL_CYCLE[(PILL_CYCLE.indexOf(v) + 1) % PILL_CYCLE.length] : v
                            ))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Admin sign-off ──────────────────────────────────────────────── */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Admin sign-off</span></div>
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Admin name</div>
                  <input
                    readOnly
                    value={adminName || 'Loading…'}
                    style={{ width: '100%', fontSize: 13, padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb', color: '#374151', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
                  />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Auto-filled from your account</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Signature</div>
                  <SignaturePad value={adminSignature} onChange={setAdminSignature} />
                </div>
                <div style={{ paddingTop: 24 }}>
                  <button
                    onClick={() => {
                      if (!adminSignature) { showToast('Please sign before saving'); return }
                      showToast('Report saved successfully')
                    }}
                    style={{ fontSize: 13, padding: '11px 22px', borderRadius: 8, border: 'none', background: '#008080', color: 'white', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                  >
                    Save report
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: 'white', fontSize: 13, padding: '10px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 200 }}>
          <span>✓</span><span>{toast}</span>
        </div>
      )}
    </div>
  )
}
