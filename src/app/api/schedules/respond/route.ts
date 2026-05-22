import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const serverClient = createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scheduleId, status } = await req.json()
  if (!scheduleId || !['accepted', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Fetch schedule and verify ownership
  const { data: schedule, error: fetchErr } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (fetchErr || !schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
  if (schedule.dsp_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (schedule.status !== 'pending') return NextResponse.json({ error: 'Schedule is no longer pending' }, { status: 409 })

  const deadline = new Date(schedule.created_at).getTime() + 24 * 60 * 60 * 1000
  if (Date.now() > deadline) {
    return NextResponse.json({ error: 'Response window has expired' }, { status: 409 })
  }

  // Update status
  const { error: updateErr } = await supabaseAdmin
    .from('schedules')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', scheduleId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Gather context for admin email
  const [dspRes, clientRes, adminRes] = await Promise.all([
    supabaseAdmin.from('users').select('first_name, last_name').eq('id', user.id).single(),
    supabaseAdmin.from('clients').select('full_name').eq('id', schedule.client_id).single(),
    supabaseAdmin.from('users').select('email, role:roles(name)'),
  ])

  const dspName = dspRes.data ? `${dspRes.data.first_name} ${dspRes.data.last_name}` : 'A DSP'
  const clientName = clientRes.data?.full_name ?? 'a client'
  const adminEmails = (adminRes.data ?? [])
    .filter(u => {
      const role = (u.role as { name: string } | null)?.name
      return role === 'Admin' || role === 'HR'
    })
    .map(u => u.email)
    .filter(Boolean) as string[]

  if (adminEmails.length > 0 && process.env.RESEND_API_KEY) {
    const fmt = (t: string) => {
      const [h, m] = t.slice(0, 5).split(':').map(Number)
      const ampm = h >= 12 ? 'PM' : 'AM'
      return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
    }
    const dateStr = new Date(schedule.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const responseLabel = status === 'accepted' ? 'accepted ✅' : 'rejected ❌'
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
        <div style="background:${status === 'accepted' ? '#059669' : '#dc2626'};padding:24px;color:#fff">
          <h2 style="margin:0;font-size:20px">Reliance Care Services — Schedule ${status === 'accepted' ? 'Accepted' : 'Rejected'}</h2>
        </div>
        <div style="padding:24px">
          <p style="color:#374151;font-size:15px"><strong>${dspName}</strong> has <strong>${responseLabel}</strong> a scheduled shift.</p>
          <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:20px 0">
            <table style="width:100%;font-size:14px;color:#111">
              <tr><td style="padding:6px 0;color:#6b7280;width:100px">DSP</td><td style="font-weight:600">${dspName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Client</td><td style="font-weight:600">${clientName}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Date</td><td style="font-weight:600">${dateStr}</td></tr>
              <tr><td style="padding:6px 0;color:#6b7280">Time</td><td style="font-weight:600">${fmt(schedule.start_time)} – ${fmt(schedule.end_time)}</td></tr>
            </table>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/scheduling" style="display:inline-block;background:#008080;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">View Scheduling</a>
        </div>
      </div>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Reliance Care Services <onboarding@resend.dev>',
        to: adminEmails,
        subject: `${dspName} ${status === 'accepted' ? 'accepted' : 'rejected'} a scheduled shift`,
        html,
      }),
    })
  }

  return NextResponse.json({ ok: true })
}
