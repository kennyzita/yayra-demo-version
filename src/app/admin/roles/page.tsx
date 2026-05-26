'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Role {
  id: string
  name: string
}

interface UserRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role_id: string | null
  role: { id: string; name: string } | null
}

export default function RoleManagementPage() {
  const supabase = createClient()

  const [users, setUsers]     = useState<UserRow[]>([])
  const [roles, setRoles]     = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Record<string, string>>({})
  const [saved, setSaved]     = useState<Record<string, boolean>>({})
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: userRows }, { data: roleRows }] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, email, role_id, role:roles(id, name)')
          .order('first_name'),
        supabase.from('roles').select('id, name').order('name'),
      ])
      setUsers((userRows ?? []) as UserRow[])
      setRoles(roleRows ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function getRoleId(u: UserRow): string {
    return pending[u.id] ?? (u.role as unknown as { id: string } | null)?.id ?? u.role_id ?? ''
  }

  async function saveRole(u: UserRow) {
    const newRoleId = pending[u.id]
    if (!newRoleId) return
    setSaving(s => ({ ...s, [u.id]: true }))
    const { error: err } = await supabase
      .from('users')
      .update({ role_id: newRoleId })
      .eq('id', u.id)
    setSaving(s => ({ ...s, [u.id]: false }))
    if (err) {
      setError(`Failed to update role for ${u.first_name}: ${err.message}`)
      return
    }
    const newRole = roles.find(r => r.id === newRoleId) ?? null
    setUsers(prev => prev.map(row =>
      row.id === u.id ? { ...row, role_id: newRoleId, role: newRole } : row
    ))
    setPending(p => { const next = { ...p }; delete next[u.id]; return next })
    setSaved(s => ({ ...s, [u.id]: true }))
    setTimeout(() => setSaved(s => { const next = { ...s }; delete next[u.id]; return next }), 2000)
  }

  const cell: React.CSSProperties = { padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 14, color: '#111', verticalAlign: 'middle' }
  const cellMuted: React.CSSProperties = { ...cell, color: '#6b7280' }

  function roleBadge(name: string | null | undefined) {
    if (!name) return null
    const colors: Record<string, { bg: string; color: string }> = {
      Admin:     { bg: 'rgba(99,102,241,0.12)', color: '#6366f1' },
      HR:        { bg: 'rgba(245,158,11,0.13)', color: '#d97706' },
      'DSP Staff': { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
      DSP:       { bg: 'rgba(20,184,166,0.12)', color: '#0d9488' },
    }
    const c = colors[name] ?? { bg: '#f3f4f6', color: '#374151' }
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: c.bg, color: c.color }}>
        {name}
      </span>
    )
  }

  return (
    <div style={{ padding: '32px 32px 48px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', margin: '0 0 6px' }}>Role Management</h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px' }}>
        Update user roles. Changes take effect immediately on next login.
      </p>

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 20 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 12, fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Dismiss</button>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading users…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Change Role</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const currentRoleName = (u.role as unknown as { name: string } | null)?.name
                const selectedId = getRoleId(u)
                const isDirty = pending[u.id] != null
                const isSaving = saving[u.id]
                const justSaved = saved[u.id]
                return (
                  <tr key={u.id} style={{ background: isDirty ? 'rgba(0,128,128,0.02)' : 'transparent' }}>
                    <td style={cell}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                          {u.first_name[0]}{u.last_name[0]}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.first_name} {u.last_name}</span>
                      </div>
                    </td>
                    <td style={cellMuted}>{u.email}</td>
                    <td style={cell}>{roleBadge(currentRoleName)}</td>
                    <td style={cell}>
                      <select
                        value={selectedId}
                        onChange={e => {
                          const val = e.target.value
                          const currentId = (u.role as unknown as { id: string } | null)?.id ?? u.role_id ?? ''
                          if (val === currentId) {
                            setPending(p => { const next = { ...p }; delete next[u.id]; return next })
                          } else {
                            setPending(p => ({ ...p, [u.id]: val }))
                          }
                        }}
                        style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${isDirty ? '#008080' : '#d1d5db'}`, fontSize: 13, color: '#111', background: '#fff', outline: 'none', cursor: 'pointer', minWidth: 140 }}
                      >
                        <option value="">— select role —</option>
                        {roles.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ ...cell, width: 120 }}>
                      {justSaved ? (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => saveRole(u)}
                          disabled={!isDirty || isSaving}
                          style={{
                            padding: '7px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 600, cursor: isDirty ? 'pointer' : 'default',
                            background: isDirty ? '#008080' : '#f3f4f6',
                            color: isDirty ? '#fff' : '#9ca3af',
                            transition: 'background 0.15s',
                            opacity: isSaving ? 0.7 : 1,
                          }}
                        >
                          {isSaving ? 'Saving…' : 'Save'}
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
    </div>
  )
}
