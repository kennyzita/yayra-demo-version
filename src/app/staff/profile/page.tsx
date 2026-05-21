'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: string
  role: string
  created_at: string
}

export default function StaffProfilePage() {
  const supabase = createClient()

  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null)

  // edit fields
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [phone,     setPhone]     = useState('')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data } = await supabase
        .from('users')
        .select('first_name, last_name, email, phone, status, created_at, role:roles(name)')
        .eq('id', user.id)
        .single()

      if (data) {
        const p: Profile = {
          first_name: data.first_name,
          last_name:  data.last_name,
          email:      data.email,
          phone:      data.phone,
          status:     data.status,
          role:       (data.role as { name: string } | null)?.name ?? '—',
          created_at: data.created_at,
        }
        setProfile(p)
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setPhone(p.phone ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) { showToast('Name fields are required', false); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Not authenticated', false); setSaving(false); return }

    const { error } = await supabase.from('users')
      .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)

    if (error) {
      showToast('Failed to save: ' + error.message, false)
    } else {
      setProfile(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null } : prev)
      setEditing(false)
      showToast('Profile updated successfully')
    }
    setSaving(false)
  }

  function cancelEdit() {
    if (profile) { setFirstName(profile.first_name); setLastName(profile.last_name); setPhone(profile.phone ?? '') }
    setEditing(false)
  }

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  const initials = profile
    ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase()
    : '—'

  const inp: React.CSSProperties = {
    width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '10px 14px', fontSize: 14, color: '#111', outline: 'none',
    background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const readonlyInp: React.CSSProperties = { ...inp, background: '#f9fafb', color: '#6b7280', cursor: 'default' }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
      Loading profile…
    </div>
  )

  return (
    <>
      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok ? '#111' : '#dc2626', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#111' }}>Profile details</div>
        <div style={{ flex: 1 }} />
        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#008080', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="ti ti-edit" style={{ fontSize: 15 }} /> Edit profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={cancelEdit} style={{ border: '0.5px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ background: '#008080', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: 24, background: '#f9fafb', minHeight: 'calc(100% - 56px)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar + role banner */}
          <div style={{ background: '#002830', borderRadius: 12, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>
                {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
              </div>
              <div style={{ fontSize: 13, color: '#a8c8cc', marginTop: 3 }}>{profile?.role}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: profile?.status === 'active' ? 'rgba(48,176,96,0.2)' : 'rgba(239,68,68,0.15)', color: profile?.status === 'active' ? '#30B060' : '#dc2626' }}>
                {profile?.status === 'active' ? 'Active' : profile?.status ?? '—'}
              </span>
              <div style={{ fontSize: 11, color: '#a8c8cc' }}>Member since {joinDate}</div>
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-user" style={{ fontSize: 16, color: '#008080' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Personal information</span>
              {editing && <span style={{ marginLeft: 'auto', fontSize: 12, color: '#008080', fontWeight: 500 }}>Editing</span>}
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>First name {editing && <span style={{ color: '#dc2626' }}>*</span>}</label>
                {editing
                  ? <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} placeholder="First name" />
                  : <input readOnly value={profile?.first_name ?? ''} style={readonlyInp} />}
              </div>
              <div>
                <label style={lbl}>Last name {editing && <span style={{ color: '#dc2626' }}>*</span>}</label>
                {editing
                  ? <input value={lastName} onChange={e => setLastName(e.target.value)} style={inp} placeholder="Last name" />
                  : <input readOnly value={profile?.last_name ?? ''} style={readonlyInp} />}
              </div>
              <div>
                <label style={lbl}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <input readOnly value={profile?.email ?? ''} style={readonlyInp} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 10, background: '#e5e7eb', color: '#6b7280', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>Cannot change</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Phone number</label>
                {editing
                  ? <input value={phone} onChange={e => setPhone(e.target.value)} style={inp} placeholder="+1 (555) 000-0000" type="tel" />
                  : <input readOnly value={profile?.phone ?? 'Not set'} style={readonlyInp} />}
              </div>
            </div>
          </div>

          {/* Role & Account */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-shield-check" style={{ fontSize: 16, color: '#008080' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Role & account</span>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>Role / Position</label>
                <input readOnly value={profile?.role ?? '—'} style={readonlyInp} />
              </div>
              <div>
                <label style={lbl}>Account status</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', background: '#f9fafb' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.status === 'active' ? '#30B060' : '#dc2626', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#6b7280', textTransform: 'capitalize' }}>{profile?.status ?? '—'}</span>
                </div>
              </div>
              <div>
                <label style={lbl}>Date joined</label>
                <input readOnly value={joinDate} style={readonlyInp} />
              </div>
              <div>
                <label style={lbl}>Staff ID</label>
                <input readOnly value="Managed by admin" style={readonlyInp} />
              </div>
            </div>
          </div>

          {/* Security */}
          <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="ti ti-lock" style={{ fontSize: 16, color: '#008080' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>Security</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Password</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Last changed — contact admin to reset</div>
                </div>
                <button style={{ fontSize: 12, padding: '7px 14px', borderRadius: 7, border: '0.5px solid #d1d5db', background: 'transparent', color: '#374151', cursor: 'not-allowed', opacity: 0.5 }}>
                  Change password
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>Two-factor authentication</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Add an extra layer of security to your account</div>
                </div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontWeight: 600 }}>Not enabled</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
