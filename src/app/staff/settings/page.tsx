'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

type TwoFAStatus = 'loading' | 'disabled' | 'enrolling' | 'verifying' | 'enabled'

export default function StaffSettingsPage() {
  const supabase = createClient()

  // ── 2FA state ────────────────────────────────────────────────────────────────
  const [twoFAStatus,  setTwoFAStatus]  = useState<TwoFAStatus>('loading')
  const [factorId,     setFactorId]     = useState('')
  const [qrUri,        setQrUri]        = useState('')
  const [secret,       setSecret]       = useState('')
  const [code,         setCode]         = useState('')
  const [challengeId,  setChallengeId]  = useState('')
  const [enrolling,    setEnrolling]    = useState(false)
  const [verifying,    setVerifying]    = useState(false)
  const [unenrolling,  setUnenrolling]  = useState(false)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Avatar state ─────────────────────────────────────────────────────────────
  const [currentAvatar,  setCurrentAvatar]  = useState<string | null>(null)
  const [previewAvatar,  setPreviewAvatar]  = useState<string | null>(null)
  const [avatarFile,     setAvatarFile]     = useState<File | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.mfa.listFactors()
      const totp = data?.totp?.find(f => f.status === 'verified')
      if (totp) { setFactorId(totp.id); setTwoFAStatus('enabled') }
      else setTwoFAStatus('disabled')
    }
    async function loadAvatar() {
      const res = await fetch('/api/get-avatar-url')
      if (res.ok) {
        const { signedUrl } = await res.json()
        if (signedUrl) setCurrentAvatar(signedUrl)
      }
    }
    check()
    loadAvatar()
  }, [])

  async function startEnroll() {
    setEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator app' })
    if (error || !data) {
      showToast('Could not start 2FA setup: ' + (error?.message ?? 'Unknown error'), false)
      setEnrolling(false)
      return
    }
    setFactorId(data.id)
    setQrUri(data.totp.qr_code)
    setSecret(data.totp.secret)
    setTwoFAStatus('enrolling')

    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: data.id })
    if (chErr || !ch) {
      showToast('Could not create challenge: ' + (chErr?.message ?? 'Unknown error'), false)
      setEnrolling(false)
      return
    }
    setChallengeId(ch.id)
    setTwoFAStatus('verifying')
    setEnrolling(false)
  }

  async function verify() {
    if (code.length !== 6) { showToast('Enter the 6-digit code from your authenticator app', false); return }
    setVerifying(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
    if (error) {
      showToast('Invalid code — please try again', false)
    } else {
      setTwoFAStatus('enabled')
      setCode('')
      showToast('Two-factor authentication enabled!')
    }
    setVerifying(false)
  }

  async function unenroll() {
    setUnenrolling(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId })
    if (error) {
      showToast('Could not disable 2FA: ' + error.message, false)
    } else {
      setTwoFAStatus('disabled')
      setFactorId('')
      setQrUri('')
      setSecret('')
      showToast('Two-factor authentication disabled')
    }
    setUnenrolling(false)
  }

  function onAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setPreviewAvatar(URL.createObjectURL(file))
  }

  async function uploadAvatar() {
    if (!avatarFile) return
    setAvatarUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', avatarFile)
      const res = await fetch('/api/update-avatar', { method: 'POST', body: fd })
      const j   = await res.json()
      if (!res.ok) { showToast(j.error ?? 'Upload failed', false); return }
      setCurrentAvatar(j.signedUrl ?? previewAvatar)
      setPreviewAvatar(null)
      setAvatarFile(null)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      showToast('Profile photo updated!')
    } catch {
      showToast('Upload failed', false)
    } finally {
      setAvatarUploading(false)
    }
  }

  const inp: React.CSSProperties = {
    fontSize: 14, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8,
    outline: 'none', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box',
    letterSpacing: '0.15em', textAlign: 'center',
  }

  return (
    <div style={{ background: '#f4f5f7', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: toast.ok ? '#111' : '#dc2626', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>
          {toast.msg}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Settings</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Manage your account preferences and security</div>
        </div>
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 680 }}>

        {/* Avatar card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', marginBottom: 20 }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#008080', flexShrink: 0 }}>
              <i className="ti ti-user-circle" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Profile Photo</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Upload a photo that appears in your sidebar. JPEG, PNG, or WebP — max 5 MB.</div>
            </div>
          </div>
          <div style={{ padding: 24, display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
            {/* Current / preview avatar */}
            <div style={{ flexShrink: 0 }}>
              {(previewAvatar ?? currentAvatar) ? (
                <img
                  src={previewAvatar ?? currentAvatar!}
                  alt="Profile"
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e5e7eb' }}
                />
              ) : (
                <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 700, border: '3px solid #e5e7eb' }}>
                  <i className="ti ti-user" />
                </div>
              )}
            </div>
            {/* Controls */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onAvatarSelect}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  style={{ padding: '9px 18px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}
                >
                  <i className="ti ti-photo" /> Choose photo
                </button>
                {avatarFile && (
                  <button
                    type="button"
                    onClick={uploadAvatar}
                    disabled={avatarUploading}
                    style={{ padding: '9px 18px', background: avatarUploading ? '#6b7280' : '#008080', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#fff', cursor: avatarUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit' }}
                  >
                    <i className={`ti ${avatarUploading ? 'ti-loader-2' : 'ti-upload'}`} style={avatarUploading ? { animation: 'spin 1s linear infinite' } : {}} />
                    {avatarUploading ? 'Uploading…' : 'Save photo'}
                  </button>
                )}
              </div>
              {avatarFile && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                  Selected: <strong>{avatarFile.name}</strong> ({(avatarFile.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2FA card */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

          {/* Header */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#008080', flexShrink: 0 }}>
              <i className="ti ti-shield-lock" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Two-Factor Authentication (2FA)</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>Add an extra layer of security to your account using an authenticator app.</div>
            </div>
            {twoFAStatus === 'enabled' && (
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#059669', fontWeight: 600 }}>Enabled</span>
            )}
            {twoFAStatus === 'disabled' && (
              <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280', fontWeight: 500 }}>Disabled</span>
            )}
          </div>

          <div style={{ padding: '24px' }}>

            {twoFAStatus === 'loading' && (
              <div style={{ color: '#9ca3af', fontSize: 14 }}>Checking 2FA status…</div>
            )}

            {twoFAStatus === 'disabled' && (
              <div>
                <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.7, marginTop: 0, marginBottom: 20 }}>
                  When 2FA is enabled, you will be asked for a one-time code from your authenticator app (such as Google Authenticator or Authy) every time you log in.
                </p>
                <button
                  onClick={startEnroll}
                  disabled={enrolling}
                  style={{ padding: '10px 22px', background: enrolling ? '#6b7280' : '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: enrolling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
                >
                  <i className={`ti ${enrolling ? 'ti-loader-2' : 'ti-shield-plus'}`} />
                  {enrolling ? 'Setting up…' : 'Enable 2FA'}
                </button>
              </div>
            )}

            {(twoFAStatus === 'enrolling' || twoFAStatus === 'verifying') && qrUri && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 12 }}>Step 1 — Scan this QR code</div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, margin: '0 0 16px' }}>
                  Open your authenticator app and scan the QR code below. Then enter the 6-digit code to confirm.
                </p>
                <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
                  <img src={qrUri} alt="2FA QR code" style={{ width: 160, height: 160, borderRadius: 10, border: '1px solid #e5e7eb' }} />
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Or enter this secret manually:</div>
                    <code style={{ fontSize: 13, background: '#f3f4f6', padding: '6px 12px', borderRadius: 6, letterSpacing: '0.12em', display: 'block', wordBreak: 'break-all' }}>{secret}</code>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 8 }}>Step 2 — Enter the 6-digit code</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 320 }}>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    style={inp}
                  />
                  <button
                    onClick={verify}
                    disabled={verifying || code.length !== 6}
                    style={{ padding: '10px 20px', background: verifying || code.length !== 6 ? '#6b7280' : '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: verifying || code.length !== 6 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', opacity: verifying || code.length !== 6 ? 0.7 : 1 }}
                  >
                    {verifying ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {twoFAStatus === 'enabled' && (
              <div>
                <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, fontSize: 14, color: '#065f46', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <i className="ti ti-shield-check" style={{ fontSize: 18, flexShrink: 0 }} />
                  Your account is protected with two-factor authentication.
                </div>
                <button
                  onClick={unenroll}
                  disabled={unenrolling}
                  style={{ padding: '10px 22px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: unenrolling ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}
                >
                  <i className={`ti ${unenrolling ? 'ti-loader-2' : 'ti-shield-off'}`} />
                  {unenrolling ? 'Disabling…' : 'Disable 2FA'}
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
