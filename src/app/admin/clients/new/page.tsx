'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NJ_COUNTIES = ['Atlantic','Bergen','Burlington','Camden','Cape May','Cumberland','Essex','Gloucester','Hudson','Hunterdon','Mercer','Middlesex','Monmouth','Morris','Ocean','Passaic','Salem','Somerset','Sussex','Union','Warren']

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    full_name: '',
    dob: '',
    sex: '',
    county: '',
    medicaid_id: '',
    dx: '',
    isp_outcome: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Client name is required.'); return }
    setSaving(true)
    setError('')
    try {
      // Insert into clients table
      const { data: row, error: err } = await supabase
        .from('clients')
        .insert({ full_name: form.full_name.trim(), dob: form.dob || null })
        .select('id')
        .single()
      if (err) throw err

      // Store extra fields in billing_client_data
      const billingData = {
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
      }
      const { error: bdErr } = await supabase
        .from('billing_client_data')
        .insert({ client_id: row.id, data: billingData, archived: false })
      if (bdErr) throw bdErr

      router.push('/admin/billing')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create client.')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8,
    border: '0.5px solid #d1d5db', background: '#fff', color: '#111',
    outline: 'none', boxSizing: 'border-box',
  }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, display: 'flex', alignItems: 'center', padding: 4 }}>
          <i className="ti ti-arrow-left" />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Create new client</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Add a new client profile to the system</div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '24px', maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008080', fontSize: 16 }}>
                <i className="ti ti-user-plus" />
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Patient information</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div>
                <label style={lbl}>Full name <span style={{ color: '#E24B4A' }}>*</span></label>
                <input style={inp} value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="e.g. Johnson, Mary" required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Date of birth</label>
                  <input type="date" style={inp} value={form.dob} onChange={e => set('dob', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Sex</label>
                  <select style={sel} value={form.sex} onChange={e => set('sex', e.target.value)}>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Medicaid ID</label>
                  <input style={inp} value={form.medicaid_id} onChange={e => set('medicaid_id', e.target.value)} placeholder="e.g. NJ12345678" />
                </div>
                <div>
                  <label style={lbl}>County</label>
                  <select style={sel} value={form.county} onChange={e => set('county', e.target.value)}>
                    <option value="">Select county</option>
                    {NJ_COUNTIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>Primary diagnosis (ICD-10)</label>
                <input style={inp} value={form.dx} onChange={e => set('dx', e.target.value)} placeholder="e.g. F84.0" />
              </div>

              <div>
                <label style={lbl}>ISP outcome</label>
                <textarea
                  style={{ ...inp, resize: 'vertical', minHeight: 90, fontFamily: 'inherit', lineHeight: 1.5 }}
                  value={form.isp_outcome}
                  onChange={e => set('isp_outcome', e.target.value)}
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
              {saving ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><i className="ti ti-check" /> Create client</>}
            </button>
            <button type="button" onClick={() => router.back()} style={{ padding: '9px 20px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
