'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const NJ_COUNTIES = ['Atlantic','Bergen','Burlington','Camden','Cape May','Cumberland','Essex','Gloucester','Hudson','Hunterdon','Mercer','Middlesex','Monmouth','Morris','Ocean','Passaic','Salem','Somerset','Sussex','Union','Warren']

const EMPTY_FORM = { full_name: '', dob: '', sex: '', county: '', medicaid_id: '', dx: '', isp_outcome: '' }

interface ClientRow {
  id: string
  full_name: string
  dob: string | null
  created_at: string
  sex: string
  county: string
  medicaid_id: string
  dx: string
  isp_outcome: string
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function fmtDob(dob: string | null) {
  if (!dob) return '—'
  return new Date(dob + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ClientsPage() {
  const supabase = createClient()

  const [clients,   setClients]   = useState<ClientRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [view,      setView]      = useState<'list' | 'create' | 'edit'>('list')
  const [selected,  setSelected]  = useState<ClientRow | null>(null)
  const [viewModal, setViewModal] = useState<ClientRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null)

  const [form,    setForm]    = useState({ ...EMPTY_FORM })
  const [saving,  setSaving]  = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function loadClients() {
    setLoading(true)
    const { data: rows } = await supabase
      .from('clients')
      .select('id, full_name, dob, created_at')
      .order('full_name')

    if (!rows) { setLoading(false); return }

    const { data: bcd } = await supabase
      .from('billing_client_data')
      .select('client_id, data')
      .in('client_id', rows.map(r => r.id))

    const bcdMap = new Map((bcd ?? []).map(b => [b.client_id, b.data as Record<string, unknown>]))

    const merged: ClientRow[] = rows.map(r => {
      const d = bcdMap.get(r.id) ?? {}
      return {
        id: r.id,
        full_name: r.full_name,
        dob: r.dob,
        created_at: r.created_at,
        sex:         String(d.sex ?? ''),
        county:      String(d.county ?? ''),
        medicaid_id: String(d.mid ?? ''),
        dx:          String(d.dx ?? ''),
        isp_outcome: String(d.isp_outcome ?? ''),
      }
    })

    setClients(merged)
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  function openCreate() {
    setForm({ ...EMPTY_FORM })
    setError('')
    setView('create')
  }

  function openEdit(c: ClientRow) {
    setSelected(c)
    setForm({
      full_name:   c.full_name,
      dob:         c.dob ?? '',
      sex:         c.sex,
      county:      c.county,
      medicaid_id: c.medicaid_id,
      dx:          c.dx,
      isp_outcome: c.isp_outcome,
    })
    setError('')
    setView('edit')
  }

  function cancelForm() {
    setView('list')
    setSelected(null)
    setError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Client name is required.'); return }
    setSaving(true)
    setError('')
    try {
      // Block if intake already exists
      const { data: intakeMatch } = await supabase
        .from('client_intakes')
        .select('id, client_name, status')
        .ilike('client_name', form.full_name.trim())
        .limit(1)
      if (intakeMatch && intakeMatch.length > 0) {
        const m = intakeMatch[0]
        setError(`"${m.client_name}" already has a ${m.status} intake submission. Please review their intake form instead.`)
        setSaving(false)
        return
      }

      const { data: row, error: err } = await supabase
        .from('clients')
        .insert({ full_name: form.full_name.trim(), dob: form.dob || null })
        .select('id')
        .single()
      if (err) throw err

      await supabase.from('billing_client_data').insert({
        client_id: row.id,
        data: {
          id: row.id,
          name: form.full_name.trim(),
          dob: form.dob,
          sex: form.sex,
          county: form.county,
          mid: form.medicaid_id,
          dx: form.dx,
          isp_outcome: form.isp_outcome,
          locked: false,
          pin: '1234',
          services: [],
        },
        archived: false,
      })

      await loadClients()
      setView('list')
      showToast(`${form.full_name.trim()} added successfully.`)
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to create client.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !selected) { setError('Client name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('clients')
        .update({ full_name: form.full_name.trim(), dob: form.dob || null })
        .eq('id', selected.id)
      if (err) throw err

      const { data: existing } = await supabase
        .from('billing_client_data')
        .select('data')
        .eq('client_id', selected.id)
        .maybeSingle()

      const merged = {
        ...((existing?.data as Record<string, unknown>) ?? {}),
        name: form.full_name.trim(),
        dob:  form.dob,
        sex:  form.sex,
        county: form.county,
        mid:  form.medicaid_id,
        dx:   form.dx,
        isp_outcome: form.isp_outcome,
      }

      await supabase.from('billing_client_data').upsert({ client_id: selected.id, data: merged })

      await loadClients()
      setView('list')
      showToast(`${form.full_name.trim()} updated successfully.`)
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to update client.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await supabase.from('billing_client_data').delete().eq('client_id', deleteTarget.id)
      await supabase.from('clients').delete().eq('id', deleteTarget.id)
      await loadClients()
      setDeleteTarget(null)
      showToast(`${deleteTarget.full_name} deleted.`)
    } catch (err: unknown) {
      showToast('Delete failed: ' + ((err as Error)?.message ?? 'Unknown error'))
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return !q || c.full_name.toLowerCase().includes(q) || c.medicaid_id.toLowerCase().includes(q) || c.county.toLowerCase().includes(q) || c.dx.toLowerCase().includes(q)
  })

  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }

  // ── Form (create or edit) ──────────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <>
        {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>{toast}</div>}
        <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <button onClick={cancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, display: 'flex', alignItems: 'center', padding: 4 }}>
            <i className="ti ti-arrow-left" />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{isEdit ? `Edit: ${selected?.full_name}` : 'Create new client'}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{isEdit ? 'Update client profile' : 'Add a new client profile to the system'}</div>
          </div>
        </div>

        <div style={{ padding: '24px', maxWidth: 640 }}>
          <form onSubmit={isEdit ? handleEdit : handleCreate}>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008080', fontSize: 16 }}>
                  <i className={isEdit ? 'ti ti-user-edit' : 'ti ti-user-plus'} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Patient information</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Full name <span style={{ color: '#E24B4A' }}>*</span></label>
                  <input style={inp} value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="e.g. Johnson, Mary" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Date of birth</label>
                    <input type="date" style={inp} value={form.dob} onChange={e => setField('dob', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Sex</label>
                    <select style={sel} value={form.sex} onChange={e => setField('sex', e.target.value)}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Medicaid ID</label>
                    <input style={inp} value={form.medicaid_id} onChange={e => setField('medicaid_id', e.target.value)} placeholder="e.g. NJ12345678" />
                  </div>
                  <div>
                    <label style={lbl}>County</label>
                    <select style={sel} value={form.county} onChange={e => setField('county', e.target.value)}>
                      <option value="">Select county</option>
                      {NJ_COUNTIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Primary diagnosis (ICD-10)</label>
                  <input style={inp} value={form.dx} onChange={e => setField('dx', e.target.value)} placeholder="e.g. F84.0" />
                </div>
                <div>
                  <label style={lbl}>ISP outcome</label>
                  <textarea
                    style={{ ...inp, resize: 'vertical', minHeight: 90, fontFamily: 'inherit', lineHeight: 1.5 }}
                    value={form.isp_outcome}
                    onChange={e => setField('isp_outcome', e.target.value)}
                    placeholder="Enter the client's Individualized Support Plan outcome goals…"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.4)', fontSize: 13, color: '#E24B4A' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#008080', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving
                  ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                  : <><i className="ti ti-check" /> {isEdit ? 'Save changes' : 'Create client'}</>}
              </button>
              <button type="button" onClick={cancelForm} style={{ padding: '9px 20px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────
  return (
    <>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>{toast}</div>}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Clients</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{clients.length} client{clients.length !== 1 ? 's' : ''} total</div>
        </div>
        <button
          onClick={openCreate}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          <i className="ti ti-user-plus" /> New client
        </button>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1100 }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, Medicaid ID, county, or diagnosis…"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.8fr 120px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
            {['Name', 'Medicaid ID', 'Date of Birth', 'County', 'Sex', 'Diagnosis', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
              Loading clients…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
              <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
              {search ? 'No clients match your search.' : 'No clients yet. Click "New client" to add one.'}
            </div>
          ) : (
            filtered.map((c, i) => (
              <div
                key={c.id}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.8fr 120px', padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f9fafb' : 'none', alignItems: 'center' }}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {initials(c.full_name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{c.full_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Added {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>
                {/* Medicaid ID */}
                <div style={{ fontSize: 13, color: c.medicaid_id ? '#111' : '#d1d5db', fontFamily: 'monospace' }}>{c.medicaid_id || '—'}</div>
                {/* DOB */}
                <div style={{ fontSize: 13, color: '#374151' }}>{fmtDob(c.dob)}</div>
                {/* County */}
                <div style={{ fontSize: 13, color: '#374151' }}>{c.county || '—'}</div>
                {/* Sex */}
                <div style={{ fontSize: 13, color: '#374151' }}>{c.sex === 'M' ? 'Male' : c.sex === 'F' ? 'Female' : '—'}</div>
                {/* Diagnosis */}
                <div style={{ fontSize: 12, color: c.dx ? '#374151' : '#d1d5db', fontFamily: 'monospace' }}>{c.dx || '—'}</div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setViewModal(c)}
                    title="View"
                    style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                  >
                    <i className="ti ti-eye" />
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    title="Edit"
                    style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#008080', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                  >
                    <i className="ti ti-edit" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    title="Delete"
                    style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
                  >
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View modal */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => setViewModal(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>
                {initials(viewModal.full_name)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{viewModal.full_name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Client profile</div>
              </div>
              <button onClick={() => setViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, display: 'flex', alignItems: 'center' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            {/* Modal body */}
            <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              {[
                ['Full name',    viewModal.full_name],
                ['Medicaid ID',  viewModal.medicaid_id || '—'],
                ['Date of birth', fmtDob(viewModal.dob)],
                ['Sex',          viewModal.sex === 'M' ? 'Male' : viewModal.sex === 'F' ? 'Female' : '—'],
                ['County',       viewModal.county || '—'],
                ['Diagnosis',    viewModal.dx || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
              {viewModal.isp_outcome && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>ISP Outcome</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{viewModal.isp_outcome}</div>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setViewModal(null); openEdit(viewModal) }}
                style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #008080', background: 'rgba(0,128,128,0.06)', color: '#008080', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="ti ti-edit" /> Edit
              </button>
              <button onClick={() => setViewModal(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '28px 28px 22px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#dc2626', margin: '0 0 16px' }}>
              <i className="ti ti-trash" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>Delete client?</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 22 }}>
              This will permanently delete <strong>{deleteTarget.full_name}</strong> and all associated data. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deleting ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : 'Yes, delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
