import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[send-email] RESEND_API_KEY not configured — email skipped')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Reliance Care Services <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[send-email] Resend error:', err)
    return NextResponse.json({ error: err }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
