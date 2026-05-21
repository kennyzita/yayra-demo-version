'use client'

import { useState, useEffect } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────
function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + n); return d
}
function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function fmt12(t: string) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function deadlineInfo(createdAt: string): { label: string; urgent: boolean } {
  const ms = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000 - Date.now()
  if (ms <= 0) return { label: '', urgent: false }
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return { label: h > 0 ? `${h}h ${m}m left` : `${m}m left`, urgent: h < 2 }
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string; client_id: string; dsp_id: string
  date: string; start_time: string; end_time: string
  status: string; notes: string; created_at: string; responded_at: string | null
}
interface Client { id: string; full_name: string }

const STATUS_STYLE = {
  pending:      { bg: 'rgba(245,158,11,0.13)',  color: '#d97706', label: 'Pending'       },
  accepted:     { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Accepted'      },
  rejected:     { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', label: 'Rejected'      },
  auto_accepted:{ bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', label: 'Auto-accepted' },
} as const

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── component ─────────────────────────────────────────────────────────────────
export default function StaffMySchedulePage() {
  const today = new Date()

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState<string | null>(null)
  const [responding, setResponding] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    // Fire-and-forget auto-accept
    fetch('/api/schedules/auto-accept', { method: 'POST' }).catch(() => {})

    // Use server-side route so the auth cookie is read properly server-side,
    // bypassing any browser-client JWT/RLS mismatch
    const res = await fetch('/api/schedules/mine')
    if (!res.ok) {
      console.error('[my-schedule] API error:', res.status, await res.text())
      setLoading(false)
      return
    }

    const { schedules: data, clients: clientData } = await res.json()
    console.log('[my-schedule] schedules:', data?.length ?? 0, data)

    setSchedules((data ?? []) as Schedule[])
    setClients((clientData ?? []) as Client[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function respond(scheduleId: string, status: 'accepted' | 'rejected') {
    setResponding(scheduleId)
    const res = await fetch('/api/schedules/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, status }),
    })
    setResponding(null)
    if (!res.ok) { showToast('Failed to submit — please try again'); return }
    showToast(status === 'accepted' ? 'Shift accepted!' : 'Shift rejected.')
    load()
  }

  const clientMap  = Object.fromEntries(clients.map(c => [c.id, c.full_name]))
  const weekEnd    = addDays(weekStart, 6)
  const weekLabel  = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  // All schedules for the current week view
  const weekSchedules = schedules.filter(s => s.date >= isoDate(weekStart) && s.date <= isoDate(weekEnd))

  // Pending schedules across all weeks (for the banner)
  const pendingCount = schedules.filter(s => {
    if (s.status !== 'pending') return false
    const ms = new Date(s.created_at).getTime() + 24 * 60 * 60 * 1000 - Date.now()
    return ms > 0
  }).length

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
        Loading schedule…
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>My Schedule</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{weekLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.12)', border: '0.5px solid #fcd34d', borderRadius: 8, padding: '6px 12px' }}>
            <i className="ti ti-clock" style={{ color: '#d97706', fontSize: 14 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#d97706' }}>{pendingCount} shift{pendingCount > 1 ? 's' : ''} awaiting your response</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 24, background: '#f9fafb', minHeight: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Info banner */}
        <div style={{ background: 'rgba(0,128,128,0.06)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 10, padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <i className="ti ti-info-circle" style={{ color: '#008080', fontSize: 15, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#374151' }}>
            You have <strong>24 hours</strong> to accept or reject a new shift. No response = automatically accepted.
          </span>
        </div>

        {/* Week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setWeekStart(w => addDays(w, -7))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <i className="ti ti-chevron-left" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111', minWidth: 210, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <i className="ti ti-chevron-right" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(today))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            Today
          </button>
        </div>

        {/* 7-day calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {DAYS.map((day, i) => {
            const date    = addDays(weekStart, i)
            const dateStr = isoDate(date)
            const isToday = dateStr === isoDate(today)
            const daySched = weekSchedules.filter(s => s.date === dateStr)

            return (
              <div key={day} style={{ background: '#fff', border: isToday ? '1.5px solid #008080' : '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', minHeight: 150, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                {/* Day header */}
                <div style={{ padding: '10px 12px 8px', borderBottom: '0.5px solid #f3f4f6', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{day}</span>
                  <div style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: isToday ? 'rgba(0,128,128,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#008080' : '#374151' }}>{date.getDate()}</span>
                  </div>
                </div>

                {/* Shift cards */}
                <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {daySched.map(s => {
                    const st = STATUS_STYLE[s.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending
                    const isPending = s.status === 'pending'
                    const dl = isPending ? deadlineInfo(s.created_at) : null
                    const canRespond = isPending && !!dl?.label

                    return (
                      <div key={s.id} style={{ background: st.bg, border: `1px solid ${st.color}30`, borderRadius: 9, padding: '8px 9px' }}>
                        {/* Time */}
                        <div style={{ fontSize: 11, fontWeight: 700, color: st.color }}>
                          {fmt12(s.start_time)} – {fmt12(s.end_time)}
                        </div>
                        {/* Client */}
                        <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 2 }}>
                          {clientMap[s.client_id] ?? '—'}
                        </div>
                        {/* Notes */}
                        {s.notes && (
                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontStyle: 'italic' }}>"{s.notes}"</div>
                        )}

                        {/* Status / deadline */}
                        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.6)', color: st.color, fontWeight: 700 }}>{st.label}</span>
                          {canRespond && dl && (
                            <span style={{ fontSize: 9, color: dl.urgent ? '#dc2626' : '#d97706', fontWeight: 600 }}>
                              · {dl.label}
                            </span>
                          )}
                        </div>

                        {/* Accept / Reject buttons */}
                        {canRespond && (
                          <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                            <button
                              onClick={() => respond(s.id, 'rejected')}
                              disabled={responding === s.id}
                              style={{ flex: 1, padding: '5px 0', fontSize: 10, fontWeight: 600, borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => respond(s.id, 'accepted')}
                              disabled={responding === s.id}
                              style={{ flex: 2, padding: '5px 0', fontSize: 10, fontWeight: 600, borderRadius: 6, border: 'none', background: '#008080', color: '#fff', cursor: 'pointer', opacity: responding === s.id ? 0.7 : 1 }}
                            >
                              {responding === s.id ? '…' : 'Accept'}
                            </button>
                          </div>
                        )}

                        {/* Locked */}
                        {s.status === 'auto_accepted' && (
                          <div style={{ marginTop: 5, fontSize: 9, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <i className="ti ti-lock" style={{ fontSize: 10 }} /> Auto-accepted
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {daySched.length === 0 && (
                    <div style={{ textAlign: 'center', paddingTop: 16, fontSize: 11, color: '#d1d5db' }}>—</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_STYLE).map(([key, s]) => {
            const count = schedules.filter(sc => sc.status === key).length
            return (
              <div key={key} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{count}</span>
              </div>
            )
          })}
        </div>

        {/* All-weeks list for past/upcoming outside current view */}
        {schedules.filter(s => s.date < isoDate(weekStart) || s.date > isoDate(weekEnd)).length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Other weeks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {schedules
                .filter(s => s.date < isoDate(weekStart) || s.date > isoDate(weekEnd))
                .map(s => {
                  const st = STATUS_STYLE[s.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending
                  const isPast = s.date < isoDate(today)
                  const dl = s.status === 'pending' ? deadlineInfo(s.created_at) : null
                  const canRespond = s.status === 'pending' && !!dl?.label
                  return (
                    <div key={s.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '12px 16px', opacity: isPast ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 44, textAlign: 'center', background: st.bg, borderRadius: 8, padding: '6px 4px', flexShrink: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: st.color, textTransform: 'uppercase' }}>
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: st.color, lineHeight: 1.1 }}>
                          {new Date(s.date + 'T12:00:00').getDate()}
                        </div>
                        <div style={{ fontSize: 9, color: st.color }}>
                          {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{clientMap[s.client_id] ?? '—'}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{fmt12(s.start_time)} – {fmt12(s.end_time)}</div>
                        {s.notes && <div style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>"{s.notes}"</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>{st.label}</span>
                        {canRespond && dl && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => respond(s.id, 'rejected')} disabled={responding === s.id} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}>Reject</button>
                            <button onClick={() => respond(s.id, 'accepted')} disabled={responding === s.id} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, border: 'none', background: '#008080', color: '#fff', cursor: 'pointer' }}>Accept</button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
