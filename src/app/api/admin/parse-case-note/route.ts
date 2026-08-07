import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { requireAdminOrHR } from '@/lib/api-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { ok } = await requireAdminOrHR()
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // HIPAA §164.308(b): Anthropic receives PHI (client names, activity descriptions).
    // A signed Business Associate Agreement with Anthropic must be in place before
    // this route is enabled. Sign one at anthropic.com (Enterprise plan), then set
    // ANTHROPIC_BAA_ACKNOWLEDGED=true in your environment.
    if (!process.env.ANTHROPIC_API_KEY)
      return NextResponse.json({ error: 'Anthropic API not configured' }, { status: 503 })
    if (!process.env.ANTHROPIC_BAA_ACKNOWLEDGED)
      return NextResponse.json(
        { error: 'HIPAA BAA required: set ANTHROPIC_BAA_ACKNOWLEDGED=true after signing BAA with Anthropic (Enterprise)' },
        { status: 503 }
      )

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')

    // Ensure bucket exists (ignore error if already exists)
    await supabaseAdmin.storage.createBucket('case-note-uploads', { public: false }).catch(() => {})

    // Save PDF to storage
    const storageKey = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('case-note-uploads')
      .upload(storageKey, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) console.error('[case-note upload] storage error:', uploadErr.message)

    // Extract structured data with Claude
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          {
            type: 'text',
            text: `Extract structured data from this NJ DDD Community Based / Individual Supports daily log form.
Return ONLY a valid JSON object — no markdown fences, no explanation, no extra text.

{
  "clientName": "full name from the Name field",
  "completedBy": "name from the Completed By field",
  "servicePlanYear": "year as 4-digit string",
  "ispOutcome": "full ISP Outcome text",
  "strategies": ["only checked strategy titles from: Assistance with Activities of Daily Living | Assistance with Increasing Community Participation | Assistance with Increasing Independence | Assistance with On-The-Job Support | Assistance with Learning Activities"],
  "entries": [
    { "date": "YYYY-MM-DD", "start": "HH:MM", "end": "HH:MM", "strategy": "Individualized Activity column text", "desc": "narrative description text" }
  ]
}

Time conversion rules (form uses decimal notation):
- 10.00 → 10:00, 11.00 → 11:00, 12.00 → 12:00 (noon)
- 1.00 → 13:00, 2.00 → 14:00, 3.00 → 15:00, 4.00 → 16:00 (PM hours get +12 after 12)
- The date appears only on the first data row; apply it to all rows on that same sheet.
Skip empty table rows. Do not include blank entries.`
          }
        ]
      }]
    })

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not extract structured data from PDF', raw: rawText }, { status: 422 })
    }

    let extracted: Record<string, unknown>
    try {
      extracted = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Extracted JSON is malformed', raw: rawText }, { status: 422 })
    }

    return NextResponse.json({ ...extracted, storagePath: uploadErr ? null : storageKey })
  } catch (e: any) {
    console.error('[parse-case-note]', e)
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 500 })
  }
}
