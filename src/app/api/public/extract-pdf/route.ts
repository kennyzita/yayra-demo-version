import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROMPT = `You are a data extraction assistant for NJ DDD (Division of Developmental Disabilities) Service Data Records (SDRs) and Prior Authorization documents.

Extract the following fields from this document and return a JSON object with EXACTLY these keys. If a field is not found, use null.

Fields to extract:
- name: Full client/patient name
- patientId: Patient or consumer ID number
- dob: Date of birth (YYYY-MM-DD format)
- sex: Sex/gender (M or F)
- county: NJ county name
- medicaidId: Medicaid ID number
- dx: Primary diagnosis / ICD-10 code
- serviceName: Name of the service (e.g. "Community-Based Services", "Individual Support")
- serviceLocation: Service location or setting
- procCode: Procedure/billing code (e.g. H2021HI, H2016HI)
- rate: Hourly or unit rate as a number (e.g. 9.77)
- totalUnits: Total authorized or approved units as a number
- totalHours: Total authorized hours as a number
- totalCost: Total authorized cost as a number
- unitType: Unit of measure (e.g. "15 min", "hour", "visit")
- frequency: Service frequency (e.g. "weekly", "daily")
- paNumber: Prior Authorization number
- paApproved: PA approved units as a number
- paStart: PA start date (YYYY-MM-DD format)
- paEnd: PA end date (YYYY-MM-DD format)
- planId: Plan or ISP ID
- evv: EVV status — either "EVV" or "Non-EVV"
- scCompany: Support Coordinator agency/company name
- scEmail: Support Coordinator agency email
- scPhone: Support Coordinator agency phone
- scName: Support Coordinator individual name
- scIndEmail: Support Coordinator individual email
- scIndPhone: Support Coordinator individual phone
- scsName: Support Coordination Supervisor name
- scsEmail: Support Coordination Supervisor email
- scsPhone: Support Coordination Supervisor phone

Return ONLY a valid JSON object with these exact keys and no other text.`

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API not configured' }, { status: 500 })
  }

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }

  const MAX_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 20 MB.' }, { status: 413 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: PROMPT },
        ] as Anthropic.ContentBlockParam[],
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse document data' }, { status: 422 })

    const data = JSON.parse(jsonMatch[0])
    return NextResponse.json({ data })
  } catch (err: unknown) {
    console.error('extract-pdf error:', err)
    const message = err instanceof Error ? err.message : 'Extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
