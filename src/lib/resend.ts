// Centralised Resend email helper.
//
// Required env var:
//   RESEND_API_KEY   — get from resend.com/api-keys
//
// Optional env var:
//   RESEND_FROM      — verified sender address (e.g. "Reliance Care Services <admin@reliancecareservicesllc.com>")
//                      Defaults to Resend's shared test address which works without domain verification.
//                      Switch to your own domain once it is verified in the Resend dashboard.

const DEFAULT_FROM = 'Reliance Care Services <onboarding@resend.dev>'

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export interface SendResult {
  ok: boolean
  skipped?: boolean // true when API key is missing (not an error the caller should surface)
  error?: string
}

export async function sendEmail({ to, subject, html, from }: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('[resend] RESEND_API_KEY is not configured — email NOT sent. Set RESEND_API_KEY in .env.local.')
    return { ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }
  }

  const sender = from ?? process.env.RESEND_FROM ?? DEFAULT_FROM

  let res: Response
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[resend] Network error:', msg)
    return { ok: false, error: msg }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`)
    console.error(`[resend] API error (${res.status}):`, errText)
    return { ok: false, error: errText }
  }

  return { ok: true }
}
