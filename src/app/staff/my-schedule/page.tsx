'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── helpers ───────────────────────────────────────────────────────────────────
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
  const label = h > 0 ? `${h}h ${m}m left to respond` : `${m}m left to respond`
  return { label, urgent: h < 2 }
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string; client_id: string; dsp_id: string
  date: string; start_time: string; end_time: string
  status: string; notes: string; created_at: string; responded_at: string | null
}
interface Client { id: string; full_name: string }

const STATUS_STYLE = {
  pending:      { bg: 'rgba(245,158,11,0.12)',  color: '#d97706', icon: 'ti-clock',        label: 'Awaiting response'  },
  accepted:     { bg: 'rgba(16,185,129,0.12)',  color: '#059669', icon: 'ti-check',        label: 'Accepted'           },
  rejected:     { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', icon: 'ti-x',            label: 'Rejected'           },
  auto_accepted:{ bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', icon: 'ti-circle-check', label: 'Auto-accepted'      },
} as const

// ── component ─────────────────────────────────────────────────────────────────
export default function StaffMySchedulePage() {
  const supabase = createClient()

  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [clients,   setClients]   = useState<Client[]>([])
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState<string | null>(null)
  const [responding, setResponding] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    // Auto-accept any expired pending schedules via server route
    await fetch('/api/schedules/auto-accept', { method: 'POST' })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [s, c] = await Promise.all([
      supabase.from('schedules').select('*')
        .eq('dsp_id', user.id)
        .order('date', { ascending: false })
        .order('start_time'),
      supabase.from('clients').select('id, full_name'),
    ])
    setSchedules((s.data ?? []) as Schedule[])
    setClients((c.data ?? []) as Client[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.full_name]))
  const todayStr = isoDate(new Date())

  async function respond(scheduleId: string, status: 'accepted' | 'rejected') {
    setResponding(scheduleId)
    const res = await fetch('/api/schedules/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId, status }),
    })
    setResponding(null)
    if (!res.ok) { showToast('Failed to submit response — please try again'); return }
    showToast(status === 'accepted' ? 'Shift accepted!' : 'Shift rejected.')
    load()
  }

  const upcoming = schedules.filter(s => s.date >= todayStr)
  const past     = schedules.filter(s => s.date < todayStr)

  function ScheduleCard({ s }: { s: Schedule }) {
    const st = STATUS_STYLE[s.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending
    const isPending = s.status === 'pending'
    const deadline = isPending ? deadlineInfo(s.created_at) : null
    const withinWindow = deadline && deadline.label !== ''

    const dateLabel = new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

    return (
      <div style={{ background: '#fff', border: `0.5px solid #e5e7eb`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Accent top bar */}
        <div style={{ height: 3, background: st.color, opacity: 0.7 }} />
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            {/* Date block */}
            <div style={{ minWidth: 52, textAlign: 'center', background: st.bg, borderRadius: 10, padding: '8px 4px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: st.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: st.color, lineHeight: 1.1 }}>
                {new Date(s.date + 'T12:00:00').getDate()}
              </div>
              <div style={{ fontSize: 10, color: st.color, opacity: 0.8 }}>
                {new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{clientMap[s.client_id] ?? 'Client'}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.color, fontWeight: 600 }}>
                  <i className={`ti ${st.icon}`} style={{ marginRight: 3, fontSize: 10 }} />
                  {st.label}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>
                <i className="ti ti-calendar" style={{ marginRight: 5 }} />
                {dateLabel}
              </div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: s.notes ? 6 : 0 }}>
                <i className="ti ti-clock" style={{ marginRight: 5 }} />
                {fmt12(s.start_time)} – {fmt12(s.end_time)}
              </div>
              {s.notes && (
                <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 }}>"{s.notes}"</div>
              )}
            </div>
          </div>

          {/* Deadline warning */}
          {isPending && withinWindow && (
            <div style={{ marginTop: 12, background: deadline!.urgent ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `0.5px solid ${deadline!.urgent ? '#fca5a5' : '#fcd34d'}`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={`ti ti-alarm`} style={{ color: deadline!.urgent ? '#dc2626' : '#d97706', fontSize: 14 }} />
              <span style={{ fontSize: 12, color: deadline!.urgent ? '#dc2626' : '#d97706', fontWeight: 500 }}>{deadline!.label}</span>
            </div>
          )}

          {/* Action buttons */}
          {isPending && withinWindow && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={() => respond(s.id, 'rejected')}
                disabled={responding === s.id}
                style={{ flex: 1, padding: '9px', border: '0.5px solid #fca5a5', borderRadius: 8, background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
              >
                <i className="ti ti-x" style={{ fontSize: 14 }} />
                Reject
              </button>
              <button
                onClick={() => respond(s.id, 'accepted')}
                disabled={responding === s.id}
                style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 8, background: '#008080', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: responding === s.id ? 0.7 : 1 }}
              >
                <i className="ti ti-check" style={{ fontSize: 14 }} />
                {responding === s.id ? 'Submitting…' : 'Accept Shift'}
              </button>
            </div>
          )}

          {/* Locked message for auto-accepted */}
          {s.status === 'auto_accepted' && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="ti ti-lock" />
              Automatically accepted — 24-hour window passed
            </div>
          )}
        </div>
      </div>
    )
  }

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
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>My Schedule</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Your upcoming and past shifts</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, background: '#f9fafb', minHeight: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Response info banner */}
        <div style={{ background: 'rgba(0,128,128,0.06)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <i className="ti ti-info-circle" style={{ color: '#008080', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
            You have <strong>24 hours</strong> from when a shift is assigned to accept or reject. Shifts with no response are automatically accepted and cannot be changed.
          </div>
        </div>

        {/* Upcoming */}
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12 }}>
            Upcoming Shifts
            {upcoming.filter(s => s.status === 'pending').length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#d97706', fontWeight: 600 }}>
                {upcoming.filter(s => s.status === 'pending').length} pending response
              </span>
            )}
          </div>
          {upcoming.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 14, padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <i className="ti ti-calendar-off" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              No upcoming shifts scheduled
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.map(s => <ScheduleCard key={s.id} s={s} />)}
            </div>
          )}
        </div>

        {/* Past */}
        {past.length > 0 && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 12 }}>Past Shifts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, opacity: 0.75 }}>
              {past.map(s => <ScheduleCard key={s.id} s={s} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
