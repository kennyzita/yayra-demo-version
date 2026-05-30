'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  role: string
  created_at: string
  street_address: string
  city_state_zip: string
  emergency_contact: string
}

export default function AdminProfilePage() {
  const supabase = createClient()

  const [profile,          setProfile]          = useState<ProfileData | null>(null)
  const [loading,          setLoading]          = useState(true)
  const [saving,           setSaving]           = useState(false)
  const [toast,            setToast]            = useState<{ msg: string; ok: boolean } | null>(null)
  const [staffId,          setStaffId]          = useState('—')
  const [firstName,        setFirstName]        = useState('')
  const [lastName,         setLastName]         = useState('')
  const [phone,            setPhone]            = useState('')
  const [streetAddress,    setStreetAddress]    = useState('')
  const [cityStateZip,     setCityStateZip]     = useState('')
  const [emergencyContact, setEmergencyContact] = useState('')

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: userData }, { data: billingData }, { data: allUsersData }] = await Promise.all([
        supabase.from('users')
          .select('id, first_name, last_name, email, phone, created_at, role:roles(name)')
          .eq('id', user.id)
          .single(),
        supabase.from('billing_staff_data')
          .select('data')
          .eq('staff_id', user.id)
          .maybeSingle(),
        supabase.from('users')
          .select('id, first_name, last_name')
          .order('created_at', { ascending: true }),
      ])

      if (userData) {
        const extra = (billingData?.data as Record<string, string>) ?? {}
        const p: ProfileData = {
          id:                userData.id,
          first_name:        userData.first_name,
          last_name:         userData.last_name,
          email:             userData.email,
          phone:             userData.phone ?? '',
          role:              (userData.role as { name: string } | null)?.name ?? 'Admin',
          created_at:        userData.created_at,
          street_address:    extra.street_address    ?? '',
          city_state_zip:    extra.city_state_zip    ?? '',
          emergency_contact: extra.emergency_contact ?? '',
        }
        setProfile(p)
        setFirstName(p.first_name)
        setLastName(p.last_name)
        setPhone(p.phone)
        setStreetAddress(p.street_address)
        setCityStateZip(p.city_state_zip)
        setEmergencyContact(p.emergency_contact)

        const fullName = `${userData.first_name} ${userData.last_name}`.trim()
        if (fullName === 'Rasheed Yekini') {
          setStaffId('RCS-001')
        } else {
          const others = (allUsersData ?? []).filter((u: any) => `${u.first_name} ${u.last_name}`.trim() !== 'Rasheed Yekini')
          const pos = others.findIndex((u: any) => u.id === user.id)
          setStaffId(pos >= 0 ? `RCS-${String(pos + 2).padStart(3, '0')}` : 'RCS-???')
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      showToast('First and last name are required', false); return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Not authenticated', false); setSaving(false); return }

    const { error: userErr } = await supabase.from('users')
      .update({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)

    if (userErr) { showToast('Failed to save: ' + userErr.message, false); setSaving(false); return }

    const existingData = ((await supabase.from('billing_staff_data').select('data').eq('staff_id', user.id).maybeSingle()).data?.data as Record<string, string>) ?? {}
    await supabase.from('billing_staff_data').upsert({
      staff_id: user.id,
      data: { ...existingData, street_address: streetAddress.trim(), city_state_zip: cityStateZip.trim(), emergency_contact: emergencyContact.trim() },
    })

    setProfile(prev => prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim(), street_address: streetAddress.trim(), city_state_zip: cityStateZip.trim(), emergency_contact: emergencyContact.trim() } : prev)
    showToast('Profile updated successfully')
    setSaving(false)
  }

  function handleCancel() {
    if (!profile) return
    setFirstName(profile.first_name); setLastName(profile.last_name)
    setPhone(profile.phone); setStreetAddress(profile.street_address)
    setCityStateZip(profile.city_state_zip); setEmergencyContact(profile.emergency_contact)
    showToast('Changes cancelled')
  }

  const initials   = profile ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase() : '—'
  const joinDate   = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'
  const staffIdShort = staffId

  const inp: React.CSSProperties = { width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#111', outline: 'none', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }
  const readonlyInp: React.CSSProperties = { ...inp, background: '#f3f4f6', color: '#6b7280', cursor: 'default' }
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: 14 }}>
      Loading profile…
    </div>
  )

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok ? '#111' : '#dc2626', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Profile Details</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Manage your personal information</div>
        </div>
      </div>

      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #002830 60%, #004050)', padding: '32px 32px 28px', display: 'flex', alignItems: 'center', gap: 22, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)' }}>
          {initials}
        </div>

        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            {profile ? `${profile.first_name} ${profile.last_name}` : '—'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 12 }}>
            {profile?.role} · Reliance Care Services
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              cityStateZip || profile?.city_state_zip || null,
              `Staff ID: ${staffIdShort}`,
              `Since ${joinDate}`,
            ].filter(Boolean).map((chip, i) => (
              <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '0.5px solid rgba(255,255,255,0.15)' }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '24px 32px', flex: 1 }}>
        <div style={{ maxWidth: 860, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Personal Information</div>
            <div style={{ fontSize: 13, color: '#008080', marginTop: 3 }}>Keep your details up to date.</div>
          </div>

          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
            <div>
              <label style={lbl}>First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} placeholder="First name" />
            </div>
            <div>
              <label style={lbl}>Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={inp} placeholder="Last name" />
            </div>
            <div>
              <label style={lbl}>Email Address</label>
              <input readOnly value={profile?.email ?? ''} style={readonlyInp} title="Contact system administrator to change email" />
            </div>
            <div>
              <label style={lbl}>Phone Number</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} style={inp} placeholder="+1 (347) 555-0192" type="tel" />
            </div>
            <div>
              <label style={lbl}>Street Address</label>
              <input value={streetAddress} onChange={e => setStreetAddress(e.target.value)} style={inp} placeholder="559 Jefferson Ave" />
            </div>
            <div>
              <label style={lbl}>City / State / ZIP</label>
              <input value={cityStateZip} onChange={e => setCityStateZip(e.target.value)} style={inp} placeholder="Elizabeth, NJ 07201" />
            </div>
            <div>
              <label style={lbl}>Emergency Contact</label>
              <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} style={inp} placeholder="Name — (347) 555-0100" />
            </div>
            <div>
              <label style={lbl}>Role</label>
              <div style={{ position: 'relative' }}>
                <select disabled value={profile?.role ?? ''} style={{ ...readonlyInp, appearance: 'none', paddingRight: 36, cursor: 'default' }}>
                  <option>{profile?.role ?? 'Admin'}</option>
                </select>
                <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{ padding: '11px 24px', background: saving ? '#6b7280' : '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.8 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={handleCancel} disabled={saving} style={{ padding: '11px 20px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
