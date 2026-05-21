import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const serverClient = createServerClient()

  const { data: { user }, error: authErr } = await serverClient.auth.getUser()
  if (authErr || !user) {
    console.error('[/api/schedules/mine] auth error:', authErr)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[/api/schedules/mine] user:', user.id)

  const [schedulesRes, clientsRes] = await Promise.all([
    serverClient.from('schedules').select('*').eq('dsp_id', user.id).order('date').order('start_time'),
    serverClient.from('clients').select('id, full_name'),
  ])

  console.log('[/api/schedules/mine] count:', schedulesRes.data?.length, 'error:', schedulesRes.error?.message ?? null)

  return NextResponse.json({
    schedules: schedulesRes.data ?? [],
    clients: clientsRes.data ?? [],
  })
}
