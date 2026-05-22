'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── helpers ──────────────────────────────────────────────────────────────────
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function leadingBlanks(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}
function isoDate(d: Date) { return d.toISOString().split('T')[0] }
function fmt12(t: string) {
  if (!t) return ''
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// ── types ─────────────────────────────────────────────────────────────────────
interface Schedule {
  id: string; client_id: string; dsp_id: string; scheduled_by: string
  date: string; start_time: string; end_time: string
  status: string; notes: string; created_at: string
}
interface Client   { id: string; full_name: string }
interface User     { id: string; first_name: string; last_name: string; email: string }
interface Assignment { dsp_id: string; client_id: string }

const STATUS_STYLE = {
  pending:      { bg: 'rgba(245,158,11,0.13)',  color: '#d97706', label: 'Pending'       },
  accepted:     { bg: 'rgba(16,185,129,0.12)',  color: '#059669', label: 'Accepted'      },
  rejected:     { bg: 'rgba(239,68,68,0.1)',    color: '#dc2626', label: 'Rejected'      },
  auto_accepted:{ bg: 'rgba(99,102,241,0.12)',  color: '#6366f1', label: 'Auto-accepted' },
} as const

const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ── email html ────────────────────────────────────────────────────────────────
function buildDspEmail({ dspName, clientName, date, start, end, notes }: {
  dspName: string; clientName: string; date: string; start: string; end: string; notes: string
}) {
  const dateStr = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#008080;padding:24px;color:#fff"><h2 style="margin:0;font-size:20px">Home Health Care — New Schedule</h2></div>
    <div style="padding:24px">
      <p style="color:#374151;font-size:15px">Hi ${dspName},</p>
      <p style="color:#374151;font-size:14px">You've been scheduled for a shift. Log in to <strong>Home Health Care</strong> to accept or reject within <strong>24 hours</strong>. No action means automatic acceptance.</p>
      <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:20px 0">
        <table style="width:100%;font-size:14px;color:#111">
          <tr><td style="padding:6px 0;color:#6b7280;width:90px">Client</td><td style="font-weight:600">${clientName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="font-weight:600">${dateStr}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Time</td><td style="font-weight:600">${fmt12(start)} – ${fmt12(end)}</td></tr>
          ${notes ? `<tr><td style="padding:6px 0;color:#6b7280">Notes</td><td>${notes}</td></tr>` : ''}
        </table>
      </div>
      <a href="${appUrl}/staff/my-schedule" style="display:inline-block;background:#008080;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">View My Schedule →</a>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px">Home Health Care · Contact your supervisor with any questions.</p>
    </div>
  </div>`
}

// ── component ─────────────────────────────────────────────────────────────────
export default function AdminSchedulingPage() {
  const supabase = createClient()
  const today = new Date()

  const [month, setMonth]             = useState(() => startOfMonth(today))
  const [schedules, setSchedules]     = useState<Schedule[]>([])
  const [clients, setClients]         = useState<Client[]>([])
  const [allUsers, setAllUsers]       = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [toast, setToast]             = useState<string | null>(null)
  const [panelOpen, setPanelOpen]     = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  // form
  const [fClient, setFClient] = useState('')
  const [fDsp,    setFDsp]    = useState('')
  const [fDate,   setFDate]   = useState('')
  const [fStart,  setFStart]  = useState('')
  const [fEnd,    setFEnd]    = useState('')
  const [fNotes,  setFNotes]  = useState('')

  const monthEnd = endOfMonth(month)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 6000)
  }

  const load = useCallback(async () => {
    const [s, c, u, a] = await Promise.all([
      supabase.from('schedules').select('*')
        .gte('date', isoDate(month))
        .lte('date', isoDate(monthEnd))
        .order('date').order('start_time'),
      supabase.from('clients').select('id, full_name').order('full_name'),
      supabase.from('users').select('id, first_name, last_name, email').order('first_name'),
      supabase.from('assignments').select('dsp_id, client_id'),
    ])
    setSchedules((s.data ?? []) as Schedule[])
    setClients((c.data ?? []) as Client[])
    setAllUsers((u.data ?? []) as User[])
    setAssignments((a.data ?? []) as Assignment[])
  }, [month])

  useEffect(() => { load() }, [load])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.full_name]))
  const userMap   = Object.fromEntries(allUsers.map(u => [u.id, `${u.first_name} ${u.last_name}`]))

  const dspsForClient = fClient
    ? assignments.filter(a => a.client_id === fClient).map(a => a.dsp_id)
    : []
  const dspOptions = allUsers.filter(u => dspsForClient.includes(u.id))

  function resetForm() {
    setFClient(''); setFDsp(''); setFDate(''); setFStart(''); setFEnd(''); setFNotes('')
  }

  async function handleSubmit() {
    if (!fClient || !fDsp || !fDate || !fStart || !fEnd) {
      showToast('Please fill all required fields'); return
    }
    if (fStart >= fEnd) { showToast('End time must be after start time'); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('schedules').insert({
        client_id: fClient, dsp_id: fDsp, scheduled_by: user?.id,
        date: fDate, start_time: fStart, end_time: fEnd, notes: fNotes, status: 'pending',
      })

      if (error) {
        console.error('[scheduling] insert error:', error)
        showToast(error.message ?? 'Failed to save schedule')
        setSaving(false)
        return
      }

      const dsp    = allUsers.find(u => u.id === fDsp)
      const client = clients.find(c => c.id === fClient)
      if (dsp?.email) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: dsp.email,
            subject: `Home Health Care: You've been scheduled`,
            html: buildDspEmail({
              dspName: `${dsp.first_name} ${dsp.last_name}`,
              clientName: client?.full_name ?? '',
              date: fDate, start: fStart, end: fEnd, notes: fNotes,
            }),
          }),
        })
      }

      setSaving(false)
      setPanelOpen(false)
      resetForm()
      showToast('Schedule created — DSP notified by email')
      load()
    } catch (err) {
      console.error('[scheduling] unexpected error:', err)
      showToast(err instanceof Error ? err.message : 'Unexpected error — check console')
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('schedules').delete().eq('id', id)
    if (error) { showToast('Delete failed'); return }
    setDeletingId(null)
    showToast('Schedule removed')
    load()
  }

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const blanks     = leadingBlanks(month)
  const daysCount  = monthEnd.getDate()

  const inp: React.CSSProperties = {
    width: '100%', border: '0.5px solid #d1d5db', borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color: '#111', outline: 'none',
    background: '#fff', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Scheduling</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{monthLabel}</div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { resetForm(); setPanelOpen(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008080', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <i className="ti ti-calendar-plus" style={{ fontSize: 15 }} />
          New Schedule
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 24, background: '#f9fafb', minHeight: 'calc(100% - 56px)', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setMonth(m => addMonths(m, -1))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <i className="ti ti-chevron-left" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111', minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
          <button onClick={() => setMonth(m => addMonths(m, 1))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <i className="ti ti-chevron-right" />
          </button>
          <button onClick={() => setMonth(startOfMonth(today))} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            Today
          </button>
        </div>

        {/* Monthly calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {/* Day-of-week headers */}
          {DAY_HEADERS.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#9ca3af', padding: '4px 0 6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{d}</div>
          ))}

          {/* Leading blank cells */}
          {Array.from({ length: blanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysCount }).map((_, i) => {
            const date    = new Date(month.getFullYear(), month.getMonth(), i + 1)
            const dateStr = isoDate(date)
            const isToday = dateStr === isoDate(today)
            const daySched = schedules.filter(s => s.date === dateStr)

            return (
              <div key={dateStr} style={{ background: '#fff', border: isToday ? '1.5px solid #008080' : '0.5px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', minHeight: 80, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                {/* Date number */}
                <div style={{ padding: '5px 6px 3px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: isToday ? 'rgba(0,128,128,0.1)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? '#008080' : '#374151' }}>{date.getDate()}</span>
                  </div>
                </div>
                {/* Shifts */}
                <div style={{ padding: '0 3px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {daySched.map(s => {
                    const st = STATUS_STYLE[s.status as keyof typeof STATUS_STYLE] ?? STATUS_STYLE.pending
                    return (
                      <div key={s.id} style={{ background: st.bg, border: `1px solid ${st.color}25`, borderRadius: 5, padding: '3px 5px' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: st.color }}>{fmt12(s.start_time)}</div>
                        <div style={{ fontSize: 9, color: '#374151', fontWeight: 600, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userMap[s.dsp_id] ?? '—'}</div>
                        <div style={{ fontSize: 9, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clientMap[s.client_id] ?? '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                          <span style={{ fontSize: 8, padding: '1px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.7)', color: st.color, fontWeight: 600 }}>{st.label}</span>
                          {deletingId === s.id ? (
                            <div style={{ display: 'flex', gap: 2 }}>
                              <button onClick={() => handleDelete(s.id)} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}>Del</button>
                              <button onClick={() => setDeletingId(null)} style={{ fontSize: 8, padding: '1px 4px', borderRadius: 3, background: '#e5e7eb', color: '#374151', border: 'none', cursor: 'pointer' }}>✕</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeletingId(s.id)} style={{ fontSize: 10, color: '#d1d5db', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                              <i className="ti ti-trash" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Status summary */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {Object.entries(STATUS_STYLE).map(([key, s]) => {
            const count = schedules.filter(sc => sc.status === key).length
            return (
              <div key={key} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Schedule Panel */}
      {panelOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
          <div onClick={() => setPanelOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 400, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111', flex: 1 }}>New Schedule</span>
              <button onClick={() => setPanelOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280', padding: 4 }}>
                <i className="ti ti-x" />
              </button>
            </div>

            <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={lbl}>Client *</label>
                <select value={fClient} onChange={e => { setFClient(e.target.value); setFDsp('') }} style={inp}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>DSP *</label>
                <select value={fDsp} onChange={e => setFDsp(e.target.value)} disabled={!fClient} style={{ ...inp, color: fClient ? '#111' : '#9ca3af' }}>
                  <option value="">
                    {!fClient ? 'Select a client first' : dspOptions.length ? 'Select DSP…' : 'No DSPs assigned to this client'}
                  </option>
                  {dspOptions.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Date *</label>
                <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} style={inp} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Start time *</label>
                  <input type="time" value={fStart} onChange={e => setFStart(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>End time *</label>
                  <input type="time" value={fEnd} onChange={e => setFEnd(e.target.value)} style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Notes</label>
                <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} rows={3} placeholder="Optional shift notes…" style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ background: 'rgba(0,128,128,0.06)', border: '0.5px solid rgba(0,128,128,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, color: '#008080', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <i className="ti ti-info-circle" style={{ marginTop: 1 }} />
                  <span>The DSP will receive an email notification and has 24 hours to accept or reject. No response = auto-accepted.</span>
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '0.5px solid #e5e7eb', display: 'flex', gap: 10 }}>
              <button onClick={() => setPanelOpen(false)} style={{ flex: 1, padding: 10, border: '0.5px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={saving} style={{ flex: 2, padding: 10, background: '#008080', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Create & Notify DSP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
