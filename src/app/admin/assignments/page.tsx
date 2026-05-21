'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Staff  = { id: string; name: string; role: string }
type Client = { id: string; full_name: string }
type Assignment = { id: string; dsp_id: string; client_id: string; staff_name: string; client_name: string }

export default function AssignmentsPage() {
  const supabase = createClient()
  const [staff, setStaff]   = useState<Staff[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStaff,  setSelectedStaff]  = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: asgData }, { data: usersData }, { data: clientData }] = await Promise.all([
      supabase.from('assignments').select('id, dsp_id, client_id'),
      supabase.from('users').select('id, first_name, last_name, role:roles(name)').order('first_name'),
      supabase.from('clients').select('id, full_name').order('full_name'),
    ])

    const dspStaff: Staff[] = (usersData || [])
      .filter((u: any) => { const r = (u.role as any)?.name; return r === 'DSP' || r === 'DSP Staff' })
      .map((u: any) => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, role: (u.role as any)?.name ?? 'DSP' }))

    const staffMap  = new Map((usersData || []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
    const clientMap = new Map((clientData || []).map((c: any) => [c.id, c.full_name]))

    setStaff(dspStaff)
    setClients(clientData ?? [])
    setAssignments((asgData || []).map((a: any) => ({
      id: a.id,
      dsp_id: a.dsp_id,
      client_id: a.client_id,
      staff_name:  staffMap.get(a.dsp_id)  ?? 'Unknown staff',
      client_name: clientMap.get(a.client_id) ?? 'Unknown client',
    })))
    setLoading(false)
  }

  async function handleAssign() {
    if (!selectedStaff || !selectedClient) { setError('Select both a DSP and a client.'); return }
    const already = assignments.some(a => a.dsp_id === selectedStaff && a.client_id === selectedClient)
    if (already) { setError('This DSP is already assigned to that client.'); return }
    setAssigning(true); setError(''); setSuccess('')
    const { error: err } = await supabase.from('assignments').insert({ dsp_id: selectedStaff, client_id: selectedClient })
    if (err) { setError(err.message) }
    else { setSuccess('Assignment created.'); setSelectedStaff(''); setSelectedClient(''); await load() }
    setAssigning(false)
  }

  async function handleDelete(asgId: string, staffName: string, clientName: string) {
    if (!confirm(`Remove assignment: ${staffName} → ${clientName}?`)) return
    setDeletingId(asgId); setError(''); setSuccess('')
    const { error: err } = await supabase.from('assignments').delete().eq('id', asgId)
    if (err) setError(err.message)
    else { setSuccess('Assignment removed.'); await load() }
    setDeletingId(null)
  }

  // ── styles ──────────────────────────────────────────────────────────────────
  const purple = '#7c3aed'
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
    borderLeft: `3.5px solid ${purple}`, overflow: 'hidden', marginBottom: 20,
  }
  const sel: React.CSSProperties = {
    width: '100%', padding: '10px 36px 10px 13px', fontSize: 13, borderRadius: 8,
    border: '1px solid #d1d5db', background: '#fff', color: '#111',
    outline: 'none', cursor: 'pointer', appearance: 'none',
  }

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>DSP Assignment</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Match DSP staff to the clients they support</div>
        </div>
      </div>

      <div style={{ padding: '24px', background: '#f5f4ef', minHeight: 'calc(100% - 56px)' }}>

        {/* Page header card */}
        <div style={{ background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-arrows-exchange" style={{ fontSize: 24, color: purple }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Assignments</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Match DSP staff to the clients they support.</div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.25)', fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-circle-check" /> {success}
          </div>
        )}

        {/* Assign form card */}
        <div style={card}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-link" style={{ fontSize: 17, color: purple }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: purple }}>Assign DSP to client</span>
          </div>
          <div style={{ height: '0.5px', background: '#e5e7eb' }} />
          <div style={{ padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>DSP staff</div>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="">Select DSP…</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Client</div>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">Select client…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>

            <button
              onClick={handleAssign}
              disabled={assigning || !selectedStaff || !selectedClient}
              style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontSize: 14, fontWeight: 600, cursor: assigning ? 'wait' : 'pointer', opacity: assigning ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>

        {/* Current assignments card */}
        <div style={card}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-users-group" style={{ fontSize: 17, color: purple }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: purple }}>Current assignments</span>
            </div>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(124,58,237,0.12)', color: purple, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {assignments.length}
            </span>
          </div>
          <div style={{ height: '0.5px', background: '#e5e7eb' }} />

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 22, display: 'block', marginBottom: 8 }} />Loading…
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-link-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#d1d5db' }} />
              No assignments yet. Use the form above to create one.
            </div>
          ) : (
            assignments.map((a, i) => {
              const isDeleting = deletingId === a.id
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', padding: '15px 22px', borderBottom: i < assignments.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111', flex: 1 }}>
                    {a.staff_name}
                    <span style={{ color: '#9ca3af', margin: '0 8px', fontWeight: 400 }}>→</span>
                    {a.client_name}
                  </span>
                  <button
                    onClick={() => handleDelete(a.id, a.staff_name, a.client_name)}
                    disabled={isDeleting}
                    style={{ background: 'none', border: 'none', cursor: isDeleting ? 'wait' : 'pointer', color: '#dc2626', fontSize: 17, opacity: isDeleting ? 0.4 : 1, padding: '4px 6px', lineHeight: 1 }}
                    title="Remove assignment"
                  >
                    <i className={`ti ${isDeleting ? 'ti-loader-2' : 'ti-trash'}`} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.08)', color: purple, fontWeight: 500 }}>
            {staff.length} DSP staff
          </span>
          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(0,128,128,0.08)', color: '#008080', fontWeight: 500 }}>
            {clients.length} clients
          </span>
        </div>
      </div>
    </>
  )
}
