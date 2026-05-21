'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type CnRecord = {
  id: string; dsp_id: string; client_id: string
  staff_name: string; client_name: string
  week_label: string; status: string
  submitted_at: string | null
  strategies: string[]; entries: any[]
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'rgba(234,179,8,0.12)',  color: '#854d0e', label: 'Pending'  },
  approved:  { bg: 'rgba(22,163,74,0.1)',   color: '#16a34a', label: 'Approved' },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626', label: 'Rejected' },
  draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Draft'    },
}

export default function AdminCaseNotesPage() {
  const supabase = createClient()

  const [records, setRecords]           = useState<CnRecord[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [actioning, setActioning]       = useState<string | null>(null)
  const [rejectingId, setRejectingId]   = useState<string | null>(null)
  const [toast, setToast]               = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: cnData }, { data: usersData }, { data: clientsData }] = await Promise.all([
      supabase.from('case_notes').select('*').order('submitted_at', { ascending: false }),
      supabase.from('users').select('id, first_name, last_name'),
      supabase.from('clients').select('id, full_name'),
    ])
    const userMap   = new Map((usersData   ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
    const clientMap = new Map((clientsData ?? []).map((c: any) => [c.id, c.full_name]))
    setRecords((cnData ?? []).map((n: any) => ({
      id: n.id, dsp_id: n.dsp_id, client_id: n.client_id,
      staff_name:  userMap.get(n.dsp_id)     ?? 'Unknown staff',
      client_name: clientMap.get(n.client_id) ?? 'Unknown client',
      week_label: n.week_label,
      status: n.status ?? 'submitted',
      submitted_at: n.submitted_at,
      strategies: n.strategies ?? [],
      entries: n.entries ?? [],
    })))
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function handleApprove(id: string) {
    setActioning(id)
    const { error } = await supabase.from('case_notes').update({ status: 'approved' }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Case note approved ✓'); setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)) }
    setActioning(null)
  }

  async function handleReject(id: string) {
    setActioning(id)
    const { error } = await supabase.from('case_notes').update({ status: 'rejected' }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Case note rejected'); setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)); setRejectingId(null) }
    setActioning(null)
  }

  const filtered = records.filter(r => {
    const matchSearch = search === '' ||
      r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      r.client_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || r.status === filterStatus
    return matchSearch && matchStatus
  })

  const pending  = records.filter(r => r.status === 'submitted').length
  const approved = records.filter(r => r.status === 'approved').length
  const rejected = records.filter(r => r.status === 'rejected').length

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Case Notes</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Review and approve DSP case note submissions</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '0 12px', height: 34, width: 220 }}>
          <i className="ti ti-search" style={{ fontSize: 15, color: '#9ca3af' }} />
          <input type="text" placeholder="Search staff or client…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#111', outline: 'none', width: '100%' }} />
        </div>
      </div>

      <div style={{ padding: '24px', background: '#f5f4ef', minHeight: 'calc(100% - 56px)' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total',          value: records.length, bg: '#fff',                color: '#111',    border: '#e5e7eb'             },
            { label: 'Pending review', value: pending,        bg: 'rgba(234,179,8,0.06)', color: '#854d0e', border: 'rgba(234,179,8,0.3)' },
            { label: 'Approved',       value: approved,       bg: 'rgba(22,163,74,0.06)', color: '#16a34a', border: 'rgba(22,163,74,0.25)'},
            { label: 'Rejected',       value: rejected,       bg: 'rgba(220,38,38,0.05)', color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['All', 'submitted', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filterStatus === f ? '#004050' : '#fff', color: filterStatus === f ? '#fff' : '#6b7280',
                boxShadow: '0 0 0 0.5px #e5e7eb' }}>
              {f === 'All' ? 'All' : f === 'submitted' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <i className="ti ti-notes-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 14 }}>No case notes found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => {
              const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft
              const isExpanded  = expandedId  === r.id
              const isActioning = actioning   === r.id
              const isRejecting = rejectingId === r.id
              const initials    = r.staff_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={r.id} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                  {/* Summary row */}
                  <div onClick={() => { setExpandedId(isExpanded ? null : r.id); setRejectingId(null) }}
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#008080', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{r.staff_name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        {r.client_name} · {r.week_label} · {r.entries.length} entr{r.entries.length !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, fontWeight: 600, flexShrink: 0 }}>{ss.label}</span>
                    <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
                      {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </div>
                    <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: '#9ca3af', flexShrink: 0 }} />
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ borderTop: '0.5px solid #f3f4f6', padding: '16px 20px 20px' }}>

                      {/* Strategies */}
                      {r.strategies.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Strategies</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {r.strategies.map(s => (
                              <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,64,80,0.08)', color: '#004050', fontWeight: 500 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activity entries */}
                      {r.entries.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Activity Log</div>
                          {r.entries.map((e: any, ei: number) => (
                            <div key={ei} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: '1px solid #e5e7eb' }}>
                              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: e.desc ? 6 : 0, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                  {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                                </span>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>{e.start} – {e.end}</span>
                                {e.strategy && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(0,64,80,0.07)', color: '#004050' }}>{e.strategy}</span>}
                              </div>
                              {e.desc && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{e.desc}</div>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      {r.status === 'submitted' && (
                        isRejecting ? (
                          <div style={{ background: '#fff8f8', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>Confirm rejection of this case note?</div>
                            <div style={{ display: 'flex', gap: 10 }}>
                              <button onClick={() => handleReject(r.id)} disabled={!!isActioning}
                                style={{ fontSize: 13, padding: '7px 18px', borderRadius: 7, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isActioning ? 0.6 : 1 }}>
                                {isActioning ? 'Rejecting…' : 'Confirm Reject'}
                              </button>
                              <button onClick={() => setRejectingId(null)}
                                style={{ fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => handleApprove(r.id)} disabled={!!isActioning}
                              style={{ fontSize: 13, padding: '8px 20px', borderRadius: 7, border: 'none', background: '#16a34a', color: 'white', cursor: isActioning ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: isActioning ? 0.6 : 1 }}>
                              <i className="ti ti-circle-check" /> {isActioning ? 'Approving…' : 'Approve'}
                            </button>
                            <button onClick={() => setRejectingId(r.id)}
                              style={{ fontSize: 13, padding: '8px 20px', borderRadius: 7, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <i className="ti ti-x" /> Reject
                            </button>
                          </div>
                        )
                      )}
                      {r.status === 'approved' && (
                        <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ti ti-circle-check" /> Approved
                        </span>
                      )}
                      {r.status === 'rejected' && (
                        <span style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <i className="ti ti-x" /> Rejected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: '#fff', fontSize: 13, padding: '10px 18px', borderRadius: 8, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}
    </>
  )
}
