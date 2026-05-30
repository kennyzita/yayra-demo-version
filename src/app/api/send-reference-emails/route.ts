import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { applicantName, references } = await req.json()
  if (!applicantName || !Array.isArray(references) || references.length === 0) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[send-reference-emails] RESEND_API_KEY not configured — emails skipped')
    return NextResponse.json({ ok: true, skipped: true })
  }

  const referenceFormUrl = 'https://pdf.ac/Qf9FkkG'

  const results: { email: string; ok: boolean }[] = []

  for (const ref of references) {
    if (!ref.email || !ref.name) continue

    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
        <div style="background:#004050;padding:24px 32px;border-radius:8px 8px 0 0">
          <p style="color:white;font-size:18px;font-weight:600;margin:0">Reliance Care Services</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p style="font-size:15px;margin:0 0 16px">Dear ${ref.name},</p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px">
            We are reaching out on behalf of <strong>${applicantName}</strong>, who has recently submitted an employment application with Reliance Care Services for a Direct Support Professional (DSP) position. They have listed you as a professional reference.
          </p>
          <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 24px">
            We would greatly appreciate it if you could take a few minutes to complete a brief reference form. Your response will help us better understand ${applicantName.split(' ')[0]}'s qualifications and suitability for this role.
          </p>
          <div style="text-align:center;margin:0 0 24px">
            <a href="${referenceFormUrl}" style="display:inline-block;background:#008080;color:white;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none">
              Complete Reference Form
            </a>
          </div>
          <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0">
            If the button above does not work, copy and paste the following link into your browser:<br/>
            <a href="${referenceFormUrl}" style="color:#008080">${referenceFormUrl}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
          <p style="font-size:12px;color:#9ca3af;margin:0">
            This email was sent by Reliance Care Services · admin@reliancecareservicesllc.com<br/>
            If you believe you received this in error, please disregard this message.
          </p>
        </div>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Reliance Care Services <admin@reliancecareservicesllc.com>',
        to: [ref.email],
        subject: `Reference Request for ${applicantName} — Reliance Care Services`,
        html,
      }),
    })

    results.push({ email: ref.email, ok: res.ok })
    if (!res.ok) {
      const err = await res.text()
      console.error(`[send-reference-emails] Resend error for ${ref.email}:`, err)
    }
  }

  return NextResponse.json({ ok: true, results })
}
