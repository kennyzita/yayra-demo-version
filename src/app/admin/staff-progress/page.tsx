'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type PillState = 'yes' | 'no' | 'pending'
const PILL_CYCLE: PillState[] = ['yes', 'no', 'pending']

function CompliancePill({ state, onChange }: { state: PillState; onChange: () => void }) {
  const cfg = {
    yes:     { bg: 'rgba(48,176,96,0.1)',   color: '#30B060', icon: 'ti-check', label: 'Yes'     },
    no:      { bg: 'rgba(226,75,74,0.1)',   color: '#E24B4A', icon: 'ti-x',     label: 'No'      },
    pending: { bg: 'rgba(186,117,23,0.1)',  color: '#BA7517', icon: 'ti-clock', label: 'Pending' },
  }[state]
  return (
    <button onClick={onChange} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: cfg.bg, color: cfg.color, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
      <i className={`ti ${cfg.icon}`} /> {cfg.label}
    </button>
  )
}

interface StaffUser {
  id: string
  first_name: string
  last_name: string
}

export default function StaffProgressPage() {
  const supabase = createClient()

  const [staffList,      setStaffList]      = useState<StaffUser[]>([])
  const [selectedId,     setSelectedId]     = useState('')
  const [formsSignedAt,  setFormsSignedAt]  = useState<string | null>(null)
  const [formsSigned,    setFormsSigned]    = useState(false)
  const [adminSigned,    setAdminSigned]    = useState(false)
  const [toast,          setToast]          = useState('')
  const [loadingStaff,   setLoadingStaff]   = useState(true)
  const [loadingStatus,  setLoadingStatus]  = useState(false)

  const [compliance, setCompliance] = useState<[PillState, PillState][]>([
    ['yes', 'yes'], ['yes', 'yes'], ['yes', 'pending'], ['yes', 'pending'], ['yes', 'yes'],
  ])
  const [sysAccess, setSysAccess] = useState<PillState[]>(['yes', 'yes', 'yes'])
  const [training,  setTraining]  = useState<PillState[]>(['yes', 'yes', 'yes', 'pending', 'pending', 'yes'])

  function cycleCompliance(row: number, col: 0 | 1) {
    setCompliance(prev => prev.map((r, i) => {
      if (i !== row) return r
      const next = PILL_CYCLE[(PILL_CYCLE.indexOf(r[col]) + 1) % PILL_CYCLE.length]
      return col === 0 ? [next, r[1]] : [r[0], next]
    }))
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // Load staff list on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, role:roles(name)')
        .order('first_name')
      const dsps = (data ?? []).filter(u => {
        const name = (u.role as unknown as { name: string } | null)?.name ?? ''
        return name.includes('DSP') || name.includes('Staff')
      })
      setStaffList(dsps.map(u => ({ id: u.id, first_name: u.first_name, last_name: u.last_name })))
      setLoadingStaff(false)
    }
    load()
  }, [])

  // Load selected staff's onboarding status
  useEffect(() => {
    if (!selectedId) { setFormsSigned(false); setFormsSignedAt(null); return }
    setLoadingStatus(true)
    async function loadStatus() {
      const { data } = await supabase
        .from('billing_staff_data')
        .select('data')
        .eq('staff_id', selectedId)
        .maybeSingle()
      const extra = (data?.data ?? {}) as Record<string, string>
      const signed = extra.onboarding_forms_signed === 'true'
      setFormsSigned(signed)
      setFormsSignedAt(signed ? (extra.onboarding_forms_signed_at ?? null) : null)
      setAdminSigned(false)
      setLoadingStatus(false)
    }
    loadStatus()
  }, [selectedId])

  const selectedStaff = staffList.find(s => s.id === selectedId)
  const fullName = selectedStaff ? `${selectedStaff.first_name} ${selectedStaff.last_name}` : ''

  const signedDate = formsSignedAt
    ? new Date(formsSignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // Overall progress items — all turn green when forms are signed
  const onboardItems = [
    { done: true,       label: 'DSP application submitted'  },
    { done: true,       label: 'W4 completed'               },
    { done: true,       label: 'Form I-9 submitted'         },
    { done: true,       label: "Driver's license uploaded"  },
    { done: true,       label: 'CPR certificate uploaded'   },
    { done: true,       label: 'CRO consent signed'         },
    { done: formsSigned, warn: !formsSigned, label: 'Direct deposit form'        },
    { done: formsSigned, warn: !formsSigned, label: 'NJ W4 pending'              },
    { done: formsSigned, miss: !formsSigned, label: 'CARI clearance'             },
    { done: formsSigned, miss: !formsSigned, label: "Danielle's Law sign-off"    },
  ]

  const completedCount = onboardItems.filter(i => i.done).length
  const obPct = Math.round((completedCount / onboardItems.length) * 100)

  const complianceRows = [
    { label: 'CRO check',      result: { text: 'Negative', good: true } },
    { label: 'Drug testing',   result: { text: 'Negative', good: true } },
    { label: 'CARI clearance', result: null },
    { label: 'Fingerprinting', result: null },
    { label: 'FARA check',     result: { text: 'Negative', good: true } },
  ]

  const sysRows = [
    { label: 'CDS account created',                        note: 'Active since Apr 2026'    },
    { label: "Manager's Zone access",                      note: 'Role: DSP Staff'          },
    { label: 'Reliance Care Services portal access',       note: 'Last login: May 13, 2026' },
  ]

  const trainingRows = [
    { label: 'Prior training',      due: 'Apr 1, 2026' },
    { label: '60-day orientation',  due: 'May 1, 2026' },
    { label: '90-day review',       due: 'Jun 1, 2026' },
    { label: '120-day milestone',   due: 'Jul 1, 2026' },
    { label: '180-day milestone',   due: 'Sep 1, 2026' },
    { label: 'Internal training',   due: 'Ongoing'     },
  ]

  const milestones = [
    { label: 'Prior training', done: true,  current: false },
    { label: '60 days',        done: true,  current: false },
    { label: '90 days',        done: true,  current: false },
    { label: '120 days',       done: false, current: true  },
    { label: '180 days',       done: false, current: false },
  ]

  const sb: React.CSSProperties  = { background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }
  const sh: React.CSSProperties  = { background: '#0d2d5e', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const thStyle: React.CSSProperties = { padding: '9px 16px', fontSize: 10, fontWeight: 600, color: '#6b7280', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }
  const tdStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', color: '#111' }

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

        {/* DSP selector */}
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>Select DSP staff</span>
          <div style={{ position: 'relative', flex: 1 }}>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              disabled={loadingStaff}
              style={{ width: '100%', fontSize: 13, padding: '9px 36px 9px 12px', border: '1px solid #d1d5db', borderRadius: 8, background: 'white', color: '#111', outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit' }}
            >
              <option value="">— {loadingStaff ? 'Loading…' : 'Select staff member'} —</option>
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
            Select a staff member to view their progress report.
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
                { val: completedCount, lbl: 'Checks complete',      pill: 'On track',      pillBg: 'rgba(48,176,96,0.1)',   pillColor: '#30B060' },
                { val: onboardItems.length - completedCount, lbl: 'Pending items', pill: 'Action needed', pillBg: 'rgba(186,117,23,0.1)', pillColor: '#BA7517' },
                { val: `${obPct}%`,    lbl: 'Onboarding complete',  pill: 'In progress',   pillBg: 'rgba(0,128,128,0.1)',   pillColor: '#008080' },
                { val: '3/5',          lbl: 'Training milestones',  pill: '60 days done',  pillBg: 'rgba(48,176,96,0.1)',   pillColor: '#30B060' },
              ].map((c, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 15, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#111' }}>{c.val}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.lbl}</div>
                  <div style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '2px 9px', borderRadius: 10, fontWeight: 500, background: c.pillBg, color: c.pillColor }}>{c.pill}</div>
                </div>
              ))}
            </div>

            {/* Onboarding success */}
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

            {/* Compliance checks */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Compliance checks</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Check</th><th style={thStyle}>Scheduled</th><th style={thStyle}>Completed</th><th style={thStyle}>Result</th></tr></thead>
                <tbody>
                  {complianceRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.label}</td>
                      <td style={tdStyle}><CompliancePill state={compliance[i][0]} onChange={() => cycleCompliance(i, 0)} /></td>
                      <td style={tdStyle}><CompliancePill state={compliance[i][1]} onChange={() => cycleCompliance(i, 1)} /></td>
                      <td style={tdStyle}>
                        {row.result
                          ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 500, background: row.result.good ? 'rgba(48,176,96,0.1)' : 'rgba(226,75,74,0.1)', color: row.result.good ? '#30B060' : '#E24B4A' }}>{row.result.text}</span>
                          : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* System access */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>System access</span></div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Item</th><th style={thStyle}>Status</th><th style={thStyle}>Notes</th></tr></thead>
                <tbody>
                  {sysRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.label}</td>
                      <td style={tdStyle}><CompliancePill state={sysAccess[i]} onChange={() => setSysAccess(prev => prev.map((v, idx) => idx === i ? PILL_CYCLE[(PILL_CYCLE.indexOf(v)+1)%PILL_CYCLE.length] : v))} /></td>
                      <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Training milestones */}
            <div style={sb}>
              <div style={sh}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Training milestones</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>3 of 5 completed</span>
              </div>
              <div style={{ padding: '16px 18px' }}>
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
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 14 }}>
                  <thead><tr><th style={thStyle}>Training item</th><th style={thStyle}>Due date</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {trainingRows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{row.label}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: '#6b7280' }}>{row.due}</td>
                        <td style={tdStyle}><CompliancePill state={training[i]} onChange={() => setTraining(prev => prev.map((v, idx) => idx === i ? PILL_CYCLE[(PILL_CYCLE.indexOf(v)+1)%PILL_CYCLE.length] : v))} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Admin sign-off */}
            <div style={sb}>
              <div style={sh}><span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Admin sign-off</span></div>
              <div style={{ padding: '16px 18px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Admin name</div>
                  <input readOnly value="Jane Doe" style={{ width: '100%', fontSize: 13, padding: '9px 11px', border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb', color: '#555', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Signature</div>
                  <div onClick={() => { setAdminSigned(true); showToast('Report signed') }} style={{ border: `1px solid ${adminSigned ? 'rgba(48,176,96,0.4)' : '#d1d5db'}`, borderRadius: 8, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: adminSigned ? 'rgba(48,176,96,0.05)' : '#f9fafb' }}>
                    {adminSigned
                      ? <span style={{ fontSize: 18, color: '#30B060', fontStyle: 'italic' }}>Jane Doe</span>
                      : <span style={{ fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-writing" /> Click to sign</span>}
                  </div>
                </div>
                <button onClick={() => showToast('Report saved successfully')} style={{ fontSize: 13, padding: '11px 22px', borderRadius: 8, border: 'none', background: '#008080', color: 'white', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  Save report
                </button>
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
