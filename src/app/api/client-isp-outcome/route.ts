import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/api-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { ok } = await requireUser()
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ isp_outcome: '' })

  const { data, error } = await supabaseAdmin
    .from('billing_client_data')
    .select('data')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ isp_outcome: '' })

  const jsonb = data.data as Record<string, unknown> | null
  return NextResponse.json({ isp_outcome: String(jsonb?.isp_outcome ?? '') })
}
