'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type PageState = 'verifying' | 'form' | 'success' | 'invalid'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [pageState, setPageState] = useState<PageState>('verifying')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPageState('form')
    })

    // If user already has a session (e.g. page reload after token exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState('form')
    })

    // Timeout: if no recovery event in 5 seconds, the link is invalid/expired
    const timeout = setTimeout(() => {
      setPageState(prev => prev === 'verifying' ? 'invalid' : prev)
    }, 5000)

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setPageState('success')
  }

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-[#F8FAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#004050] mb-4">
            <span className="text-white text-3xl font-bold">Y</span>
          </div>
          <h1 className="text-2xl font-bold text-[#004050]">Yayra Care</h1>
          <p className="text-gray-500 mt-1 text-sm">HIPAA-Compliant Care Management</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          Protected by HIPAA-compliant security · All activity is logged and monitored
        </p>
      </div>
    </div>
  )

  // ── Verifying ─────────────────────────────────────────────────────────────────

  if (pageState === 'verifying') {
    return shell(
      <div className="text-center space-y-4 py-4">
        <svg className="animate-spin w-8 h-8 text-[#004050] mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-gray-500">Verifying your reset link…</p>
      </div>
    )
  }

  // ── Invalid / expired link ────────────────────────────────────────────────────

  if (pageState === 'invalid') {
    return shell(
      <div className="text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-50 border border-red-100">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Link invalid or expired</p>
          <p className="text-sm text-gray-500">This password reset link has expired or has already been used. Please request a new one.</p>
        </div>
        <Button
          onClick={() => router.push('/login')}
          className="w-full"
          size="lg"
        >
          Back to sign in
        </Button>
      </div>
    )
  }

  // ── Success ───────────────────────────────────────────────────────────────────

  if (pageState === 'success') {
    return shell(
      <div className="text-center space-y-5">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 border border-green-100">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">Password updated</p>
          <p className="text-sm text-gray-500">Your password has been changed successfully. Please sign in with your new password.</p>
        </div>
        <Button
          onClick={() => router.push('/login')}
          className="w-full"
          size="lg"
        >
          Sign in
        </Button>
      </div>
    )
  }

  // ── New password form ─────────────────────────────────────────────────────────

  return shell(
    <form onSubmit={handleReset} className="space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-semibold text-gray-900">Set new password</h2>
        <p className="text-sm text-gray-500 mt-1">Choose a strong password of at least 8 characters.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <Input
        type="password"
        label="New password"
        placeholder="••••••••"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        autoComplete="new-password"
        autoFocus
      />

      <Input
        type="password"
        label="Confirm new password"
        placeholder="••••••••"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        required
        autoComplete="new-password"
        error={confirm && password !== confirm ? 'Passwords do not match' : undefined}
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Update password
      </Button>

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        ← Back to sign in
      </button>
    </form>
  )
}
