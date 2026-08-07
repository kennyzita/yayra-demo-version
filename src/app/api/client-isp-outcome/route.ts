import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/api-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { ok, userId, role } = await requireUser()
  if (!ok || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ isp_outcome: '' })

  // Admins and HR can access any client.
  // DSP Staff must have an active assignment for the requested client.
  // Use the user's own session client so RLS on assignments acts as a second layer.
  if (role !== 'Admin' && role !== 'HR') {
    const userSupabase = createServerClient()
    const { data: assignment } = await userSupabase
      .from('assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('dsp_id', userId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('billing_client_data')
    .select('data')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ isp_outcome: '' })

  const jsonb = data.data as Record<string, unknown> | null
  return NextResponse.json({ isp_outcome: String(jsonb?.isp_outcome ?? '') })
}
