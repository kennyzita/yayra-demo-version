import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'
import fs from 'fs'
import path from 'path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function calcHours(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let mn = (eh * 60 + em) - (sh * 60 + sm)
  if (mn < 0) mn += 24 * 60
  return mn > 0 ? Math.round(mn / 60 * 10) / 10 : null
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function fmtTime(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`
}

// Inject a text run into an otherwise-empty table cell paragraph.
// The empty cell looks like: ...<w:pPr>...</w:pPr></w:p>
// We want:                   ...<w:pPr>...</w:pPr><w:r><w:t>VALUE</w:t></w:r></w:p>
function injectRunIntoParagraph(paraXml: string, value: string): string {
  if (!value) return paraXml
  const run = `<w:r><w:rPr><w:rFonts w:eastAsia="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${esc(value)}</w:t></w:r>`
  return paraXml.replace(/<\/w:pPr>(<\/w:p>)/, `</w:pPr>${run}$1`)
}

// Given the full document XML, fill in one day's row (identified by the day label).
// Values: [date, startTime, endTime, totalHours]
function fillDayRow(xml: string, dayLabel: string, values: string[]): string {
  // Tempered greedy: match the <w:tr> containing dayLabel without crossing </w:tr>
  const trPat = new RegExp(
    `(<w:tr\\b(?:(?!</w:tr>)[\\s\\S])*?<w:t>${dayLabel}<\\/w:t>(?:(?!</w:tr>)[\\s\\S])*?</w:tr>)`,
  )
  return xml.replace(trPat, (row) => {
    let tcIndex = 0
    return row.replace(/<w:tc\b(?:(?!<\/w:tc>)[\s\S])*?<\/w:tc>/g, (tc) => {
      tcIndex++
      if (tcIndex === 1) return tc // day label cell — skip
      const val = values[tcIndex - 2] ?? ''
      if (!val) return tc
      return tc.replace(/<\/w:pPr>(<\/w:p>)/, `</w:pPr><w:r><w:rPr><w:rFonts w:eastAsia="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>${esc(val)}</w:t></w:r>$1`)
    })
  })
}

// Replace underscore blanks in a labelled text field, e.g.
//   "Employee Name: ___..." → "Employee Name: John Smith"
function replaceField(xml: string, prefix: string, value: string): string {
  // The <w:t> content looks like:  prefix___...  or  prefix: ___...
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return xml.replace(
    new RegExp(`(<w:t[^>]*>)(${escaped}[_]+)([^<]*<\\/w:t>)`),
    (_m, open, _blanks, rest) => `${open}${esc(prefix)}${esc(value)}${rest.replace(/[_]+/, '')}`
  )
}

// Replace the entire <w:t> content that starts with a known prefix + underscores
function replaceTextNode(xml: string, oldContent: string, newContent: string): string {
  const safeOld = oldContent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return xml.replace(new RegExp(`(<w:t[^>]*>)${safeOld}(<\\/w:t>)`), `$1${esc(newContent)}$2`)
}

// ---------------------------------------------------------------------------
// Build one DOCX buffer from the template + a timesheet record
// ---------------------------------------------------------------------------

async function buildDocx(
  templateBuf: Buffer,
  ts: {
    staff_name: string
    client_name: string
    week_start: string
    week_end: string
    total_hours: number
    entries: Array<{ day?: string; date?: string; start?: string; end?: string }>
  },
): Promise<Buffer> {
  const zip = new JSZip()
  await zip.loadAsync(templateBuf)

  let docXml = await zip.file('word/document.xml')!.async('string')

  // ── Text field replacements ─────────────────────────────────────────────
  docXml = replaceTextNode(docXml,
    'Employee Name: __________________________________',
    `Employee Name: ${ts.staff_name}`)

  docXml = replaceTextNode(docXml,
    'Position/Role: _________________________________',
    'Position/Role: DSP')

  docXml = replaceTextNode(docXml,
    'Employee Identification Number: ___________________',
    'Employee Identification Number:')

  docXml = replaceTextNode(docXml,
    'Client Name: _____________________________________',
    `Client Name: ${ts.client_name}`)

  docXml = replaceTextNode(docXml,
    'Client Address: ____________________________________________',
    'Client Address:')

  docXml = replaceTextNode(docXml,
    'Total Weekly Hours: __________________________',
    `Total Weekly Hours: ${ts.total_hours}`)

  // Update title to include the week range
  const weekRange = `${fmtDate(ts.week_start)} – ${fmtDate(ts.week_end)}`
  docXml = docXml.replace(
    /<w:t>Weekly Timesheet \(Sunday[^<]*\)<\/w:t>/,
    `<w:t>Weekly Timesheet · ${esc(weekRange)}</w:t>`,
  )

  // ── Table row fill ──────────────────────────────────────────────────────
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  // Build a map from normalized day name → entry
  const entryByDay = new Map<string, typeof ts.entries[0]>()
  for (const e of ts.entries) {
    const key = (e.day ?? '').toLowerCase().trim()
    if (key) entryByDay.set(key, e)
  }

  for (const day of DAYS) {
    const entry = entryByDay.get(day.toLowerCase())
    const date  = entry?.date  ? fmtDate(entry.date)   : ''
    const start = entry?.start ? fmtTime(entry.start)  : ''
    const end   = entry?.end   ? fmtTime(entry.end)    : ''
    const hrs   = entry?.start && entry?.end
      ? (() => { const h = calcHours(entry.start, entry.end); return h ? `${h}h` : '' })()
      : ''
    docXml = fillDayRow(docXml, day, [date, start, end, hrs])
  }

  zip.file('word/document.xml', docXml)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // Auth – Admin or HR only
  const userSupabase = createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await userSupabase
    .from('users').select('role:roles(name)').eq('id', user.id).single()
  const role = (profile?.role as unknown as { name: string } | null)?.name
  if (role !== 'Admin' && role !== 'HR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const params = req.nextUrl.searchParams
  const timesheetId = params.get('timesheetId')
  const staffId     = params.get('staffId')
  const allFlag     = params.get('all') === 'true'

  // ── Fetch timesheets ────────────────────────────────────────────────────
  let query = db.from('timesheets').select('*').order('week_start', { ascending: false })

  if (timesheetId) {
    query = query.eq('id', timesheetId)
  } else if (staffId) {
    query = query.eq('dsp_id', staffId).eq('status', 'approved')
  } else if (allFlag) {
    query = query.eq('status', 'approved')
  } else {
    return NextResponse.json({ error: 'Missing timesheetId, staffId, or all=true' }, { status: 400 })
  }

  const { data: tsRows, error: tsErr } = await query
  if (tsErr) return NextResponse.json({ error: tsErr.message }, { status: 500 })
  if (!tsRows || tsRows.length === 0) {
    return NextResponse.json({ error: 'No timesheets found' }, { status: 404 })
  }

  // Fetch user/client names
  const dspIds    = Array.from(new Set(tsRows.map((t: any) => t.dsp_id as string)))
  const clientIds = Array.from(new Set(tsRows.map((t: any) => t.client_id as string)))
  const [{ data: users }, { data: clients }] = await Promise.all([
    db.from('users').select('id, first_name, last_name').in('id', dspIds),
    db.from('clients').select('id, full_name').in('id', clientIds),
  ])
  const userMap   = new Map((users   ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
  const clientMap = new Map((clients ?? []).map((c: any) => [c.id, c.full_name as string]))

  // Load template
  const templatePath = path.join(process.cwd(), 'public', 'timesheet_template.docx')
  const templateBuf  = fs.readFileSync(templatePath)

  // Build records
  const records = tsRows.map((t: any) => ({
    id:          t.id as string,
    staff_name:  userMap.get(t.dsp_id)     ?? 'Unknown',
    client_name: clientMap.get(t.client_id) ?? 'Unknown',
    week_start:  t.week_start as string,
    week_end:    t.week_end   as string,
    total_hours: t.total_hours ?? 0,
    entries:     (t.entries ?? []) as any[],
  }))

  // ── Single timesheet → return DOCX directly ─────────────────────────────
  if (records.length === 1) {
    const r = records[0]
    const docBuf = await buildDocx(templateBuf, r)
    const safeName = `${r.staff_name.replace(/\s+/g, '_')}_${r.week_start}_Timesheet.docx`
    return new NextResponse(new Uint8Array(docBuf), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    })
  }

  // ── Multiple timesheets → ZIP of DOCXs ──────────────────────────────────
  const zipOut = new JSZip()
  await Promise.all(
    records.map(async r => {
      const docBuf  = await buildDocx(templateBuf, r)
      const safeName = `${r.staff_name.replace(/\s+/g, '_')}_${r.week_start}_Timesheet.docx`
      zipOut.file(safeName, docBuf)
    }),
  )

  const zipBuf = await zipOut.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const zipName = staffId
    ? `${records[0].staff_name.replace(/\s+/g, '_')}_Approved_Timesheets.zip`
    : 'All_Approved_Timesheets.zip'

  return new NextResponse(new Uint8Array(zipBuf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}"`,
    },
  })
}
