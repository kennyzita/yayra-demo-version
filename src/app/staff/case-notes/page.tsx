'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

const STRATEGIES = [
  { title: 'Assistance with Activities of Daily Living', desc: 'Getting dressed, eating, personal hygiene, etc.' },
  { title: 'Assistance with Increasing Community Participation', desc: 'Daily errands, attending events, restaurant, purchasing items, travel training, etc.' },
  { title: 'Assistance with Increasing Independence', desc: 'Laundry, cooking, cleaning, dressing, grocery shopping, paying for items, etc.' },
  { title: 'Assistance with On-The-Job Support', desc: 'Safety awareness, restroom use, attending to task, lunch/breaks, etc.' },
  { title: 'Assistance with Learning Activities', desc: 'Basic tutoring – math, reading, writing; support attending a class; etc.' },
  { title: 'Assistance with Socialization', desc: 'Conversation skills, peer interaction, community events, clubs, etc.' },
]

function getNoteTag(strategies: string[]): { label: string; bg: string; color: string } {
  const first = (strategies[0] ?? '').toLowerCase()
  if (first.includes('health') || first.includes('wellness')) {
    return { label: 'Medical Note', bg: 'rgba(234,179,8,0.13)', color: '#854d0e' }
  }
  if (first.includes('daily living') || first.includes('transportation') || first.includes('on-the-job')) {
    return { label: 'Routine', bg: 'rgba(34,197,94,0.12)', color: '#15803d' }
  }
  return { label: 'Progress Note', bg: 'rgba(99,102,241,0.1)', color: '#4338ca' }
}

function formatClientTitle(name: string, clientId: string): string {
  const parts = name.trim().split(' ')
  const formatted = parts.length >= 2
    ? `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`
    : name
  const num = parseInt(clientId.replace(/-/g, '').slice(0, 4), 16) % 9000 + 1000
  return `${formatted} — Client #${String(num).padStart(4, '0')}`
}

function getNoteDescription(entries: { desc?: string; strategy?: string }[]): string {
  const descs = entries.map(e => e.desc).filter(Boolean)
  if (descs.length > 0) return descs.slice(0, 2).join(' ').slice(0, 260) + (descs.join(' ').length > 260 ? '…' : '')
  const strats = entries.map(e => e.strategy).filter(Boolean)
  return strats.length > 0 ? strats[0]! : 'No description provided.'
}

function getNoteDateTime(entries: { date?: string; start?: string }[], submittedAt: string | null): string {
  const first = entries.find(e => e.date)
  if (first?.date) {
    const d = new Date(first.date + 'T00:00:00')
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = first.start
      ? (() => {
          const [h, m] = first.start!.split(':').map(Number)
          return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
        })()
      : ''
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr
  }
  if (submittedAt) {
    const d = new Date(submittedAt)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return '—'
}

function generateWeeks(): string[] {
  const weeks: string[] = []
  const today = new Date()
  const lastSun = new Date(today)
  lastSun.setDate(today.getDate() - today.getDay())
  for (let i = 0; i < 8; i++) {
    const sun = new Date(lastSun)
    sun.setDate(lastSun.getDate() - i * 7)
    const sat = new Date(sun)
    sat.setDate(sun.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    weeks.push(`${fmt(sun)} – ${fmt(sat)}`)
  }
  return weeks
}

function addOneHour(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'rgba(0,122,122,0.1)',   color: '#007a7a', label: 'Submitted' },
  approved:  { bg: 'rgba(22,163,74,0.1)',   color: '#16a34a', label: 'Approved'  },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626', label: 'Rejected'  },
  draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Draft'     },
}

type AssignedClient = { id: string; name: string; isp_outcome: string }
type Entry = { id: number; date: string; start: string; end: string; strategy: string; desc: string }
type HistoryNote = {
  id: string; client_id: string; client_name: string
  week_label: string; submitted_at: string | null
  status: string; strategies: string[]; entries: Entry[]
}

export default function CaseNotesPage() {
  const supabase = createClient()
  const WEEKS = generateWeeks()
  const nextIdRef = useRef(2)

  const [loading, setLoading]               = useState(true)
  const [staffName, setStaffName]           = useState('')
  const [userId, setUserId]                 = useState('')
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([])
  const [noClientsError, setNoClientsError] = useState(false)

  // Form state
  const [clientId, setClientId]   = useState('')
  const [week, setWeek]           = useState(WEEKS[0])
  const [checked, setChecked]     = useState<boolean[]>(new Array(STRATEGIES.length).fill(false))
  const [entries, setEntries]     = useState<Entry[]>([{ id: 1, date: '', start: '', end: '', strategy: '', desc: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]         = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  // History state
  const [showHistory, setShowHistory]         = useState(false)
  const [history, setHistory]                 = useState<HistoryNote[]>([])
  const [historyLoading, setHistoryLoading]   = useState(false)
  const [expandedId, setExpandedId]           = useState<string | null>(null)
  const [deletingId, setDeletingId]           = useState<string | null>(null)

  // Autosave entries to sessionStorage whenever they change
  useEffect(() => {
    if (!userId) return
    const timer = setTimeout(() => {
      sessionStorage.setItem(`case_note_draft_${userId}`, JSON.stringify({ entries }))
    }, 600)
    return () => clearTimeout(timer)
  }, [entries, userId])

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    // Restore autosaved draft
    try {
      const saved = sessionStorage.getItem(`case_note_draft_${user.id}`)
      if (saved) {
        const { entries: savedEntries } = JSON.parse(saved)
        if (Array.isArray(savedEntries) && savedEntries.length > 0) {
          setEntries(savedEntries)
          nextIdRef.current = Math.max(...savedEntries.map((e: any) => e.id ?? 1)) + 1
        }
      }
    } catch {}

    const [{ data: profile }, { data: assignments }] = await Promise.all([
      supabase.from('users').select('first_name, last_name').eq('id', user.id).single(),
      supabase.from('assignments').select('client_id, clients(id, full_name)').eq('dsp_id', user.id),
    ])

    if (profile) setStaffName(`${profile.first_name} ${profile.last_name}`)

    if (!assignments || assignments.length === 0) {
      setNoClientsError(true); setLoading(false); return
    }

    const clientIds = assignments.map((a: any) => a.client_id)
    const { data: billingData } = await supabase
      .from('billing_client_data').select('client_id, data').in('client_id', clientIds)

    const ispMap = new Map<string, string>()
    for (const b of (billingData ?? []) as any[]) {
      if (!ispMap.has(b.client_id)) ispMap.set(b.client_id, b.data?.isp_outcome ?? '')
    }

    setAssignedClients(assignments.map((a: any) => ({
      id: a.client_id,
      name: (a.clients as any)?.full_name ?? 'Unknown',
      isp_outcome: ispMap.get(a.client_id) ?? '',
    })))
    setLoading(false)
  }

  async function loadHistory() {
    if (!userId) return
    setHistoryLoading(true)
    const { data } = await supabase
      .from('case_notes')
      .select('id, client_id, week_label, submitted_at, status, strategies, entries')
      .eq('dsp_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(50)

    const clientMap = new Map(assignedClients.map(c => [c.id, c.name]))
    setHistory((data ?? []).map((n: any) => ({
      id: n.id, client_id: n.client_id,
      client_name: clientMap.get(n.client_id) ?? 'Unknown client',
      week_label: n.week_label, submitted_at: n.submitted_at,
      status: n.status ?? 'submitted',
      strategies: n.strategies ?? [],
      entries: (n.entries ?? []).map((e: any, i: number) => ({ ...e, id: i + 1 })),
    })))
    setHistoryLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function startEdit(note: HistoryNote) {
    setEditingNoteId(note.id)
    setClientId(note.client_id)
    setWeek(note.week_label)
    setChecked(STRATEGIES.map(s => note.strategies.includes(s.title)))
    const restored = note.entries.map((e, i) => ({
      id: i + 1, date: e.date ?? '', start: e.start ?? '',
      end: e.end ?? '', strategy: e.strategy ?? '', desc: e.desc ?? '',
    }))
    setEntries(restored.length > 0 ? restored : [{ id: 1, date: '', start: '', end: '', strategy: '', desc: '' }])
    nextIdRef.current = (restored.length || 1) + 1
    setShowHistory(false)
    showToast('Editing case note — modify and save')
  }

  async function handleDelete(noteId: string) {
    if (!confirm('Delete this case note? This cannot be undone.')) return
    setDeletingId(noteId)
    const { error } = await supabase.from('case_notes').delete().eq('id', noteId)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Case note deleted'); setHistory(prev => prev.filter(n => n.id !== noteId)) }
    setDeletingId(null)
  }

  function toggleStrategy(i: number) {
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  function addEntry() {
    setEntries(prev => [...prev, { id: nextIdRef.current++, date: '', start: '', end: '', strategy: '', desc: '' }])
  }

  function removeEntry(id: number) {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  function updateEntry(id: number, field: keyof Entry, val: string) {
    setEntries(prev => prev.map(e => {
      if (e.id !== id) return e
      if (field === 'start') return { ...e, start: val, end: addOneHour(val) }
      return { ...e, [field]: val }
    }))
  }

  async function doSubmit() {
    if (!clientId) { showToast('Please select a client first'); return }
    if (entries.length === 0) { showToast('Add at least one activity entry'); return }
    for (const e of entries) {
      if (e.start && e.end) {
        const [sh, sm] = e.start.split(':').map(Number)
        const [eh, em] = e.end.split(':').map(Number)
        if ((eh * 60 + em) - (sh * 60 + sm) !== 60) {
          showToast(`Entry at ${e.start} must be exactly 1 hour (start → start + 1h)`)
          return
        }
      }
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Not authenticated'); return }
    const selectedStrategies = STRATEGIES.filter((_, i) => checked[i]).map(s => s.title)
    setSubmitting(true)

    if (editingNoteId) {
      const { error } = await supabase.from('case_notes')
        .update({ client_id: clientId, week_label: week, strategies: selectedStrategies, entries, updated_at: new Date().toISOString() })
        .eq('id', editingNoteId)
      if (error) showToast('Error: ' + error.message)
      else { showToast('Case note updated ✓'); setEditingNoteId(null); resetForm() }
    } else {
      const { error } = await supabase.from('case_notes').insert({
        dsp_id: user.id, client_id: clientId, week_label: week,
        strategies: selectedStrategies, entries, status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      if (error) showToast('Error: ' + error.message)
      else { showToast('Case note submitted ✓'); resetForm() }
    }
    setSubmitting(false)
  }

  function resetForm() {
    setClientId(''); setChecked(new Array(STRATEGIES.length).fill(false))
    setEntries([{ id: 1, date: '', start: '', end: '', strategy: '', desc: '' }])
    nextIdRef.current = 2; setWeek(WEEKS[0])
    if (userId) sessionStorage.removeItem(`case_note_draft_${userId}`)
  }

  function clearForm() { resetForm(); setEditingNoteId(null); showToast('Form cleared') }

  const selectedClient = assignedClients.find(c => c.id === clientId) ?? null

  const totalHours = entries.reduce((sum, e) => {
    if (!e.start || !e.end) return sum
    const [sh, sm] = e.start.split(':').map(Number)
    const [eh, em] = e.end.split(':').map(Number)
    return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60
  }, 0)

  const sectionStyle: React.CSSProperties = { border: '1px solid #d8dde6', borderRadius: 10, overflow: 'hidden', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
  const sectionHead: React.CSSProperties = { background: '#004050', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }
  const sectionBody: React.CSSProperties = { background: 'white', padding: 20 }
  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 7 }
  const inputStyle: React.CSSProperties = { width: '100%', fontSize: 14, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', outline: 'none', fontFamily: 'inherit' }
  const readOnly: React.CSSProperties = { width: '100%', fontSize: 14, color: '#6b7280', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 14px', fontFamily: 'inherit' }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12, color: '#6b7280', fontSize: 14 }}>
      <i className="ti ti-loader-2" style={{ fontSize: 28 }} />Loading…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#f4f5f7' }}>
      {/* Topbar */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>
          Community-Based Supports Log
          {editingNoteId && <span style={{ fontSize: 11, marginLeft: 10, background: 'rgba(234,179,8,0.12)', color: '#854d0e', padding: '2px 10px', borderRadius: 20, fontWeight: 600 }}>Editing</span>}
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={async () => { const next = !showHistory; setShowHistory(next); if (next) { setEditingNoteId(null); await loadHistory() } }}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}>
          <i className="ti ti-history" /> {showHistory ? 'New entry' : 'View history'}
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {noClientsError && (
          <div style={{ padding: '14px 18px', borderRadius: 10, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.4)', color: '#854d0e', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 18, flexShrink: 0 }} />
            You have no assigned clients. Contact your administrator.
          </div>
        )}

        {showHistory ? (
          /* ── History — artifact card design ── */
          <div>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Case Notes</div>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>Document client progress, incidents, and service delivery</div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#008080', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                + New Note
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <i className="ti ti-loader-2" style={{ fontSize: 24, display: 'block', marginBottom: 10 }} />Loading…
              </div>
            ) : history.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                <i className="ti ti-notes-off" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#d1d5db' }} />No submissions yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.map(note => {
                  const tag        = getNoteTag(note.strategies)
                  const title      = formatClientTitle(note.client_name, note.client_id)
                  const desc       = getNoteDescription(note.entries)
                  const dateTime   = getNoteDateTime(note.entries, note.submitted_at)
                  const isExpanded = expandedId === note.id
                  const canEdit    = note.status !== 'approved'
                  const isDeleting = deletingId === note.id

                  return (
                    <div key={note.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      {/* Card body */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : note.id)}
                        style={{ padding: '20px 24px', cursor: 'pointer' }}
                      >
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 8 }}>{title}</div>
                        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.65, marginBottom: 14 }}>{desc}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, color: '#9ca3af' }}>{dateTime}</span>
                          <span style={{ fontSize: 12, padding: '4px 13px', borderRadius: 20, fontWeight: 500, background: tag.bg, color: tag.color }}>{tag.label}</span>
                          {note.status === 'approved' && (
                            <span style={{ fontSize: 12, padding: '4px 13px', borderRadius: 20, fontWeight: 500, background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>Approved</span>
                          )}
                          <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 13, color: '#d1d5db', marginLeft: 'auto' }} />
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid #f3f4f6', padding: '18px 24px', background: '#fafafa' }}>
                          {note.strategies.length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Strategies</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {note.strategies.map(s => (
                                  <span key={s} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,64,80,0.07)', color: '#004050', fontWeight: 500 }}>{s}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {note.entries.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Activity log</div>
                              {note.entries.map((e, ei) => (
                                <div key={ei} style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: '1px solid #e5e7eb' }}>
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: e.desc ? 6 : 0 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                                      {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                                    </span>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>{e.start} – {e.end}</span>
                                    {e.strategy && <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 10, background: 'rgba(0,64,80,0.07)', color: '#004050' }}>{e.strategy}</span>}
                                  </div>
                                  {e.desc && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{e.desc}</div>}
                                </div>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8 }}>
                            {canEdit ? (
                              <>
                                <button onClick={() => startEdit(note)}
                                  style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid #008080', background: '#fff', color: '#008080', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit' }}>
                                  <i className="ti ti-edit" /> Edit
                                </button>
                                <button onClick={() => handleDelete(note.id)} disabled={isDeleting}
                                  style={{ fontSize: 13, padding: '7px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: isDeleting ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isDeleting ? 0.5 : 1 }}>
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
            )}
          </div>
        ) : (
          /* ── New / Edit form ── */
          <>
            {editingNoteId && (
              <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)', color: '#854d0e', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><i className="ti ti-edit" /> Editing existing case note — changes will update the record.</span>
                <button onClick={() => { setEditingNoteId(null); clearForm() }} style={{ fontSize: 12, color: '#854d0e', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  Cancel edit
                </button>
              </div>
            )}

            {/* Client Information */}
            <div style={sectionStyle}>
              <div style={sectionHead}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Client Information</span>
                {clientId && <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 600 }}>✓ Loaded</span>}
              </div>
              <div style={sectionBody}>
                <div style={{ marginBottom: 16 }}>
                  <div style={fieldLabel}>Select client <span style={{ color: '#e24b4a' }}>*</span></div>
                  <div style={{ position: 'relative' }}>
                    <select value={clientId} onChange={e => setClientId(e.target.value)} disabled={noClientsError}
                      style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: noClientsError ? 'not-allowed' : 'pointer' }}>
                      <option value="">— Select your assigned client —</option>
                      {assignedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={fieldLabel}>Client name <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
                  <input readOnly value={selectedClient?.name ?? ''} placeholder="Select a client above" style={readOnly} />
                </div>
                <div>
                  <div style={fieldLabel}>ISP outcome <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
                  <textarea readOnly value={selectedClient?.isp_outcome ?? ''} placeholder="Select a client to populate" style={{ ...readOnly, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }} />
                </div>
              </div>
            </div>

            {/* Service Week */}
            <div style={sectionStyle}>
              <div style={sectionHead}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Service Week</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Sunday – Saturday</span>
              </div>
              <div style={sectionBody}>
                <div style={{ ...fieldLabel, marginBottom: 7 }}>Select service week <span style={{ color: '#e24b4a' }}>*</span></div>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <select value={week} onChange={e => setWeek(e.target.value)} style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}>
                    {WEEKS.map(w => <option key={w}>{w}</option>)}
                  </select>
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
                </div>
                <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '13px 16px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#004050', marginTop: 10 }}>{week}</div>
              </div>
            </div>

            {/* Service Strategies */}
            <div style={sectionStyle}>
              <div style={sectionHead}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Service Strategies</span>
                <button onClick={() => setChecked(new Array(STRATEGIES.length).fill(true))} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Check all</button>
              </div>
              <div style={{ ...sectionBody, padding: '4px 20px' }}>
                {STRATEGIES.map((s, i) => (
                  <div key={i} onClick={() => toggleStrategy(i)} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 4px', borderBottom: i < STRATEGIES.length - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 22, height: 22, border: checked[i] ? 'none' : '2px solid #d1d5db', borderRadius: 5, flexShrink: 0, marginTop: 2, background: checked[i] ? '#004050' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13, fontWeight: 700, transition: 'all 0.15s' }}>
                      {checked[i] && '✓'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#004050', marginBottom: 3 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Activity Log */}
            <div style={sectionStyle}>
              <div style={sectionHead}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Daily Activity Log</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>Each entry = exactly 1 hour</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.18)', padding: '2px 12px', borderRadius: 20 }}>
                    {totalHours} {totalHours === 1 ? 'hr' : 'hrs'}
                  </span>
                </div>
              </div>
              <div style={{ ...sectionBody, padding: 16 }}>
                {entries.map((entry, i) => (
                  <div key={entry.id} style={{ border: '1px solid #d1d5db', borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ background: '#dce8f5', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#004050' }}>Entry #{i + 1}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: '#555' }}>{entry.date ? new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}</span>
                        {entries.length > 1 && (
                          <button onClick={() => removeEntry(entry.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#e24b4a', background: '#fff0f0', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                            ✕ Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: '18px 16px', background: 'white' }}>
                      <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '0 0 200px' }}>
                          <div style={{ ...fieldLabel, marginBottom: 7 }}>Date <span style={{ color: '#e24b4a' }}>*</span></div>
                          <input type="date" value={entry.date} onChange={e => updateEntry(entry.id, 'date', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                        </div>
                        <div style={{ flex: '0 0 155px' }}>
                          <div style={{ ...fieldLabel, marginBottom: 7 }}>Start time <span style={{ color: '#e24b4a' }}>*</span></div>
                          <input type="time" value={entry.start} onChange={e => updateEntry(entry.id, 'start', e.target.value)} style={{ ...inputStyle, width: '100%' }} />
                        </div>
                        <div style={{ flex: '0 0 155px' }}>
                          <div style={{ ...fieldLabel, marginBottom: 7 }}>End time <span style={{ fontSize: 9, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-set</span></div>
                          <input type="time" readOnly value={entry.end} style={{ ...inputStyle, width: '100%', background: '#f9fafb', color: '#6b7280' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ ...fieldLabel, marginBottom: 7 }}>Service strategy <span style={{ color: '#e24b4a' }}>*</span></div>
                        <div style={{ position: 'relative' }}>
                          <select value={entry.strategy} onChange={e => updateEntry(entry.id, 'strategy', e.target.value)} style={{ ...inputStyle, paddingRight: 40, appearance: 'none', cursor: 'pointer' }}>
                            <option value="">— Select Strategy —</option>
                            {STRATEGIES.map(s => <option key={s.title}>{s.title}</option>)}
                          </select>
                          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%) rotate(90deg)', fontSize: 14, color: '#1a56db', pointerEvents: 'none', fontWeight: 700 }}>❯</span>
                        </div>
                      </div>
                      <div>
                        <div style={{ ...fieldLabel, marginBottom: 7 }}>Activity description</div>
                        <textarea value={entry.desc} onChange={e => updateEntry(entry.id, 'desc', e.target.value)} placeholder="Describe the activity and how it supports the individual's outcome…" style={{ width: '100%', fontSize: 13, color: '#1a1a1a', background: 'white', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', outline: 'none', resize: 'vertical', minHeight: 90, lineHeight: 1.6, fontFamily: 'inherit' }} />
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addEntry} style={{ width: '100%', padding: 18, border: '2.5px dashed #1a56db', borderRadius: 10, background: '#f0f5ff', color: '#004050', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                  + Add Activity Entry
                </button>
              </div>
            </div>

            {/* Completed by */}
            <div style={sectionStyle}>
              <div style={sectionHead}><span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Completed By</span></div>
              <div style={sectionBody}>
                <div style={fieldLabel}>Staff name <span style={{ fontSize: 10, fontWeight: 400, color: '#9ca3af', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>auto-filled</span></div>
                <input readOnly value={staffName} style={readOnly} />
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <button onClick={doSubmit} disabled={submitting || !clientId}
                style={{ fontSize: 15, fontWeight: 700, padding: '16px 28px', borderRadius: 8, border: 'none', background: submitting ? '#6b7280' : '#2d7d4e', color: 'white', cursor: submitting ? 'wait' : (!clientId ? 'not-allowed' : 'pointer'), opacity: !clientId ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
                {submitting
                  ? <><i className="ti ti-loader-2" /> {editingNoteId ? 'Saving…' : 'Submitting…'}</>
                  : editingNoteId ? <>💾 Save Changes</> : <>📄 Submit Case Note</>}
              </button>
              <button onClick={clearForm} style={{ fontSize: 14, fontWeight: 600, color: '#374151', background: 'transparent', border: 'none', cursor: 'pointer', padding: '16px 20px', fontFamily: 'inherit' }}>
                {editingNoteId ? 'Cancel' : 'Clear Form'}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: 'white', fontSize: 13, padding: '10px 18px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <span>✓</span><span>{toast}</span>
        </div>
      )}
    </div>
  )
}
