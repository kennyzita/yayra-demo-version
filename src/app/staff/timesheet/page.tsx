'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getWeeks(year: number, month: number) {
  const weeks: { label: string; start: Date }[] = []
  let cur = new Date(year, month, 1)
  cur.setDate(cur.getDate() - cur.getDay())
  const last = new Date(year, month + 1, 0)
  let n = 1
  while (cur <= last) {
    const s = new Date(cur)
    const e = new Date(cur); e.setDate(e.getDate() + 6)
    const fmt = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`
    weeks.push({ label: `Week ${n}: ${fmt(s)} – ${fmt(e)}`, start: new Date(s) })
    cur.setDate(cur.getDate() + 7); n++
  }
  return weeks
}

function calcDuration(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mn = (eh * 60 + em) - (sh * 60 + sm)
  if (mn < 0) mn += 24 * 60 // shift crosses midnight (e.g. 11 PM start -> 7 AM end)
  return mn > 0 ? Math.round(mn / 60 * 10) / 10 : null
}

function formatTime12h(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function timeRange(dateVal: string, start: string, end: string): { startMs: number; endMs: number } | null {
  if (!start || !end || !dateVal) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const s = new Date(dateVal + 'T00:00:00')
  s.setHours(sh, sm, 0, 0)
  const e = new Date(dateVal + 'T00:00:00')
  e.setHours(eh, em, 0, 0)
  if (e.getTime() <= s.getTime()) e.setDate(e.getDate() + 1) // crosses midnight
  return { startMs: s.getTime(), endMs: e.getTime() }
}

function rowRange(r: DayRow): { startMs: number; endMs: number } | null {
  return timeRange(r.dateVal, r.start, r.end)
}

function findRowOverlap(rows: DayRow[]): { a: DayRow; b: DayRow } | null {
  const ranged = rows.map(r => ({ row: r, range: rowRange(r) })).filter(x => x.range)
  for (let i = 0; i < ranged.length; i++) {
    for (let j = i + 1; j < ranged.length; j++) {
      const A = ranged[i].range!, B = ranged[j].range!
      if (A.startMs < B.endMs && B.startMs < A.endMs) return { a: ranged[i].row, b: ranged[j].row }
    }
  }
  return null
}

function findExternalOverlap(rows: DayRow[], others: { clientName: string; entries: any[] }[]): { row: DayRow; clientName: string; day: string; start: string; end: string } | null {
  for (const r of rows) {
    const A = rowRange(r)
    if (!A) continue
    for (const o of others) {
      for (const e of o.entries) {
        const B = timeRange(e.date, e.start, e.end)
        if (!B) continue
        if (A.startMs < B.endMs && B.startMs < A.endMs) {
          return { row: r, clientName: o.clientName, day: e.day, start: e.start, end: e.end }
        }
      }
    }
  }
  return null
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'rgba(0,122,122,0.1)',   color: '#007a7a', label: 'Submitted' },
  approved:  { bg: 'rgba(22,163,74,0.1)',   color: '#16a34a', label: 'Approved'  },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626', label: 'Rejected'  },
  draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Draft'     },
}

interface DayRow { day: string; date: string; dateVal: string; isToday: boolean; start: string; end: string }
interface AssignedClient { id: string; full_name: string }
interface TsHistory {
  id: string; client_id: string; client_name: string
  week_start: string; week_end: string
  total_hours: number; status: string
  submitted_at: string | null
  dsp_signed: boolean; client_signed: boolean
  entries: any[]
}

export default function TimesheetPage() {
  const supabase   = createClient()
  const todayReal  = new Date()
  const editModeRef = useRef(false)

  const [profile, setProfile]               = useState<{ firstName: string; lastName: string; role: string } | null>(null)
  const [staffId, setStaffId]               = useState('—')
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const [month,   setMonth]   = useState(todayReal.getMonth())
  const [year,    setYear]    = useState(todayReal.getFullYear())
  const [weekIdx, setWeekIdx] = useState(0)
  const [rows,    setRows]    = useState<DayRow[]>([])
  const [client,  setClient]  = useState('')
  const [dspSigned, setDspSigned]   = useState(false)
  const [cliSigned, setCliSigned]   = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [saving,    setSaving]      = useState(false)
  const [toast,     setToast]       = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)

  // DB-fetched week metrics
  const [dbHoursThisWeek,   setDbHoursThisWeek]   = useState(0)
  const [dbClientsThisWeek, setDbClientsThisWeek] = useState(0)

  // History state
  const [showHistory, setShowHistory]           = useState(false)
  const [tsHistory, setTsHistory]               = useState<TsHistory[]>([])
  const [tsHistoryLoading, setTsHistoryLoading] = useState(false)
  const [expandedTsId, setExpandedTsId]         = useState<string | null>(null)
  const [deletingTsId, setDeletingTsId]         = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      setLoadingClients(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: prof }, { data: asgData }, { data: allUsersData }, { data: billingData }] = await Promise.all([
        supabase.from('users').select('first_name, last_name, role:roles(name)').eq('id', user.id).single(),
        supabase.from('assignments').select('client_id, clients(id, full_name)').eq('dsp_id', user.id),
        supabase.from('users').select('id, first_name, last_name').order('created_at', { ascending: true }),
        supabase.from('billing_staff_data').select('data').eq('staff_id', user.id).maybeSingle(),
      ])
      if (prof) {
        setProfile({ firstName: prof.first_name, lastName: prof.last_name, role: (prof.role as any)?.name ?? 'DSP' })
        const customId = (billingData?.data as any)?.staffId as string | undefined
        if (customId) {
          setStaffId(customId)
        } else {
          const fullName = `${prof.first_name} ${prof.last_name}`.trim()
          if (fullName === 'Rasheed Yekini') {
            setStaffId('RCS-001')
          } else {
            const others = (allUsersData ?? []).filter((u: any) => `${u.first_name} ${u.last_name}`.trim() !== 'Rasheed Yekini')
            const pos = others.findIndex((u: any) => u.id === user.id)
            setStaffId(pos >= 0 ? `RCS-${String(pos + 2).padStart(3, '0')}` : 'RCS-002')
          }
        }
      }
      const clients: AssignedClient[] = (asgData || []).map((a: any) => a.clients).filter(Boolean)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name))
      setAssignedClients(clients)
      setLoadingClients(false)
    })()
  }, [])

  // Fetch actual submitted hours + clients for the current week from DB
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('timesheets')
        .select('client_id, total_hours')
        .eq('dsp_id', user.id)
        .lte('week_start', today)
        .gte('week_end', today)
      if (data) {
        setDbHoursThisWeek(data.reduce((s, t) => s + (Number(t.total_hours) || 0), 0))
        setDbClientsThisWeek(new Set(data.map(t => t.client_id)).size)
      }
    })()
  }, [])

  useEffect(() => {
    if (!client || rows.length === 0) return
    if (editModeRef.current) { editModeRef.current = false; return }
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const weekStart = weeks[weekIdx]?.start
      if (!weekStart) return
      const ws = weekStart.toISOString().slice(0, 10)
      const { data } = await supabase.from('timesheets')
        .select('id, entries, total_hours, status, dsp_signed, client_signed')
        .eq('dsp_id', user.id).eq('client_id', client).eq('week_start', ws).maybeSingle()
      if (data) {
        setExistingId(data.id)
        setRows(prev => prev.map((r, i) => {
          const e = (data.entries as any[])[i]
          return e ? { ...r, start: e.start ?? '', end: e.end ?? '' } : r
        }))
        setDspSigned(data.dsp_signed ?? false)
        setCliSigned(data.client_signed ?? false)
        setSubmitted(data.status === 'submitted' || data.status === 'approved')
      } else {
        setExistingId(null)
        setDspSigned(false); setCliSigned(false); setSubmitted(false)
      }
    })()
  }, [client, weekIdx, month, year, rows.length])

  const weeks = getWeeks(year, month)
  const wkRange = (() => {
    const w = weeks[weekIdx]; if (!w) return ''
    const e = new Date(w.start); e.setDate(e.getDate() + 6)
    const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${f(w.start)} – ${f(e)}`
  })()

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  function loadWeek() {
    const w = weeks[weekIdx]; if (!w) return
    const newRows: DayRow[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(w.start); d.setDate(d.getDate() + i)
      newRows.push({
        day: DAYS[d.getDay()],
        date: `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`,
        dateVal: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
        isToday: d.toDateString() === todayReal.toDateString(),
        start: '', end: '',
      })
    }
    setRows(newRows); setSubmitted(false); setDspSigned(false); setCliSigned(false)
    showToast('Week loaded — all 7 days ready')
  }

  const updateRow = useCallback((i: number, field: 'start'|'end', val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }, [])

  function calcHours(r: DayRow) {
    return calcDuration(r.start, r.end)
  }

  const totalHours = rows.reduce((acc, r) => { const h = calcHours(r); return h ? acc + h : acc }, 0)
  const remaining  = Math.max(0, Math.round((40 - totalHours)*10)/10)

  async function doSubmit() {
    if (!rows.length) { showToast('Please load a week first'); return }
    if (!client)      { showToast('Please select a client'); return }
    if (!dspSigned)   { showToast('Please add your signature first'); return }
    const overlap = findRowOverlap(rows)
    if (overlap) {
      showToast(`Overlap hours: ${overlap.a.day} (${formatTime12h(overlap.a.start)}–${formatTime12h(overlap.a.end)}) overlaps with ${overlap.b.day} (${formatTime12h(overlap.b.start)}–${formatTime12h(overlap.b.end)})`)
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Not authenticated'); setSaving(false); return }

    // Check against this DSP's other timesheets (different clients/weeks) for real-world time conflicts
    const { data: otherTs } = await supabase
      .from('timesheets')
      .select('id, client_id, entries, status')
      .eq('dsp_id', user.id)
      .neq('status', 'rejected')
    const clientMap = new Map(assignedClients.map(c => [c.id, c.full_name]))
    const others = (otherTs ?? [])
      .filter(t => t.id !== existingId)
      .map(t => ({ clientName: clientMap.get(t.client_id) ?? 'another client', entries: (t.entries as any[]) ?? [] }))
    const ext = findExternalOverlap(rows, others)
    if (ext) {
      showToast(`Overlap hours: ${ext.row.day} (${formatTime12h(ext.row.start)}–${formatTime12h(ext.row.end)}) overlaps with hours already logged for ${ext.clientName} on ${ext.day} (${formatTime12h(ext.start)}–${formatTime12h(ext.end)})`)
      setSaving(false)
      return
    }

    const w = weeks[weekIdx]
    const weekStart = w.start.toISOString().slice(0, 10)
    const weekEnd   = new Date(w.start); weekEnd.setDate(weekEnd.getDate() + 6)
    const entries   = rows.map(r => ({ day: r.day, date: r.dateVal, start: r.start, end: r.end, hours: calcHours(r) ?? 0 }))
    const payload = {
      dsp_id: user.id, client_id: client,
      week_start: weekStart, week_end: weekEnd.toISOString().slice(0, 10),
      entries, total_hours: totalHours,
      status: 'submitted', dsp_signed: dspSigned, client_signed: cliSigned,
      submitted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
    const { error } = existingId
      ? await supabase.from('timesheets').update(payload).eq('id', existingId)
      : await supabase.from('timesheets').insert(payload)
    if (error) showToast('Save failed: ' + error.message)
    else { setSubmitted(true); showToast('Timesheet submitted for approval ✓') }
    setSaving(false)
  }

  async function loadTsHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setTsHistoryLoading(true)
    const { data } = await supabase
      .from('timesheets')
      .select('id, client_id, week_start, week_end, total_hours, status, submitted_at, dsp_signed, client_signed, entries')
      .eq('dsp_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(50)
    const clientMap = new Map(assignedClients.map(c => [c.id, c.full_name]))
    setTsHistory((data ?? []).map((t: any) => ({
      id: t.id, client_id: t.client_id,
      client_name: clientMap.get(t.client_id) ?? 'Unknown client',
      week_start: t.week_start, week_end: t.week_end,
      total_hours: t.total_hours ?? 0,
      status: t.status ?? 'submitted',
      submitted_at: t.submitted_at,
      dsp_signed: t.dsp_signed ?? false,
      client_signed: t.client_signed ?? false,
      entries: t.entries ?? [],
    })))
    setTsHistoryLoading(false)
  }

  function startEditTs(ts: TsHistory) {
    if (ts.status === 'approved') { showToast('This timesheet has been approved and cannot be edited'); return }
    editModeRef.current = true
    setClient(ts.client_id)
    const d = new Date(ts.week_start + 'T00:00:00')
    const y = d.getFullYear(); const m = d.getMonth()
    setYear(y); setMonth(m)
    const wks = getWeeks(y, m)
    const idx = wks.findIndex(w => w.start.toISOString().slice(0, 10) === ts.week_start)
    setWeekIdx(idx >= 0 ? idx : 0)
    const restoredRows: DayRow[] = ts.entries.map((e: any) => {
      const dateObj = e.date ? new Date(e.date + 'T00:00:00') : null
      return {
        day: e.day ?? '',
        date: dateObj ? `${dateObj.getMonth()+1}/${dateObj.getDate()}/${dateObj.getFullYear()}` : '',
        dateVal: e.date ?? '',
        isToday: false,
        start: e.start ?? '',
        end: e.end ?? '',
      }
    })
    setRows(restoredRows)
    setDspSigned(ts.dsp_signed)
    setCliSigned(ts.client_signed)
    setExistingId(ts.id)
    setSubmitted(false)
    setShowHistory(false)
    showToast('Editing timesheet — make changes and resubmit')
  }

  async function handleDeleteTs(tsId: string) {
    if (!confirm('Delete this timesheet? This cannot be undone.')) return
    setDeletingTsId(tsId)
    const { error } = await supabase.from('timesheets').delete().eq('id', tsId)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Timesheet deleted'); setTsHistory(prev => prev.filter(t => t.id !== tsId)) }
    setDeletingTsId(null)
  }

  const selectedClientName = assignedClients.find(c => c.id === client)?.full_name ?? ''
  const staffName  = profile ? `${profile.firstName} ${profile.lastName}` : '—'
  const inputStyle: React.CSSProperties = { border: 'none', borderBottom: '1px solid #ccc', background: 'transparent', fontSize: 13, color: '#1a1a1a', padding: '4px 2px', width: 100, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>My timesheet</span>
        <div style={{ flex: 1 }} />
        <button onClick={async () => { const next = !showHistory; setShowHistory(next); if (next) await loadTsHistory() }}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '1px solid #16a34a', background: '#16a34a', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className="ti ti-history" /> {showHistory ? 'New entry' : 'View history'}
        </button>
        <button style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => window.print()}>
          <i className="ti ti-download" /> Download PDF
        </button>
      </div>

      {showHistory ? (
        /* ── History view ── */
        <div style={{ padding: '20px 24px' }}>
          <div style={{ border: '1px solid #d8dde6', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#004050', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>My Timesheet History</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{tsHistory.length} record{tsHistory.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ background: 'white' }}>
              {tsHistoryLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <i className="ti ti-loader-2" style={{ fontSize: 22, display: 'block', marginBottom: 8 }} />Loading…
                </div>
              ) : tsHistory.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <i className="ti ti-clock-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#d1d5db' }} />No timesheets submitted yet.
                </div>
              ) : tsHistory.map((ts, i) => {
                const ss = STATUS_STYLE[ts.status] ?? STATUS_STYLE.draft
                const isExpanded = expandedTsId === ts.id
                const canEdit = ts.status !== 'approved'
                const isDeleting = deletingTsId === ts.id
                const fmtDate = (s: string) => {
                  const d = new Date(s + 'T00:00:00')
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                }
                return (
                  <div key={ts.id} style={{ borderBottom: i < tsHistory.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                    <div onClick={() => setExpandedTsId(isExpanded ? null : ts.id)}
                      style={{ padding: '15px 20px', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 3 }}>{ts.client_name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(ts.week_start)} – {fmtDate(ts.week_end)}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>{ts.total_hours} hrs total</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, fontWeight: 600 }}>{ss.label}</span>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {ts.submitted_at ? new Date(ts.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: '#9ca3af', marginTop: 2, flexShrink: 0 }} />
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 20px 18px', borderTop: '0.5px solid #f3f4f6' }}>
                        {/* Mini hours table */}
                        <div style={{ marginTop: 14, marginBottom: 14, overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: '#f3f4f6' }}>
                                {['Day','Date','Start','End','Hours'].map((h, hi) => (
                                  <th key={h} style={{ padding: '8px 12px', fontWeight: 600, color: '#374151', textAlign: hi === 4 ? 'right' : 'left', paddingRight: hi === 4 ? 12 : undefined }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {ts.entries.map((e: any, ei: number) => {
                                const h = calcDuration(e.start, e.end)
                                const dateObj = e.date ? new Date(e.date + 'T00:00:00') : null
                                return (
                                  <tr key={ei} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>{e.day}</td>
                                    <td style={{ padding: '8px 12px', color: '#6b7280' }}>{dateObj ? `${dateObj.getMonth()+1}/${dateObj.getDate()}` : '—'}</td>
                                    <td style={{ padding: '8px 12px' }}>{e.start || '—'}</td>
                                    <td style={{ padding: '8px 12px' }}>{e.end || '—'}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: h ? 600 : 400, color: h ? '#004050' : '#aaa' }}>{h ? `${h}h` : '—'}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr style={{ background: '#f5f8ff', borderTop: '2px solid #004050' }}>
                                <td colSpan={4} style={{ padding: '8px 12px', fontWeight: 600, fontSize: 13 }}>Total</td>
                                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#004050', textAlign: 'right', fontSize: 13 }}>{ts.total_hours}h</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: ts.dsp_signed ? 'rgba(22,163,74,0.1)' : '#f3f4f6', color: ts.dsp_signed ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
                            <i className={`ti ${ts.dsp_signed ? 'ti-circle-check' : 'ti-circle-x'}`} /> DSP signed
                          </span>
                          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: ts.client_signed ? 'rgba(22,163,74,0.1)' : '#f3f4f6', color: ts.client_signed ? '#16a34a' : '#9ca3af', fontWeight: 500 }}>
                            <i className={`ti ${ts.client_signed ? 'ti-circle-check' : 'ti-circle-x'}`} /> Client signed
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {canEdit ? (
                            <>
                              <button onClick={() => startEditTs(ts)}
                                style={{ fontSize: 13, padding: '7px 16px', borderRadius: 7, border: '1px solid #004050', background: 'white', color: '#004050', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                                <i className="ti ti-edit" /> Edit
                              </button>
                              <button onClick={() => handleDeleteTs(ts.id)} disabled={isDeleting}
                                style={{ fontSize: 13, padding: '7px 16px', borderRadius: 7, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: isDeleting ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isDeleting ? 0.5 : 1 }}>
                                <i className={`ti ${isDeleting ? 'ti-loader-2' : 'ti-trash'}`} /> {isDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <i className="ti ti-lock" /> Approved — no further changes allowed
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Entry form ── */
        <div style={{ padding: '20px 24px' }}>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12, marginBottom: 20 }}>
            {((): { val: string; lbl: string; pill: string; pillBg: string; pillColor: string }[] => {
              const rem = Math.max(0, Math.round((40 - dbHoursThisWeek) * 10) / 10)
              return [
                { val: dbHoursThisWeek.toFixed(1), lbl: 'Total hours this week', pill: dbHoursThisWeek === 0 ? 'Not started' : dbHoursThisWeek < 40 ? 'In progress' : 'Complete', pillBg: dbHoursThisWeek === 0 ? 'rgba(100,140,255,0.12)' : dbHoursThisWeek < 40 ? 'rgba(0,160,160,0.1)' : 'rgba(30,160,80,0.1)', pillColor: dbHoursThisWeek === 0 ? '#4060c0' : dbHoursThisWeek < 40 ? '#008080' : '#187a40' },
                { val: '40', lbl: 'Expected hours', pill: 'Full time', pillBg: 'rgba(100,140,255,0.12)', pillColor: '#4060c0' },
                { val: rem.toFixed(1), lbl: 'Hours remaining', pill: rem > 0 ? `${rem} hrs left` : 'Complete!', pillBg: 'rgba(200,110,40,0.12)', pillColor: '#b05a10' },
                { val: String(dbClientsThisWeek), lbl: 'Clients served', pill: 'This week', pillBg: 'rgba(30,160,80,0.1)', pillColor: '#187a40' },
              ]
            })().map((m, i) => (
              <div key={i} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '18px 16px 14px' }}>
                <div style={{ fontSize: 28, fontWeight: 500, color: '#111', letterSpacing: -0.5, lineHeight: 1.1 }}>{m.val}</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{m.lbl}</div>
                <div style={{ display: 'inline-block', marginTop: 10, fontSize: 12, padding: '3px 10px', borderRadius: 20, background: m.pillBg, color: m.pillColor }}>{m.pill}</div>
              </div>
            ))}
          </div>

          {/* Form doc */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: '24px 28px 32px' }}>
            {/* Employee strip */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 36, marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid #e8e8e8' }}>
              {[{ lbl: 'Employee name', val: staffName }, { lbl: 'Position / Role', val: profile?.role ?? '—' }, { lbl: 'Staff ID', val: staffId }].map(f => (
                <div key={f.lbl}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#666', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {f.lbl} <span style={{ fontSize: 9, background: '#004050', color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>AUTO</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{f.val}</div>
                </div>
              ))}
            </div>

            {/* Client selector */}
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Client information</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Select client</div>
            {loadingClients ? (
              <div style={{ fontSize: 13, color: '#9ca3af', padding: '10px 0' }}>Loading your assigned clients…</div>
            ) : assignedClients.length === 0 ? (
              <div style={{ fontSize: 13, color: '#dc2626', padding: '10px 0' }}>You have no assigned clients. Contact your admin.</div>
            ) : (
              <div style={{ position: 'relative', borderBottom: '1.5px solid #004050', marginBottom: 20 }}>
                <select value={client} onChange={e => setClient(e.target.value)} style={{ width: '100%', fontSize: 14, color: '#444', background: 'transparent', border: 'none', padding: '8px 32px 8px 0', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                  <option value="">— Select your assigned client —</option>
                  {assignedClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
                <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 12, color: '#004050', pointerEvents: 'none' }}>❯</span>
              </div>
            )}

            {/* Week selector */}
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '20px 0 10px' }}>Select week</div>
            <div style={{ position: 'relative', border: '0.5px solid #d0d0d0', borderRadius: 6, marginBottom: 20 }}>
              <div style={{ padding: '12px 36px 12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Month</label>
                  <select value={month} onChange={e => { setMonth(+e.target.value); setWeekIdx(0) }} style={{ fontSize: 13, padding: '6px 28px 6px 10px', border: '1px solid #ccc', borderRadius: 5, background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer', appearance: 'none' }}>
                    {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </select>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Week</label>
                  <select value={weekIdx} onChange={e => setWeekIdx(+e.target.value)} style={{ fontSize: 13, padding: '6px 28px 6px 10px', border: '1px solid #ccc', borderRadius: 5, background: '#fff', color: '#1a1a1a', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: 168 }}>
                    {weeks.map((w, i) => <option key={i} value={i}>{w.label}</option>)}
                  </select>
                  <label style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>Year</label>
                  <input type="number" value={year} onChange={e => setYear(+e.target.value)} min={2020} max={2030} style={{ width: 76, fontSize: 13, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 5, background: '#fff', color: '#1a1a1a', outline: 'none' }} />
                  <button onClick={loadWeek} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 6, border: 'none', background: '#004050', color: '#fff', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    ↻ Load week
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>{wkRange}</div>
              </div>
            </div>

            {/* Daily hours table */}
            <div style={{ fontSize: 11, fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Daily hours</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10 }}>
              <thead>
                <tr style={{ background: '#004050' }}>
                  {['Day','Date','Start time','End time','Hours'].map((h, i) => (
                    <th key={h} style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#fff', textAlign: i === 4 ? 'right' : 'left', paddingRight: i === 4 ? 16 : 14 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '20px 14px', fontSize: 13, color: '#aaa', textAlign: 'center' }}>Select a week and click "Load week" to enter hours</td></tr>
                ) : rows.map((r, i) => {
                  const h = calcHours(r)
                  return (
                    <tr key={i} style={{ background: r.isToday ? '#f0f7ff' : 'white', borderBottom: '1px solid #f0f0f0', borderLeft: r.isToday ? '3px solid #004050' : '3px solid transparent' }}>
                      <td style={{ padding: '11px 14px', fontSize: 13, color: '#1a1a1a' }}>
                        <span style={{ fontWeight: 600 }}>{r.day}</span>
                        {r.isToday && <span style={{ fontSize: 10, background: 'rgba(0,128,128,0.08)', color: '#004050', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 600 }}>Today</span>}
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 12, color: '#888' }}>{r.date}</td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="time" value={r.start} onChange={e => updateRow(i, 'start', e.target.value)} style={inputStyle} />
                          <span style={{ fontSize: 14, color: '#aaa' }}>🕐</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="time" value={r.end} onChange={e => updateRow(i, 'end', e.target.value)} style={inputStyle} />
                          <span style={{ fontSize: 14, color: '#aaa' }}>🕐</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: h ? 600 : 400, color: h ? '#004050' : '#aaa', textAlign: 'right' }}>
                        {h ? `${h} hrs` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f5f8ff', borderTop: '2px solid #004050' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Weekly total</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#004050' }}>{totalHours.toFixed(1)} hrs</span>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
              {[
                { key: 'dsp', lbl: 'DSP signature', signed: dspSigned, name: staffName, onSign: () => { if (!submitted) { setDspSigned(true); showToast('DSP signature added') } } },
                { key: 'cli', lbl: 'Client signature', signed: cliSigned, name: selectedClientName || 'Client', onSign: () => { if (!submitted) { setCliSigned(true); showToast('Client signature added') } } },
              ].map(sig => (
                <div key={sig.key}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{sig.lbl}</div>
                  <div onClick={sig.onSign} style={{ border: `1px solid ${sig.signed ? '#1a9b55' : '#d0d0d0'}`, borderRadius: 6, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: sig.signed ? '#f0fff6' : '#fafafa' }}>
                    {sig.signed
                      ? <span style={{ fontSize: 20, color: '#1a9b55', fontStyle: 'italic' }}>{sig.name}</span>
                      : <span style={{ fontSize: 12, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-writing" /> Click to sign</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid #e8e8e8' }}>
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 10, fontWeight: 600, background: submitted ? 'rgba(0,128,128,0.08)' : '#f0f0f0', color: submitted ? '#004050' : '#888' }}>
                {submitted ? 'Submitted' : 'Draft'}
              </span>
              <button onClick={doSubmit} disabled={submitted || saving} style={{ fontSize: 13, padding: '9px 24px', borderRadius: 6, border: 'none', background: submitted ? '#d0d0d0' : '#004050', color: submitted ? '#999' : '#fff', cursor: submitted || saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {saving ? 'Saving…' : submitted ? 'Submitted ✓' : 'Submit timesheet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: '#fff', fontSize: 13, padding: '10px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 200 }}>
          <span>✓</span><span>{toast}</span>
        </div>
      )}
    </div>
  )
}
