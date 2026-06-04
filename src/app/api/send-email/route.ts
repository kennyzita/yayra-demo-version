import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // F13: Restrict email sending to Admin/HR — prevents phishing abuse by DSP accounts
  const { data: callerProfile } = await serverClient
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const callerRole = (callerProfile?.role as { name: string } | null)?.name
  if (callerRole !== 'Admin' && callerRole !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { to, subject, html } = await req.json()
  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const result = await sendEmail({ to, subject, html })
  if (result.skipped) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
