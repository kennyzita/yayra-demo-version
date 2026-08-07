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
- totalUnits: Total authorized or approved units as a number. Look for labels like "Total Units", "Authorized Units", "Units Authorized", "Approved Units", "PA Units".
- totalHours: Total authorized hours as a number
- totalCost: Total authorized cost as a number
- unitType: Unit of measure (e.g. "15 min", "hour", "visit")
- frequency: Service frequency (e.g. "weekly", "daily")
- paNumber: Prior Authorization number. Look for "PA#", "PA Number", "Auth Number", "Authorization Number".
- paApproved: The total number of authorized/approved PA units as a number. Look for "Units Authorized", "PA Authorized Units", "Approved Units", "Total Units", "Auth Units". This is typically the same value as totalUnits. Do NOT return 0 unless the document explicitly shows 0.
- paStart: PA start date (YYYY-MM-DD format). Look for "Start Date", "Effective Date", "Auth Start", "PA Start".
- paEnd: PA end date (YYYY-MM-DD format). Look for "End Date", "Expiration Date", "Auth End", "PA End".
- planId: Plan or ISP ID
- evv: EVV status — either "EVV" or "Non-EVV". Look for "EVV", "Electronic Visit Verification".
- scCompany: Support Coordinator agency/company name. Look for "SC Agency", "Agency Name", "Support Coordination Agency".
- scEmail: Support Coordinator agency email address (the agency-level email, not the individual's email).
- scPhone: Support Coordinator agency phone number (the agency-level phone, not the individual's phone).
- scName: Individual Support Coordinator's full name. Look for "SC Name", "Support Coordinator", "Assigned SC".
- scIndEmail: Individual Support Coordinator's personal/direct email address. Look for the email listed next to the SC's name.
- scIndPhone: Individual Support Coordinator's personal/direct phone number. Look for the phone number listed next to or near the SC name. May be labeled "SC Direct", "SC Cell", "SC Phone", or appear next to the SC name in the contact block.
- scsName: Support Coordination Supervisor's full name. Look for "SCS", "Supervisor", "SC Supervisor".
- scsEmail: Support Coordination Supervisor's email address.
- scsPhone: Support Coordination Supervisor's phone number. Look for the phone number listed next to or near the SCS name.

Important notes:
- paApproved should equal totalUnits if both refer to the same authorized unit count.
- If a phone number appears only once for an SC/SCS contact block, use it for both the agency and individual phone fields.
- Phone numbers may include extensions (e.g. "609.515.1225 x 0").

Return ONLY a valid JSON object with these exact keys and no other text.`

export async function POST(req: NextRequest) {
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // HIPAA §164.308(b): Anthropic receives PHI (Medicaid IDs, DOBs, diagnoses).
  // A signed Business Associate Agreement with Anthropic must be in place before
  // this route is enabled. Sign one at anthropic.com (Enterprise plan), then set
  // ANTHROPIC_BAA_ACKNOWLEDGED=true in your environment.
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  if (!process.env.ANTHROPIC_BAA_ACKNOWLEDGED)
    return NextResponse.json(
      { error: 'HIPAA BAA required: set ANTHROPIC_BAA_ACKNOWLEDGED=true after signing BAA with Anthropic (Enterprise)' },
      { status: 503 }
    )

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
