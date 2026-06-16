'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type StaffRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  staffId: string | null   // from billing_staff_data.data.staffId
  editing: boolean
  draft: string
  saving: boolean
}

function computedStaffId(userId: string): string {
  // Deterministic fallback: last 6 chars of UUID (uppercase, no dashes)
  return userId.replace(/-/g, '').slice(-6).toUpperCase()
}

export default function EditStaffIdPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const [{ data: users }, { data: staffData }] = await Promise.all([
      supabase
        .from('users')
        .select('id, first_name, last_name, email, role:roles(name)')
        .order('last_name', { ascending: true }),
      supabase
        .from('billing_staff_data')
        .select('staff_id, data'),
    ])

    const dataMap: Record<string, string | null> = {}
    for (const sd of staffData ?? []) {
      dataMap[sd.staff_id] = (sd.data?.staffId as string) ?? null
    }

    const dspUsers = ((users ?? []) as any[]).filter(
      u => u.role?.name === 'DSP Staff' || u.role?.name === 'DSP'
    )

    setRows(
      dspUsers.map(u => ({
        id: u.id,
        first_name: u.first_name ?? '',
        last_name: u.last_name ?? '',
        email: u.email ?? '',
        staffId: dataMap[u.id] ?? null,
        editing: false,
        draft: dataMap[u.id] ?? '',
        saving: false,
      }))
    )
    setLoading(false)
  }

  function startEdit(id: string) {
    setRows(prev => prev.map(r =>
      r.id === id
        ? { ...r, editing: true, draft: r.staffId ?? computedStaffId(r.id) }
        : r
    ))
  }

  function cancelEdit(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, editing: false } : r))
  }

  function setDraft(id: string, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, draft: value } : r))
  }

  async function saveStaffId(row: StaffRow) {
    const trimmed = row.draft.trim()
    if (!trimmed) return

    setRows(prev => prev.map(r => r.id === row.id ? { ...r, saving: true } : r))

    // Check for duplicates
    const duplicate = rows.find(r => r.id !== row.id && (r.staffId ?? computedStaffId(r.id)).toUpperCase() === trimmed.toUpperCase())
    if (duplicate) {
      showToast(`Staff ID "${trimmed}" is already assigned to ${duplicate.first_name} ${duplicate.last_name}`)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, saving: false } : r))
      return
    }

    // Read existing data blob to do a safe merge
    const { data: existing } = await supabase
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', row.id)
      .maybeSingle()

    const merged = { ...(existing?.data ?? {}), staffId: trimmed }

    const { error } = await supabase
      .from('billing_staff_data')
      .upsert({ staff_id: row.id, data: merged }, { onConflict: 'staff_id' })

    if (error) {
      showToast('Save failed: ' + error.message)
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, saving: false } : r))
      return
    }

    setRows(prev => prev.map(r =>
      r.id === row.id
        ? { ...r, staffId: trimmed, editing: false, draft: trimmed, saving: false }
        : r
    ))
    showToast(`Staff ID updated for ${row.first_name} ${row.last_name}`)
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    return (
      !q ||
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.staffId ?? computedStaffId(r.id)).toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ padding: '32px 32px 80px', maxWidth: 900, margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#1d4ed8', color: 'white',
          padding: '12px 20px', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', fontSize: 14, fontWeight: 600,
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>Edit Staff ID</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '6px 0 0' }}>
          Assign or update the Staff ID for each DSP Staff member. If no custom ID is set, a system-generated ID is shown.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or Staff ID…"
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 16px', borderRadius: 8,
            border: '1.5px solid #e5e7eb', fontSize: 14,
            outline: 'none', background: '#fff',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 15 }}>
            {search ? 'No staff match your search.' : 'No DSP Staff found.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1.5px solid #e5e7eb' }}>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Staff ID</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const displayed = row.staffId ?? computedStaffId(row.id)
                const isCustom = !!row.staffId
                return (
                  <tr key={row.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #f3f4f6' : 'none', background: '#fff' }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: 15 }}>
                        {row.last_name}, {row.first_name}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: '#6b7280', fontSize: 13 }}>{row.email}</span>
                    </td>
                    <td style={tdStyle}>
                      {row.editing ? (
                        <input
                          autoFocus
                          value={row.draft}
                          onChange={e => setDraft(row.id, e.target.value.toUpperCase())}
                          onKeyDown={e => { if (e.key === 'Enter') saveStaffId(row); if (e.key === 'Escape') cancelEdit(row.id) }}
                          maxLength={20}
                          style={{
                            padding: '7px 12px', borderRadius: 7,
                            border: '2px solid #2563eb', fontSize: 14, fontWeight: 700,
                            width: 160, outline: 'none', letterSpacing: 1.5,
                            textTransform: 'uppercase',
                          }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: 'monospace', fontWeight: 700, fontSize: 15,
                            letterSpacing: 2, color: isCustom ? '#1d4ed8' : '#9ca3af',
                            background: isCustom ? 'rgba(29,78,216,0.07)' : 'rgba(156,163,175,0.1)',
                            padding: '4px 10px', borderRadius: 6,
                          }}>
                            {displayed}
                          </span>
                          {!isCustom && (
                            <span style={{ fontSize: 11, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
                              auto
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {row.editing ? (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => saveStaffId(row)}
                            disabled={row.saving || !row.draft.trim()}
                            style={btnStyle('#16a34a', row.saving || !row.draft.trim())}
                          >
                            {row.saving ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            onClick={() => cancelEdit(row.id)}
                            disabled={row.saving}
                            style={btnStyle('#6b7280', row.saving)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(row.id)}
                          style={btnStyle('#2563eb', false)}
                        >
                          {isCustom ? 'Edit' : 'Set ID'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
        {rows.length} DSP Staff member{rows.length !== 1 ? 's' : ''} •{' '}
        {rows.filter(r => r.staffId).length} with custom Staff ID
      </p>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '13px 18px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 700,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: 0.8,
}

const tdStyle: React.CSSProperties = {
  padding: '15px 18px',
  verticalAlign: 'middle',
}

function btnStyle(color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 18px',
    borderRadius: 7,
    border: 'none',
    background: disabled ? '#d1d5db' : color,
    color: 'white',
    fontSize: 13,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit',
  }
}
