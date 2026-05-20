'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Client = { id: string; full_name: string; medicaid_id?: string }
type Staff = { id: string; full_name: string; role_name: string }
type AssignmentMap = Record<string, Set<string>> // staffId -> Set of clientIds

export default function AssignmentsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [assignments, setAssignments] = useState<AssignmentMap>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // key being saved
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      // Load clients
      const { data: cls, error: e1 } = await supabase
        .from('clients')
        .select('id, full_name')
        .order('full_name')
      if (e1) throw e1

      // Load client billing data for Medicaid IDs
      const { data: bd } = await supabase
        .from('billing_client_data')
        .select('client_id, data')
      const midMap: Record<string, string> = {}
      ;(bd || []).forEach((r: any) => { if (r.data?.mid) midMap[r.client_id] = r.data.mid })

      // Load DSP/HR/Supervisor staff from yayracare users + roles
      const { data: users, error: e2 } = await supabase
        .from('users')
        .select('id, first_name, last_name, role:roles(name)')
      if (e2) throw e2

      const dspStaff: Staff[] = (users || [])
        .filter((u: any) => {
          const role = (u.role as { name: string } | null)?.name
          return role === 'DSP' || role === 'DSP Staff'
        })
        .map((u: any) => ({
          id: u.id,
          full_name: `${u.first_name} ${u.last_name}`,
          role_name: (u.role as { name: string } | null)?.name ?? 'DSP',
        }))

      // Load current assignments
      const { data: asg, error: e3 } = await supabase
        .from('assignments')
        .select('dsp_id, client_id')
      if (e3) throw e3

      const map: AssignmentMap = {}
      ;(asg || []).forEach((a: any) => {
        if (!map[a.dsp_id]) map[a.dsp_id] = new Set()
        map[a.dsp_id].add(a.client_id)
      })

      setClients((cls || []).map((c: any) => ({ ...c, medicaid_id: midMap[c.id] })))
      setStaff(dspStaff)
      setAssignments(map)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }

  async function toggle(staffId: string, clientId: string) {
    const key = `${staffId}:${clientId}`
    const assigned = assignments[staffId]?.has(clientId)
    setSaving(key)
    try {
      if (assigned) {
        const { error } = await supabase
          .from('assignments')
          .delete()
          .eq('dsp_id', staffId)
          .eq('client_id', clientId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert({ dsp_id: staffId, client_id: clientId })
        if (error) throw error
      }
      setAssignments(prev => {
        const next = { ...prev }
        const set = new Set(next[staffId] ?? [])
        assigned ? set.delete(clientId) : set.add(clientId)
        next[staffId] = set
        return next
      })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update assignment.')
    } finally {
      setSaving(null)
    }
  }

  const filteredClients = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.medicaid_id ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = {
    border: 'none', background: 'transparent', fontSize: 13, color: '#111', outline: 'none', width: '100%',
  }

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>DSP assignment</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Assign DSP staff to clients</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '0 12px', height: 32, width: 220 }}>
          <i className="ti ti-search" style={{ fontSize: 15, color: '#6b7280' }} />
          <input type="text" placeholder="Search clients…" style={inp} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer' }}>
          <i className="ti ti-refresh" /> Refresh
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.4)', fontSize: 13, color: '#E24B4A' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
            Loading staff and clients…
          </div>
        ) : (
          <>
            {/* Summary chips */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(0,128,128,0.1)', color: '#008080', fontWeight: 500 }}>
                {clients.length} client{clients.length !== 1 ? 's' : ''}
              </span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(48,176,96,0.12)', color: '#30B060', fontWeight: 500 }}>
                {staff.length} DSP staff
              </span>
              <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(55,138,221,0.1)', color: '#378ADD', fontWeight: 500 }}>
                {Object.values(assignments).reduce((a, s) => a + s.size, 0)} assignments
              </span>
            </div>

            {staff.length === 0 ? (
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 32, textAlign: 'center', color: '#6b7280' }}>
                <i className="ti ti-users-group" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#d1d5db' }} />
                <div style={{ fontSize: 14, marginBottom: 4 }}>No DSP staff found</div>
                <div style={{ fontSize: 12 }}>Add users with DSP or DSP Staff roles first.</div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, padding: 32, textAlign: 'center', color: '#6b7280' }}>
                <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 8, color: '#d1d5db' }} />
                <div style={{ fontSize: 14, marginBottom: 4 }}>No clients found</div>
                <div style={{ fontSize: 12 }}>Create clients first using the "Create new client" menu item.</div>
              </div>
            ) : (
              /* Assignment grid: one card per DSP, listing all clients as checkboxes */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {staff.map(s => {
                  const assignedCount = assignments[s.id]?.size ?? 0
                  return (
                    <div key={s.id} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                      {/* Staff header */}
                      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,128,128,0.12)', color: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
                          {s.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{s.full_name}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{s.role_name}</div>
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: assignedCount > 0 ? 'rgba(48,176,96,0.12)' : '#f3f4f6', color: assignedCount > 0 ? '#30B060' : '#6b7280', fontWeight: 500 }}>
                          {assignedCount} assigned
                        </span>
                      </div>

                      {/* Client checkboxes */}
                      <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {filteredClients.map(c => {
                          const checked = assignments[s.id]?.has(c.id) ?? false
                          const key = `${s.id}:${c.id}`
                          const isSaving = saving === key
                          return (
                            <label key={c.id} style={{
                              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px',
                              borderRadius: 8, cursor: isSaving ? 'wait' : 'pointer',
                              border: `0.5px solid ${checked ? 'rgba(0,128,128,0.4)' : '#e5e7eb'}`,
                              background: checked ? 'rgba(0,128,128,0.06)' : '#fafafa',
                              transition: 'all 0.12s',
                            }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!!saving}
                                onChange={() => toggle(s.id, c.id)}
                                style={{ accentColor: '#008080', width: 14, height: 14, cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: checked ? '#008080' : '#374151' }}>{c.full_name}</div>
                                {c.medicaid_id && <div style={{ fontSize: 10, color: '#9ca3af' }}>{c.medicaid_id}</div>}
                              </div>
                              {isSaving && <i className="ti ti-loader-2" style={{ fontSize: 12, color: '#6b7280' }} />}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
