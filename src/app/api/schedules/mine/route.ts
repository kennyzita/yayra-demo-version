import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const serverClient = createServerClient()

  const { data: { user }, error: authErr } = await serverClient.auth.getUser()
  if (authErr || !user) {
    console.error('[/api/schedules/mine] auth error:', authErr)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role so RLS doesn't silently drop rows due to JWT not being
  // forwarded to PostgREST. We still enforce ownership via .eq('dsp_id', user.id).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const db = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : serverClient

  console.log('[/api/schedules/mine] user:', user.id, 'using service role:', !!serviceKey)

  const [schedulesRes, clientsRes] = await Promise.all([
    db.from('schedules').select('*').eq('dsp_id', user.id).order('date').order('start_time'),
    db.from('clients').select('id, full_name'),
  ])

  console.log('[/api/schedules/mine] count:', schedulesRes.data?.length, 'error:', schedulesRes.error?.message ?? null)

  return NextResponse.json({
    schedules: schedulesRes.data ?? [],
    clients: clientsRes.data ?? [],
    _debug: { userId: user.id, count: schedulesRes.data?.length ?? 0, serviceRole: !!serviceKey },
  })
}
