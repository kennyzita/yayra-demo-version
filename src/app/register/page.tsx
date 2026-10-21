'use client'

import { useState } from 'react'
import Link from 'next/link'

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14, border: '1px solid #d1d5db',
  borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  color: '#111', background: '#fff',
}
const lbl: React.CSSProperties = {
  fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5,
}

export default function RegisterPage() {
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [done,        setDone]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!firstName.trim() || !lastName.trim()) { setError('First and last name are required.'); return }
    if (!email.trim())                          { setError('Email address is required.'); return }
    if (password.length < 8)                    { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm)                   { setError('Passwords do not match.'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, password }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Registration failed. Please try again.'); return }
      setDone(true)
    } catch {
      setError('Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', padding: '24px 16px' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(48,176,96,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: '#30B060', margin: '0 auto 20px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#30B060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '0 0 10px' }}>Account Created!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.75, margin: '0 0 8px' }}>
            A confirmation email has been sent to <strong>{email}</strong>.
          </p>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.75, margin: '0 0 28px' }}>
            Please check your inbox and click the verification link to activate your account, then log in below.
          </p>
          <Link
            href="/login"
            style={{ display: 'inline-block', padding: '12px 32px', background: '#008080', color: '#fff', borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
          >
            Go to Login
          </Link>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 20 }}>
            Questions? Email{' '}
            <a href="mailto:info@yellowstrides.com" style={{ color: '#008080', textDecoration: 'none' }}>
              info@yellowstrides.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f5f7', padding: '24px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '40px', maxWidth: 480, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#008080,#30B060)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#002830' }}>Yayra Care</span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '0 0 4px' }}>Create your DSP account</h1>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 28px', lineHeight: 1.6 }}>
          Register as a Direct Support Professional to get started.
        </p>

        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, fontSize: 13, color: '#dc2626', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={lbl}>First name <span style={{ color: '#e24b4a' }}>*</span></label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} style={inp} placeholder="First name" required />
            </div>
            <div>
              <label style={lbl}>Last name <span style={{ color: '#e24b4a' }}>*</span></label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} style={inp} placeholder="Last name" required />
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email address <span style={{ color: '#e24b4a' }}>*</span></label>
            <input value={email} onChange={e => setEmail(e.target.value)} style={inp} type="email" placeholder="you@example.com" required />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Phone number <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)} style={inp} type="tel" placeholder="(000) 000-0000" />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Password <span style={{ color: '#e24b4a' }}>*</span></label>
            <div style={{ position: 'relative' }}>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPw ? 'text' : 'password'}
                style={{ ...inp, paddingRight: 42 }}
                placeholder="Minimum 8 characters"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {showPw
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
            {password.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                {[1,2,3,4].map(n => (
                  <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: password.length >= n * 3 ? (password.length < 6 ? '#ef4444' : password.length < 10 ? '#f59e0b' : '#22c55e') : '#f3f4f6', transition: 'background 0.2s' }} />
                ))}
                <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', marginLeft: 6 }}>
                  {password.length < 6 ? 'Weak' : password.length < 10 ? 'Fair' : 'Strong'}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Confirm password <span style={{ color: '#e24b4a' }}>*</span></label>
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              type={showPw ? 'text' : 'password'}
              style={{ ...inp, borderColor: confirm && confirm !== password ? '#fca5a5' : '#d1d5db' }}
              placeholder="Re-enter your password"
              required
            />
            {confirm && confirm !== password && (
              <p style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: '100%', padding: '13px', background: submitting ? '#6b7280' : '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: submitting ? 0.85 : 1 }}
          >
            {submitting && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
            )}
            {submitting ? 'Creating account…' : 'Create DSP account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#008080', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>

      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
