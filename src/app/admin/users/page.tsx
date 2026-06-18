'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = { id: string; name: string }
type UserRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
  role: { name: string } | null
  created_at: string
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  Admin:     { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
  HR:        { bg: 'rgba(37,99,235,0.1)',   color: '#2563eb' },
  'DSP Staff':{ bg: 'rgba(0,128,128,0.1)',  color: '#008080' },
  DSP:       { bg: 'rgba(48,176,96,0.12)',  color: '#16a34a' },
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active:    { bg: 'rgba(22,163,74,0.1)',   color: '#16a34a' },
  inactive:  { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
  suspended: { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
}

export default function UserAccountsPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', role_id: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: u }, { data: r }] = await Promise.all([
      supabase.from('users').select('id, first_name, last_name, email, status, created_at, role:roles(name)').order('created_at', { ascending: false }),
      supabase.from('roles').select('id, name').order('name'),
    ])
    setUsers((u as UserRow[]) ?? [])
    setRoles(r ?? [])
    if (r?.length && !form.role_id) setForm(p => ({ ...p, role_id: r[0].id }))
    setLoading(false)
  }

  function set(field: string, value: string) { setForm(p => ({ ...p, [field]: value })) }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.role_id) {
      setError('All fields are required.'); return
    }
    setSubmitting(true); setError(''); setSuccess('')
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Failed to create user.') }
    else {
      setSuccess(`Account created for ${form.first_name} ${form.last_name}.`)
      setForm({ first_name: '', last_name: '', email: '', password: '', role_id: roles[0]?.id ?? '' })
      await loadData()
    }
    setSubmitting(false)
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`Permanently delete account for ${name}? This cannot be undone.`)) return
    setDeletingId(userId); setError(''); setSuccess('')
    const res = await fetch('/api/admin/create-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed to delete user.')
    else { setSuccess(`Account deleted.`); await loadData() }
    setDeletingId(null)
  }

  // ── shared styles ──────────────────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8,
    border: '1px solid #d1d5db', background: '#fff', color: '#111',
    outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5, display: 'block' }
  const card: React.CSSProperties = {
    background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
    borderLeft: '3.5px solid #2563eb', overflow: 'hidden', marginBottom: 20,
  }
  const cardHead: React.CSSProperties = {
    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10,
  }

  return (
    <>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>User Accounts</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Create and manage staff user accounts</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 18 }}>
            <i className="ti ti-bell" />
          </div>
          <div style={{ position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff' }} />
        </div>
      </div>

      {/* Page content */}
      <div style={{ padding: '24px', background: '#f0f2f7', minHeight: 'calc(100% - 56px)' }}>

        {/* Page header card */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: '18px 22px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-users-group" style={{ fontSize: 24, color: '#2563eb' }} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>User Accounts</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Create and manage staff, DSP, and admin accounts for this organisation.</div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 8, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}
        {success && (
          <div style={{ marginBottom: 16, padding: '11px 16px', borderRadius: 8, background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.3)', fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="ti ti-circle-check" /> {success}
          </div>
        )}

        {/* Create account card */}
        <div style={card}>
          <div style={cardHead}>
            <i className="ti ti-user-plus" style={{ fontSize: 18, color: '#2563eb' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: '#2563eb' }}>Create User Account</span>
          </div>
          <div style={{ height: '0.5px', background: '#e5e7eb' }} />
          <form onSubmit={handleCreate} style={{ padding: '20px 22px' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>First name</label>
                <input style={inp} value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="e.g. Maria" />
              </div>
              <div>
                <label style={lbl}>Last name</label>
                <input style={inp} value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="e.g. Santos" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Email address</label>
                <input type="email" style={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="staff@example.com" />
              </div>
              <div>
                <label style={lbl}>Role</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.role_id} onChange={e => set('role_id', e.target.value)}>
                  <option value="">Select role…</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={{ ...inp, paddingRight: 40 }}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 8 characters"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>
                  <i className={`ti ${showPassword ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={submitting}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#1e3a5f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7 }}>
              {submitting
                ? <><i className="ti ti-loader-2" /> Creating…</>
                : <><i className="ti ti-user-check" /> Create Account</>}
            </button>
          </form>
        </div>

        {/* User list card */}
        <div style={card}>
          <div style={{ ...cardHead, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-users" style={{ fontSize: 18, color: '#2563eb' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#2563eb' }}>User Accounts</span>
            </div>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {users.length}
            </span>
          </div>
          <div style={{ height: '0.5px', background: '#e5e7eb' }} />

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              <i className="ti ti-loader-2" style={{ fontSize: 22, display: 'block', marginBottom: 8 }} />Loading…
            </div>
          ) : users.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No user accounts yet.</div>
          ) : (
            users.map((u, i) => {
              const roleName = (u.role as { name: string } | null)?.name ?? '—'
              const roleStyle = ROLE_COLORS[roleName] ?? { bg: '#f3f4f6', color: '#6b7280' }
              const statusStyle = STATUS_COLORS[u.status] ?? STATUS_COLORS.inactive
              const fullName = `${u.first_name} ${u.last_name}`
              const initials = `${u.first_name[0]}${u.last_name[0]}`.toUpperCase()
              const isDeleting = deletingId === u.id
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: i < users.length - 1 ? '0.5px solid #f3f4f6' : 'none' }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                    {initials}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{fullName}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{u.email}</div>
                  </div>
                  {/* Role badge */}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: roleStyle.bg, color: roleStyle.color, flexShrink: 0 }}>
                    {roleName}
                  </span>
                  {/* Status badge */}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, flexShrink: 0, textTransform: 'capitalize' }}>
                    {u.status}
                  </span>
                  {/* Joined */}
                  <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(u.id, fullName)}
                    disabled={isDeleting}
                    title="Delete account"
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDeleting ? 'wait' : 'pointer', opacity: isDeleting ? 0.5 : 1, flexShrink: 0 }}>
                    <i className={`ti ${isDeleting ? 'ti-loader-2' : 'ti-trash'}`} style={{ fontSize: 15 }} />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
