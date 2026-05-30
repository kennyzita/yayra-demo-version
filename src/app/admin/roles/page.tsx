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
  const [myRole, setMyRole]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<Record<string, boolean>>({})
  const [saved, setSaved]     = useState<Record<string, boolean>>({})
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user: me } } = await supabase.auth.getUser()
      const [{ data: userRows }, { data: roleRows }, { data: myProfile }] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, email, role_id, role:roles(id, name)')
          .order('first_name'),
        supabase.from('roles').select('id, name').order('name'),
        me
          ? supabase.from('users').select('role:roles(name)').eq('id', me.id).single()
          : Promise.resolve({ data: null }),
      ])
      // Supabase returns joined rows as arrays; normalize to single object or null
      const normalised: UserRow[] = (userRows ?? []).map((u: any) => ({
        ...u,
        role: Array.isArray(u.role) ? (u.role[0] ?? null) : (u.role ?? null),
      }))
      setUsers(normalised)
      setRoles(roleRows ?? [])
      const profileRole = (myProfile as any)?.role
      setMyRole((Array.isArray(profileRole) ? profileRole[0] : profileRole)?.name ?? '')
      setLoading(false)
    }
    load()
  }, [])

  function getRoleId(u: UserRow): string {
    return u.role?.id ?? u.role_id ?? ''
  }

  async function handleRoleChange(u: UserRow, newRoleId: string) {
    if (!newRoleId) return
    const newRole = roles.find(r => r.id === newRoleId) ?? null
    if (!newRole) return

    setSaving(s => ({ ...s, [u.id]: true }))
    // Optimistic update
    setUsers(prev => prev.map(row =>
      row.id === u.id ? { ...row, role_id: newRoleId, role: newRole } : row
    ))

    // Use server-side API to bypass RLS
    const res = await fetch('/api/admin/update-user-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, roleId: newRoleId }),
    })
    const json = await res.json().catch(() => ({}))

    setSaving(s => ({ ...s, [u.id]: false }))
    if (!res.ok) {
      setError(`Failed to update role for ${u.first_name}: ${json.error ?? res.statusText}`)
      // Revert optimistic update
      setUsers(prev => prev.map(row =>
        row.id === u.id ? { ...row, role_id: u.role_id, role: u.role } : row
      ))
      return
    }
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const currentRoleName = u.role?.name
                const selectedId = getRoleId(u)
                const isSaving = saving[u.id]
                const justSaved = saved[u.id]
                const lockedForHR = myRole === 'HR' && currentRoleName === 'Admin'
                return (
                  <tr key={u.id} style={{ background: isSaving ? 'rgba(0,128,128,0.02)' : lockedForHR ? 'rgba(99,102,241,0.02)' : 'transparent' }}>
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
                      {lockedForHR ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="HR cannot change the role of an Admin user">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                          </svg>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>Admin-protected</span>
                        </div>
                      ) : (
                        <select
                          value={selectedId}
                          disabled={isSaving}
                          onChange={e => { const val = e.target.value; if (val) handleRoleChange(u, val) }}
                          style={{ padding: '7px 10px', borderRadius: 7, border: `1px solid ${isSaving ? '#008080' : '#d1d5db'}`, fontSize: 13, color: '#111', background: '#fff', outline: 'none', cursor: isSaving ? 'wait' : 'pointer', minWidth: 140, opacity: isSaving ? 0.7 : 1 }}
                        >
                          <option value="">— select role —</option>
                          {roles.filter(r => r.name !== 'Admin').map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td style={{ ...cell, width: 120 }}>
                      {isSaving ? (
                        <span style={{ fontSize: 12, color: '#008080', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                          Saving…
                        </span>
                      ) : justSaved ? (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                          Saved
                        </span>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
