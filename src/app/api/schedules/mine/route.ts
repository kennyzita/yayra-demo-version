import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const serverClient = createServerClient()
  const { data: { user }, error: authErr } = await serverClient.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [schedules, clients] = await Promise.all([
    supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('dsp_id', user.id)
      .order('date')
      .order('start_time'),
    supabaseAdmin
      .from('clients')
      .select('id, full_name'),
  ])

  if (schedules.error) return NextResponse.json({ error: schedules.error.message }, { status: 500 })

  return NextResponse.json({ schedules: schedules.data, clients: clients.data })
}
