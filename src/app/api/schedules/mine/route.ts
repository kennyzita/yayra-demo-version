import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const serverClient = createServerClient()

  const { data: { user }, error: authErr } = await serverClient.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const db = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : serverClient

  const schedulesRes = await db
    .from('schedules')
    .select('*')
    .eq('dsp_id', user.id)
    .order('date')
    .order('start_time')

  // F9: Only return clients that appear in this DSP's schedules — not all clients
  const clientIds = [...new Set((schedulesRes.data ?? []).map((s: any) => s.client_id).filter(Boolean))]

  const clientsRes = clientIds.length > 0
    ? await db.from('clients').select('id, full_name').in('id', clientIds)
    : { data: [] }

  return NextResponse.json({
    schedules: schedulesRes.data ?? [],
    clients: clientsRes.data ?? [],
    // F21: _debug field removed — do not expose internal state to clients
  })
}
