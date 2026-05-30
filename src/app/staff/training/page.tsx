'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ALL_TRAININGS, CDS_URL, getVisibleTrainings } from '@/lib/training-modules'
import DSPTrainingAcademy from '@/components/training/DSPTrainingAcademy'

type Tab = 'all' | 'assess' | 'pdf' | 'certs'

export default function TrainingPage() {
  const [tab,      setTab]      = useState<Tab>('all')
  const [toast,    setToast]    = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    async function loadRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setUserRole(''); return }
      const { data } = await supabase.from('users').select('role:roles(name)').eq('id', user.id).single()
      setUserRole((data?.role as any)?.name ?? '')
    }
    loadRole()
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const isDspStaff = userRole === 'DSP Staff'
  const trainings  = userRole === null ? [] : getVisibleTrainings(userRole)

  const completed  = trainings.filter(t => t.status === 'Complete').length
  const inProgress = trainings.filter(t => t.status === 'In progress').length
  const dueSoon    = trainings.filter(t => t.status === 'Due soon').length
  const upcoming   = trainings.filter(t => t.status === 'Upcoming').length

  const tabItems: [Tab, string][] = [
    ['all', 'All training'],
    ...(isDspStaff ? [['assess', 'DSP Training Academy'] as [Tab, string]] : []),
    ['certs', 'My certificates'],
  ]

  const certCards = [
    ...(isDspStaff ? [{ name: 'DSP Training Academy', exp: 'In progress · Certificate issued on completion', status: 'Pending', statusBg: 'rgba(186,117,23,0.1)', statusColor: '#BA7517', disabled: true }] : []),
    { name: 'CDS training certificate', exp: 'Issued: Apr 2026 · No expiry', status: 'Valid', statusBg: 'rgba(48,176,96,0.1)', statusColor: '#30B060', disabled: false },
  ]

  const panel: React.CSSProperties = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>My training</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => showToast('Downloading training report...')} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-download" /> Download report
        </button>
      </div>

      {/* DSP Training Academy — native integration, DSP Staff only */}
      {tab === 'assess' && isDspStaff && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <DSPTrainingAcademy onBack={() => setTab('all')} />
        </div>
      )}

      {/* Danielle's Law PDF viewer */}
      {tab === 'pdf' && (() => {
        const t = trainings.find(x => x.tab === 'pdf')
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ background: '#004050', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={() => setTab('all')} style={{ fontSize: 12, padding: '5px 11px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', flexShrink: 0 }}>
                <i className="ti ti-arrow-left" style={{ fontSize: 13 }} /> Modules
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{t?.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{t?.meta}</div>
              </div>
              <a
                href={t?.pdfUrl}
                download
                style={{ fontSize: 12, padding: '5px 11px', borderRadius: 6, border: '0.5px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', flexShrink: 0 }}
              >
                <i className="ti ti-download" style={{ fontSize: 13 }} /> Download
              </a>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
              <iframe
                src={t?.pdfUrl}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                title="Danielle's Law compliance"
              />
            </div>
          </div>
        )
      })()}

      <div style={{ padding: (tab === 'assess' || tab === 'pdf') ? 0 : '20px 24px', display: (tab === 'assess' || tab === 'pdf') ? 'none' : 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: (tab === 'assess' || tab === 'pdf') ? undefined : 1 }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          {[
            { val: String(completed),  lbl: 'Completed',   pill: 'Done',          pillBg: 'rgba(48,176,96,0.1)',  pillColor: '#30B060' },
            { val: String(inProgress), lbl: 'In progress', pill: 'Active',         pillBg: 'rgba(0,128,128,0.1)',  pillColor: '#008080' },
            { val: String(dueSoon),    lbl: 'Due soon',    pill: 'Action needed',  pillBg: 'rgba(186,117,23,0.1)', pillColor: '#BA7517' },
            { val: String(upcoming),   lbl: 'Upcoming',    pill: 'Scheduled',      pillBg: 'rgba(0,128,128,0.1)',  pillColor: '#008080' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 500, color: '#111', letterSpacing: -0.5 }}>{userRole === null ? '—' : s.val}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.lbl}</div>
              <div style={{ display: 'inline-block', marginTop: 8, fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 500, background: s.pillBg, color: s.pillColor }}>{s.pill}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
          {tabItems.map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{ fontSize: 12, padding: '5px 16px', borderRadius: 6, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s', background: tab === key ? '#fff' : 'transparent', color: tab === key ? '#111' : '#6b7280', boxShadow: tab === key ? '0 0 0 0.5px #e5e7eb' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* All training modules */}
        {tab === 'all' && (
          <div style={panel}>
            <div style={{ background: '#004050', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Training modules</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Reliance Care Services</span>
            </div>
            {userRole === null ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
            ) : trainings.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < trainings.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
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
                  {t.externalUrl ? (
                    <a
                      href={t.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: '0.5px solid #008080', background: 'rgba(0,128,128,0.06)', color: '#008080', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', textDecoration: 'none' }}
                    >
                      Continue
                    </a>
                  ) : (
                    <button
                      onClick={() => t.tab ? setTab(t.tab) : showToast('Opening...')}
                      style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: `0.5px solid ${t.pct === 100 ? '#d1d5db' : '#008080'}`, background: t.pct === 100 ? 'transparent' : 'rgba(0,128,128,0.06)', color: t.pct === 100 ? '#6b7280' : '#008080', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                    >
                      {t.pct === 100 ? 'View cert' : t.tab === 'pdf' ? 'Continue →' : t.pct > 0 ? 'Continue →' : 'Start →'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Certificates */}
        {tab === 'certs' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
            {certCards.map((c, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(48,176,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#30B060', flexShrink: 0 }}>
                  <i className="ti ti-certificate" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{c.exp}</div>
                  <div style={{ marginTop: 6 }}>
                    <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 500, background: c.statusBg, color: c.statusColor }}>{c.status}</span>
                  </div>
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
