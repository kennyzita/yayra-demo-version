import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ isp_outcome: '' })

  const supabase = createClient()
  const { data, error } = await supabase
    .from('billing_client_data')
    .select('data')
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) return NextResponse.json({ isp_outcome: '' })

  const jsonb = data.data as Record<string, unknown> | null
  return NextResponse.json({ isp_outcome: String(jsonb?.isp_outcome ?? '') })
}
