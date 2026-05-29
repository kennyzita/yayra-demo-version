'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Staff  = { id: string; name: string }
type Client = { id: string; full_name: string }
type Assignment = { id: string; dsp_id: string; client_id: string; staff_name: string; client_name: string }

export default function AssignmentsPage() {
  const supabase = createClient()
  const [staff, setStaff]     = useState<Staff[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedStaff,  setSelectedStaff]  = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [assigning,  setAssigning]  = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: asgData }, { data: usersData }, { data: clientData }] = await Promise.all([
      supabase.from('assignments').select('id, dsp_id, client_id'),
      supabase.from('users').select('id, first_name, last_name, role:roles(name)').order('first_name'),
      supabase.from('clients').select('id, full_name').order('full_name'),
    ])

    const dspStaff: Staff[] = (usersData || [])
      .filter((u: any) => (u.role as any)?.name === 'DSP Staff')
      .map((u: any) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))

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
    if (!selectedStaff || !selectedClient) { showToast('Select both a DSP and a client.', false); return }
    if (assignments.some(a => a.dsp_id === selectedStaff && a.client_id === selectedClient)) {
      showToast('This DSP is already assigned to that client.', false); return
    }
    setAssigning(true)
    const { error: err } = await supabase.from('assignments').insert({ dsp_id: selectedStaff, client_id: selectedClient })
    if (err) showToast(err.message, false)
    else { showToast('Assignment created.'); setSelectedStaff(''); setSelectedClient(''); await load() }
    setAssigning(false)
  }

  async function handleDelete(asgId: string, staffName: string, clientName: string) {
    if (!confirm(`Remove assignment: ${staffName} → ${clientName}?`)) return
    setDeletingId(asgId)
    const { error: err } = await supabase.from('assignments').delete().eq('id', asgId)
    if (err) showToast(err.message, false)
    else { showToast('Assignment removed.'); await load() }
    setDeletingId(null)
  }

  const sel: React.CSSProperties = {
    width: '100%', padding: '10px 36px 10px 13px', fontSize: 13, borderRadius: 8,
    border: '1px solid #d1d5db', background: '#fff', color: '#111',
    outline: 'none', cursor: 'pointer', appearance: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: toast.ok ? '#111' : '#dc2626', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>DSP Assignment</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Match DSP staff to the clients they support</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f4f5f7' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: 'ti-users',         bg: 'rgba(0,128,128,0.1)',  color: '#008080',  label: 'DSP Staff',          val: staff.length },
            { icon: 'ti-heart',         bg: 'rgba(79,70,229,0.1)',  color: '#4f46e5',  label: 'Clients',             val: clients.length },
            { icon: 'ti-arrows-exchange',bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Active assignments',   val: assignments.length },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: c.color, flexShrink: 0 }}>
                <i className={`ti ${c.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111', lineHeight: 1.1 }}>{c.val}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Assign form */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <div style={{ background: '#004050', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-link" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Assign DSP to client</span>
          </div>
          <div style={{ padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>DSP Staff</div>
              <div style={{ position: 'relative' }}>
                <select style={sel} value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="">Select DSP staff…</option>
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
              style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#008080', color: '#fff', fontSize: 14, fontWeight: 600, cursor: assigning ? 'wait' : 'pointer', opacity: assigning || !selectedStaff || !selectedClient ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>

        {/* Current assignments */}
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ background: '#004050', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-users-group" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Current assignments</span>
            </div>
            <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 600 }}>
              {assignments.length}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />Loading…
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-link-off" style={{ fontSize: 32, display: 'block', marginBottom: 10, color: '#d1d5db' }} />
              No assignments yet. Use the form above to create one.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['DSP Staff', 'Client', 'Action'].map(h => (
                    <th key={h} style={{ padding: '11px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const isDeleting = deletingId === a.id
                  return (
                    <tr key={a.id} style={{ borderBottom: i < assignments.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#008080', flexShrink: 0 }}>
                            {a.staff_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{a.staff_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: '#374151' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <i className="ti ti-heart" style={{ fontSize: 14, color: '#9ca3af' }} />
                          {a.client_name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => handleDelete(a.id, a.staff_name, a.client_name)}
                          disabled={isDeleting}
                          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', cursor: isDeleting ? 'wait' : 'pointer', opacity: isDeleting ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit' }}
                        >
                          <i className={`ti ${isDeleting ? 'ti-loader-2' : 'ti-trash'}`} style={{ fontSize: 13 }} />
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
