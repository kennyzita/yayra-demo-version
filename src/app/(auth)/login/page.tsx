import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Sign In — Home Health Care' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { timeout?: string; error?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="min-h-screen bg-[#F8FAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#004050] mb-4">
            <span className="text-white text-3xl font-bold">Y</span>
          </div>
          <h1 className="text-2xl font-bold text-[#004050]">Home Health Care</h1>
          <p className="text-gray-500 mt-1 text-sm">HIPAA-Compliant Care Management</p>
        </div>

        {searchParams.timeout && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
            Your session expired due to inactivity. Please sign in again.
          </div>
        )}
        {searchParams.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            An error occurred. Please try again.
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Protected by HIPAA-compliant security · All activity is logged and monitored
        </p>
      </div>
    </div>
  )
}
