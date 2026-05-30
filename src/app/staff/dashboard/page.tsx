'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getVisibleTrainings } from '@/lib/training-modules'
import {
  Users, Clock, FileText, GraduationCap,
  Bell, Settings, ExternalLink, Upload,
  CircleCheck, FilePlus, type LucideIcon,
} from 'lucide-react'

const CERT_CONFIG: Record<string, number> = {
  'CPR Certificate': 730,
  'CARI Clearance': 1095,
  'Background Check': 365,
}

interface ExpiringCert { type: string; daysLeft: number; expiryDate: Date }
interface AssignedClient { id: string; full_name: string }

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

function todayIso() { return isoDate(new Date()) }

function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export default function StaffDashboardPage() {
  const supabase = createClient()
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const [firstName,       setFirstName]       = useState('')
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([])
  const [hoursThisWeek,   setHoursThisWeek]   = useState<number | null>(null)
  const [caseNotesMonth,  setCaseNotesMonth]  = useState<number | null>(null)
  const [pendingNotes,    setPendingNotes]    = useState<number | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [userRole,        setUserRole]        = useState<string | null>(null)
  const [expiringCerts,   setExpiringCerts]   = useState<ExpiringCert[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const today = todayIso()
      const mStart = monthStart()

      const [profileRes, assignmentRes, timesheetRes, caseNoteCountRes, draftNoteRes, docsJson] = await Promise.all([
        supabase.from('users').select('first_name, role:roles(name)').eq('id', user.id).single(),
        supabase.from('assignments').select('client_id').eq('dsp_id', user.id),
        supabase.from('timesheets').select('total_hours').eq('dsp_id', user.id)
          .lte('week_start', today).gte('week_end', today),
        supabase.from('case_notes').select('id', { count: 'exact', head: true }).eq('dsp_id', user.id)
          .eq('status', 'submitted').gte('submitted_at', mStart),
        supabase.from('case_notes').select('id', { count: 'exact', head: true }).eq('dsp_id', user.id)
          .eq('status', 'draft'),
        fetch(`/api/list-staff-documents?staffId=${user.id}`).then(r => r.json()).catch(() => ({ files: [] })),
      ])

      if (profileRes.data) {
        setFirstName((profileRes.data as any).first_name)
        setUserRole((profileRes.data as any).role?.name ?? '')
      }

      if (assignmentRes.data && assignmentRes.data.length > 0) {
        const ids = assignmentRes.data.map(a => a.client_id)
        const { data: clientRows } = await supabase.from('clients').select('id, full_name').in('id', ids)
        setAssignedClients((clientRows ?? []) as AssignedClient[])
      } else {
        setAssignedClients([])
      }

      const hours = (timesheetRes.data ?? []).reduce((sum, r) => sum + (Number(r.total_hours) || 0), 0)
      setHoursThisWeek(hours)
      setCaseNotesMonth(caseNoteCountRes.count ?? 0)
      setPendingNotes(draftNoteRes.count ?? 0)

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
      setLoading(false)
    }
    load()
  }, [])

  const clientCount = assignedClients.length
  const hoursDisplay = hoursThisWeek === null ? '—' : hoursThisWeek % 1 === 0 ? String(hoursThisWeek) : hoursThisWeek.toFixed(1)

  const trainings = getVisibleTrainings(userRole ?? '')
  const trainingCompleted = trainings.filter(t => t.status === 'Complete').length
  const trainingDueSoon   = trainings.filter(t => t.status === 'Due soon').length

  const metrics: { IconComp: LucideIcon; iconBg: string; iconColor: string; badge: string; badgeBg: string; badgeColor: string; value: string; label: string }[] = [
    {
      IconComp: Users,
      iconBg: 'rgba(0,128,128,0.1)', iconColor: '#008080',
      badge: 'total', badgeBg: 'rgba(55,138,221,0.1)', badgeColor: '#378ADD',
      value: loading ? '—' : String(clientCount), label: 'My assigned clients',
    },
    {
      IconComp: Clock,
      iconBg: 'rgba(48,176,96,0.12)', iconColor: '#30B060',
      badge: 'this week', badgeBg: 'rgba(48,176,96,0.12)', badgeColor: '#30B060',
      value: loading ? '—' : hoursDisplay, label: 'Hours logged this week',
    },
    {
      IconComp: FileText,
      iconBg: 'rgba(55,138,221,0.1)', iconColor: '#378ADD',
      badge: 'this month', badgeBg: 'rgba(55,138,221,0.1)', badgeColor: '#378ADD',
      value: loading ? '—' : String(caseNotesMonth ?? 0), label: 'Case notes submitted',
    },
    {
      IconComp: GraduationCap,
      iconBg: 'rgba(127,119,221,0.1)', iconColor: '#7F77DD',
      badge: trainingDueSoon > 0 ? `${trainingDueSoon} due soon` : 'all current',
      badgeBg: trainingDueSoon > 0 ? 'rgba(186,117,23,0.12)' : 'rgba(48,176,96,0.1)',
      badgeColor: trainingDueSoon > 0 ? '#BA7517' : '#30B060',
      value: userRole === null ? '—' : `${trainingCompleted}/${trainings.length}`,
      label: 'Trainings completed',
    },
  ]

  const avatarColors = ['#008080','#378ADD','#BA7517','#7F77DD','#30B060']
  function initials(name: string) {
    const parts = name.trim().split(' ')
    return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)
  }

  const panel: React.CSSProperties = { background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }
  const panelHeader: React.CSSProperties = { padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }

  const quickActions = [
    { IconComp: Clock,    label: 'Log hours',       bg: 'rgba(0,128,128,0.1)',   color: '#008080', sub: loading ? '' : `${hoursDisplay} hrs this week`, href: '/staff/timesheet' },
    { IconComp: FilePlus, label: 'Add case note',   bg: 'rgba(48,176,96,0.12)',  color: '#30B060', sub: loading ? '' : `${caseNotesMonth ?? 0} submitted this month`, href: '/staff/case-notes' },
    { IconComp: Upload,   label: 'Upload document', bg: 'rgba(55,138,221,0.1)',  color: '#378ADD', sub: '', href: '/staff/documents' },
  ]

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>My overview</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{todayLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
            <Bell size={18} />
          </div>
          {(pendingNotes ?? 0) > 0 && <div style={{ position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', border: '1.5px solid #fff' }} />}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}>
          <Settings size={18} />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Welcome banner */}
        <div style={{ background: '#002830', borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'white' }}>
              Good morning{firstName ? `, ${firstName}` : ''} 👋
            </div>
            <div style={{ fontSize: 12, color: '#a8c8cc', marginTop: 3 }}>
              {loading
                ? 'Loading your data…'
                : `${clientCount} client${clientCount !== 1 ? 's' : ''} assigned · ${pendingNotes ?? 0} note${(pendingNotes ?? 0) !== 1 ? 's' : ''} pending`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { val: loading ? '—' : hoursDisplay, lbl: 'Hours this week' },
              { val: loading ? '—' : String(clientCount), lbl: 'Clients assigned' },
              { val: loading ? '—' : String(pendingNotes ?? 0), lbl: 'Notes pending' },
            ].map((stat, i) => (
              <div key={stat.lbl} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {i > 0 && <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 500, color: 'white' }}>{stat.val}</div>
                  <div style={{ fontSize: 11, color: '#a8c8cc', marginTop: 2 }}>{stat.lbl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.iconColor }}>
                  <m.IconComp size={18} />
                </div>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 10, fontWeight: 500, background: m.badgeBg, color: m.badgeColor }}>{m.badge}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 500, color: '#111', letterSpacing: -0.5 }}>{m.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div style={{ marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Quick actions</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
            {quickActions.map((qa) => (
              <a key={qa.label} href={qa.href} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: qa.bg, color: qa.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <qa.IconComp size={20} />
                </div>
                <span style={{ fontSize: 12, color: '#111', fontWeight: 500 }}>{qa.label}</span>
                {qa.sub && <span style={{ fontSize: 11, color: '#9ca3af' }}>{qa.sub}</span>}
              </a>
            ))}
          </div>
        </div>

        {/* Two-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Assigned clients */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>My assigned clients</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{clientCount} total</span>
              </div>
              {loading && (
                <div style={{ padding: '20px 16px', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
              )}
              {!loading && assignedClients.length === 0 && (
                <div style={{ padding: '20px 16px', color: '#9ca3af', fontSize: 13 }}>No clients assigned yet.</div>
              )}
              {!loading && assignedClients.map((c, i) => {
                const color = avatarColors[i % avatarColors.length]
                const bg = color + '1F'
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < assignedClients.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                      {initials(c.full_name).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{c.full_name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href="/staff/case-notes" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #008080', background: 'rgba(0,128,128,0.08)', color: '#008080', cursor: 'pointer', textDecoration: 'none' }}>Case note</a>
                      <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#111', cursor: 'pointer' }}>View</button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* My training */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>My training</span>
                <a href="/staff/training" style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>View all</a>
              </div>
              {userRole === null ? (
                <div style={{ padding: '20px 16px', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
              ) : trainings.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < trainings.length - 1 ? '0.5px solid #e5e7eb' : 'none' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: t.iconBg, color: t.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                    <i className={`ti ${t.icon}`} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{t.meta}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                      <div style={{ flex: 1, height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, background: t.barColor, width: `${t.pct}%` }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#6b7280', width: 28, textAlign: 'right' }}>{t.pct}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Hours summary */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>This week&apos;s hours</span>
                <a href="/staff/timesheet" style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>Log time</a>
              </div>
              <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 500, color: '#111', lineHeight: 1 }}>
                    {loading ? '—' : hoursDisplay}
                  </span>
                  <span style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>hrs logged</span>
                </div>
                <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: '#008080', width: `${Math.min(100, ((hoursThisWeek ?? 0) / 40) * 100)}%`, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>of 40 hrs standard week</div>
                <a href="/staff/timesheet" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#008080', fontWeight: 500, textDecoration: 'none' }}>
                  <ExternalLink size={13} /> View full timesheet
                </a>
              </div>
            </div>

            {/* Case notes summary */}
            <div style={panel}>
              <div style={panelHeader}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>Case notes</span>
                <a href="/staff/case-notes" style={{ fontSize: 12, color: '#008080', cursor: 'pointer', fontWeight: 500, textDecoration: 'none' }}>Add note</a>
              </div>
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: 'rgba(48,176,96,0.08)', border: '0.5px solid rgba(48,176,96,0.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 500, color: '#30B060' }}>{loading ? '—' : String(caseNotesMonth ?? 0)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Submitted this month</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(186,117,23,0.08)', border: '0.5px solid rgba(186,117,23,0.2)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 500, color: '#BA7517' }}>{loading ? '—' : String(pendingNotes ?? 0)}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Drafts pending</div>
                  </div>
                </div>
                <a href="/staff/case-notes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px', background: 'rgba(0,128,128,0.06)', border: '0.5px solid rgba(0,128,128,0.15)', borderRadius: 8, fontSize: 12, color: '#008080', fontWeight: 500, textDecoration: 'none', cursor: 'pointer' }}>
                  <FileText size={13} /> Open case notes
                </a>
              </div>
            </div>

            {/* Expiring certs */}
            <div style={panel}>
              <div style={{ ...panelHeader, gap: 8 }}>
                <GraduationCap size={15} color={loading ? '#9ca3af' : expiringCerts.length > 0 ? '#E24B4A' : '#30B060'} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111', flex: 1 }}>Expiring certs</span>
                {!loading && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: expiringCerts.length > 0 ? 'rgba(226,75,74,0.1)' : 'rgba(48,176,96,0.1)', color: expiringCerts.length > 0 ? '#E24B4A' : '#30B060' }}>
                    {expiringCerts.length > 0 ? expiringCerts.length : '✓'}
                  </span>
                )}
              </div>
              {loading ? (
                <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13 }}>Loading…</div>
              ) : expiringCerts.length === 0 ? (
                <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CircleCheck size={15} color="#30B060" />
                  <span style={{ fontSize: 13, color: '#6b7280' }}>All certificates are current</span>
                </div>
              ) : (
                <>
                  {expiringCerts.map((cert, i) => {
                    const expired = cert.daysLeft <= 0
                    const urgent  = cert.daysLeft > 0 && cert.daysLeft <= 14
                    const color   = expired || urgent ? '#E24B4A' : cert.daysLeft <= 30 ? '#BA7517' : '#d97706'
                    return (
                      <div key={i} style={{ padding: '11px 16px', borderBottom: i < expiringCerts.length - 1 ? '0.5px solid #f3f4f6' : 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 6, background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <GraduationCap size={14} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{cert.type}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                            {expired
                              ? `Expired ${Math.abs(cert.daysLeft)} day${Math.abs(cert.daysLeft) !== 1 ? 's' : ''} ago`
                              : `Expires ${cert.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color, lineHeight: 1 }}>
                            {expired ? '!' : cert.daysLeft}
                          </div>
                          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                            {expired ? 'expired' : 'days left'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ padding: '10px 16px', borderTop: '0.5px solid #e5e7eb' }}>
                    <a href="/staff/documents" style={{ fontSize: 12, color: '#008080', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Upload size={13} /> Upload updated certificate
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
