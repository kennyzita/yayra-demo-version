'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    if (factorsData?.totp && factorsData.totp.length > 0) {
      setStep('mfa')
      setLoading(false)
      return
    }

    await redirectAfterLogin(data.session?.user?.id)
  }

  async function handleMFAVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: factorsData } = await supabase.auth.mfa.listFactors()
    const totpFactor = factorsData?.totp[0]

    if (!totpFactor) {
      setError('No MFA factor found')
      setLoading(false)
      return
    }

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    })

    if (challengeError || !challengeData) {
      setError(challengeError?.message ?? 'Challenge failed')
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challengeData.id,
      code: mfaCode,
    })

    if (verifyError) {
      setError('Invalid verification code. Please try again.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    await redirectAfterLogin(session?.user?.id)
  }

  async function redirectAfterLogin(userId?: string) {
    if (!userId) {
      setError('Login failed. Please try again.')
      setLoading(false)
      return
    }

    const { data: user } = await supabase
      .from('users')
      .select('role:roles(name)')
      .eq('id', userId)
      .single()

    const roleName = (user?.role as { name: string } | null)?.name

    if (roleName === 'Admin' || roleName === 'HR') {
      router.push('/admin/dashboard')
    } else if (roleName === 'DSP') {
      router.push('/staff/application')
    } else {
      router.push('/staff/dashboard')
    }
    router.refresh()
  }

  if (step === 'mfa') {
    return (
      <form onSubmit={handleMFAVerify} className="space-y-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#004050]/10 mb-3">
            <svg className="w-6 h-6 text-[#004050]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000000"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          className="text-center text-2xl tracking-widest font-mono"
          required
          autoFocus
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Verify &amp; Sign in
        </Button>

        <button
          type="button"
          onClick={() => { setStep('credentials'); setError(null) }}
          className="w-full text-sm text-gray-500 hover:text-gray-700"
        >
          Back to sign in
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <Input
        type="email"
        label="Email address"
        placeholder="name@agency.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        type="password"
        label="Password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Sign in
      </Button>
    </form>
  )
}
