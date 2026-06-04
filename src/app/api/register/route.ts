import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, phone, password } = await req.json()

  if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'First name, last name, email and password are required.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalizedEmail = email.trim().toLowerCase()

  // Block registration if email already exists in public.users
  const { data: existing } = await db
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 })
  }

  // Create the auth user — email_confirm:true skips the PKCE verification flow,
  // which breaks for server-generated links (no browser-stored code verifier).
  // We send a branded welcome email with a direct login link instead.
  const { data: authData, error: authErr } = await db.auth.admin.createUser({
    email:         normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName.trim(), last_name: lastName.trim() },
  })

  if (authErr) {
    const msg = authErr.message.includes('already registered')
      ? 'An account with this email already exists.'
      : authErr.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const userId = authData.user.id

  // Get DSP role ID and tenant_id in parallel
  const [{ data: role, error: roleErr }, { data: tenantRows }] = await Promise.all([
    db.from('roles').select('id').eq('name', 'DSP').single(),
    db.from('users').select('tenant_id').not('tenant_id', 'is', null).limit(1),
  ])

  if (roleErr || !role) {
    console.error('[register] Could not find DSP role:', roleErr?.message)
    await db.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Server configuration error — DSP role not found.' }, { status: 500 })
  }

  const tenantId = tenantRows?.[0]?.tenant_id
  if (!tenantId) {
    console.error('[register] Could not resolve tenant_id — no existing users with tenant_id found')
    await db.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Server configuration error — tenant not found.' }, { status: 500 })
  }

  // Insert into users table
  const { error: insertErr } = await db.from('users').insert({
    id:         userId,
    tenant_id:  tenantId,
    first_name: firstName.trim(),
    last_name:  lastName.trim(),
    email:      normalizedEmail,
    phone:      phone?.trim() || null,
    role_id:    role.id,
    status:     'active',
  })
  if (insertErr) {
    console.error('[register] Failed to insert into public.users:', insertErr.message)
    await db.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Failed to create user profile. Please try again.' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://yourdomain.com'
  const loginUrl = `${appUrl}/login`

  const welcomeHtml = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#002830;padding:28px 32px;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#008080,#30B060);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14l-4-4 1.41-1.41L11 13.17l6.59-6.59L19 8l-8 8z"/></svg>
        </div>
        <span style="font-size:18px;font-weight:600;color:#fff">Reliance Care Services</span>
      </div>
      <div style="padding:32px">
        <h2 style="margin:0 0 8px;font-size:22px;color:#111">Welcome, ${firstName.trim()}!</h2>
        <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
          Your DSP account has been created and is ready to use. Click the button below to log in and get started.
        </p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#008080;color:#fff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">
          Log in to your account
        </a>
        <p style="color:#6b7280;font-size:13px;line-height:1.7;margin:24px 0 0">
          Use the email and password you registered with. Once logged in you can access your onboarding forms, schedule, case notes, and more.
          If you did not create this account, please ignore this email.
        </p>
      </div>
    </div>
  `
  const emailResult = await sendEmail({
    to: normalizedEmail,
    subject: 'Confirm your Reliance Care Services account',
    html: welcomeHtml,
  })
  if (!emailResult.ok && !emailResult.skipped) {
    console.error('[register] Confirmation email failed:', emailResult.error)
  }

  return NextResponse.json({ success: true })
}
