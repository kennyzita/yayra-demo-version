'use client'

import { useState } from 'react'

type Tab = 'all' | 'assess' | 'certs'

const trainings = [
  { icon: 'ti-clipboard-text', iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080', name: 'DSP Final Assessment', meta: 'Reliance Care Services · Required · Embedded in portal', pct: 30, barColor: '#008080', status: 'In progress', statusBg: 'rgba(0,128,128,0.1)', statusColor: '#008080', tab: 'assess' as const },
  { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: 'CPR / First Aid / BLS', meta: 'Completed May 2025 · Expires Apr 30, 2027', pct: 100, barColor: '#30B060', status: 'Complete', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', tab: null },
  { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: 'CDS training', meta: 'Completed Apr 2026 · No expiry', pct: 100, barColor: '#30B060', status: 'Complete', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', tab: null },
  { icon: 'ti-alert-triangle', iconBg: 'rgba(186,117,23,0.1)', iconColor: '#BA7517', name: "Danielle's Law compliance", meta: 'Required · Due May 20, 2026 · Mandatory annual', pct: 30, barColor: '#BA7517', status: 'Due soon', statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517', tab: null },
  { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: '60-day orientation', meta: 'Completed May 1, 2026 · Milestone achieved', pct: 100, barColor: '#30B060', status: 'Complete', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', tab: null },
  { icon: 'ti-calendar', iconBg: 'rgba(55,138,221,0.1)', iconColor: '#378ADD', name: '90-day review', meta: 'Due Jun 1, 2026 · Scheduled with supervisor', pct: 0, barColor: '#378ADD', status: 'Upcoming', statusBg: '#f3f4f6', statusColor: '#6b7280', tab: null },
  { icon: 'ti-calendar', iconBg: 'rgba(55,138,221,0.1)', iconColor: '#378ADD', name: '120-day milestone', meta: 'Due Jul 1, 2026', pct: 0, barColor: '#378ADD', status: 'Upcoming', statusBg: '#f3f4f6', statusColor: '#6b7280', tab: null },
  { icon: 'ti-certificate', iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060', name: 'Internal training', meta: 'Completed Apr 15, 2026 · Agency orientation', pct: 100, barColor: '#30B060', status: 'Complete', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', tab: null },
]

export default function TrainingPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const panel: React.CSSProperties = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>My training</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => showToast('Downloading training report...')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-download" /> Download report
        </button>
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          {[
            { val: '4', lbl: 'Completed', pill: 'Done', pillBg: 'rgba(48,176,96,0.1)', pillColor: '#30B060' },
            { val: '1', lbl: 'In progress', pill: 'Active', pillBg: 'rgba(0,128,128,0.1)', pillColor: '#008080' },
            { val: '1', lbl: 'Due soon', pill: 'Action needed', pillBg: 'rgba(186,117,23,0.1)', pillColor: '#BA7517' },
            { val: '2', lbl: 'Upcoming', pill: 'Scheduled', pillBg: 'rgba(0,128,128,0.1)', pillColor: '#008080' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 500, color: '#111', letterSpacing: -0.5 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.lbl}</div>
              <div style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: s.pillBg, color: s.pillColor }}>{s.pill}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
          {([['all','All training'],['assess','DSP final assessment'],['certs','My certificates']] as [Tab,string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ fontSize: 12, padding: '5px 16px', borderRadius: 6, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#111' : '#6b7280', boxShadow: tab === key ? '0 0 0 0.5px #e5e7eb' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* All training */}
        {tab === 'all' && (
          <div style={panel}>
            <div style={{ background: '#004050', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Training modules</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Reliance Care Services</span>
            </div>
            {trainings.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < trainings.length - 1 ? '0.5px solid #e5e7eb' : 'none', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  <i className={`ti ${t.icon}`} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.meta}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 80 }}>
                    <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: t.barColor, width: `${t.pct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, textAlign: 'right' }}>{t.pct}%</div>
                  </div>
                  <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 10, fontWeight: 500, whiteSpace: 'nowrap', background: t.statusBg, color: t.statusColor }}>{t.status}</span>
                  <button onClick={() => t.tab ? setTab(t.tab) : showToast('Opening...')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '0.5px solid #008080', background: t.pct === 100 ? 'transparent' : 'rgba(0,128,128,0.06)', color: t.pct === 100 ? '#6b7280' : '#008080', cursor: 'pointer', borderColor: t.pct === 100 ? '#d1d5db' : '#008080', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {t.pct === 100 ? 'View cert' : t.pct > 0 ? 'Continue →' : 'Start →'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Assessment panel */}
        {tab === 'assess' && (
          <div style={panel}>
            <div style={{ background: '#004050', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>DSP Final Assessment</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Reliance Care Services · Required for all DSP staff</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => showToast('Saving progress...')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                  <i className="ti ti-device-floppy" /> Save progress
                </button>
                <button onClick={() => showToast('Assessment submitted for review')} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#30B060', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}>
                  <i className="ti ti-send" /> Submit assessment
                </button>
              </div>
            </div>
            <div style={{ padding: '12px 20px', background: '#f9fafb', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 20 }}>
              {[{ icon: 'ti-user', text: <><strong>Maria Santos</strong></> }, { icon: 'ti-calendar', text: <>Started: May 13, 2026</> }, { icon: 'ti-chart-bar', text: <>Progress: <strong>30%</strong></> }, { icon: 'ti-clock', text: <>Est. time: 45–60 minutes</> }].map((info, i) => (
                <span key={i} style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className={`ti ${info.icon}`} style={{ fontSize: 13 }} />
                  {info.text}
                </span>
              ))}
            </div>
            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, background: 'white', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg,#004050,#008080)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#004050' }}>Reliance Care Services</div>
              <div style={{ fontSize: 14, color: '#666', maxWidth: 480, lineHeight: 1.6 }}>DSP Final Assessment — tests your knowledge of Direct Support Professional responsibilities, client care standards, NJ DDD compliance, and Reliance Care Services policies.</div>
              <div style={{ width: '100%', maxWidth: 560, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', textAlign: 'left' }}>
                {[{ lbl: 'Staff name', val: 'Maria Santos' }, { lbl: 'Staff ID', val: 'RCS-1042' }, { lbl: 'Position', val: 'DSP Staff' }, { lbl: 'Date', val: 'May 13, 2026' }].map((f, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderBottom: i < 3 ? '0.5px solid #e0e0e0' : 'none', borderRight: i % 2 === 0 ? '0.5px solid #e0e0e0' : 'none', display: 'inline-block', width: '50%', verticalAlign: 'top', boxSizing: 'border-box' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#888', marginBottom: 3 }}>{f.lbl}</div>
                    <div style={{ fontSize: 13, color: '#004050', fontWeight: 500 }}>{f.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ width: '100%', maxWidth: 560, border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden', textAlign: 'left' }}>
                <div style={{ background: '#004050', padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-help-circle" style={{ fontSize: 14 }} /> Question 1 of 20 — Section A: Client Rights
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, color: '#1a1a1a', marginBottom: 12, fontWeight: 500 }}>Which of the following best describes a DSP&apos;s primary responsibility when supporting an individual with a disability?</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {['Making decisions on behalf of the individual to ensure their safety', 'Supporting the individual to make their own choices and live as independently as possible', 'Following only the instructions given by the agency administrator', 'Completing required documentation as the primary job function'].map((opt, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: '#444', padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: 6, cursor: 'pointer' }}>
                        <input type="radio" name="q1" style={{ accentColor: '#008080' }} /> {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => showToast('Opening full assessment...')} style={{ fontSize: 14, fontWeight: 700, padding: '14px 32px', borderRadius: 8, border: 'none', background: '#008080', color: 'white', cursor: 'pointer', marginTop: 8 }}>
                Continue assessment →
              </button>
            </div>
          </div>
        )}

        {/* Certificates */}
        {tab === 'certs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {[
              { name: 'CPR / First Aid / BLS', exp: 'Issued: May 2025 · Expires: Apr 30, 2027', status: 'Valid', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', disabled: false },
              { name: 'CDS training certificate', exp: 'Issued: Apr 2026 · No expiry', status: 'Valid', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', disabled: false },
              { name: '60-day orientation completion', exp: 'Issued: May 1, 2026 · Reliance Care Services', status: 'Complete', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', disabled: false },
              { name: 'DSP final assessment', exp: 'In progress · Certificate issued on completion', status: 'Pending', statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517', disabled: true },
            ].map((c, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(48,176,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#30B060', flexShrink: 0 }}>
                  <i className="ti ti-certificate" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.exp}</div>
                  <div style={{ marginTop: 6 }}><span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: c.statusBg, color: c.statusColor }}>{c.status}</span></div>
                </div>
                <button onClick={() => !c.disabled && showToast('Downloading certificate...')} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: c.disabled ? 'not-allowed' : 'pointer', opacity: c.disabled ? 0.4 : 1, fontFamily: 'inherit' }}>
                  <i className="ti ti-download" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: 'white', fontSize: 13, padding: '10px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 200, border: '0.5px solid rgba(48,176,96,0.4)' }}>
          <i className="ti ti-check" style={{ color: '#30B060', fontSize: 15 }} /><span>{toast}</span>
        </div>
      )}
    </div>
  )
}
