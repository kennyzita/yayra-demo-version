'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── PDF helpers (shared with staff page) ────────────────────────────────────

const STRATEGIES_PDF = [
  'Assistance with Activities of Daily Living (such as getting dressed, eating, personal hygiene, etc.)',
  'Assistance with Increasing Community Participation (such as daily errands, attending events, restaurant, purchasing items, travel training, etc.)',
  'Assistance with Increasing Independence (such as helping the individual learn to do laundry, cook, clean, dress, grocery shop, pay for items, etc.)',
  'Assistance with On-The-Job Support (such as safety awareness, using the restroom, attending to task, lunch/breaks, etc.)',
  'Assistance with Learning Activities (such as basic tutoring – math, reading, writing; support in attending a class; etc.)',
]
const STRATEGIES_TITLES = [
  'Assistance with Activities of Daily Living',
  'Assistance with Increasing Community Participation',
  'Assistance with Increasing Independence',
  'Assistance with On-The-Job Support',
  'Assistance with Learning Activities',
]

function parseWeekRange(weekLabel: string): { start: Date; end: Date } | null {
  const parts = weekLabel.split('–').map(s => s.trim())
  if (parts.length !== 2) return null
  const start = new Date(parts[0])
  const end   = new Date(parts[1])
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  return { start, end }
}

function formatTimePDF(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const h12 = h % 12 || 12
  return `${h12}.${String(m).padStart(2, '0')}`
}

function fmtMDY(dateStr: string): string {
  if (!dateStr || dateStr === '_nodate') return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`
}

function dateToWeekLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const sun = new Date(d); sun.setDate(d.getDate() - d.getDay())
  const sat = new Date(sun); sat.setDate(sun.getDate() + 6)
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(sun)} – ${fmt(sat)}`
}

// ── Types ────────────────────────────────────────────────────────────────────

type CnRecord = {
  id: string; dsp_id: string; client_id: string
  staff_name: string; client_name: string
  week_label: string; status: string
  submitted_at: string | null
  strategies: string[]; entries: any[]
}

type StaffUser  = { id: string; name: string }
type ClientItem = { id: string; name: string }

type ParsedNote = {
  clientName: string; completedBy: string; ispOutcome: string
  servicePlanYear: string; strategies: string[]
  entries: { date: string; start: string; end: string; strategy: string; desc: string }[]
  storagePath: string | null
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  submitted: { bg: 'rgba(234,179,8,0.12)',  color: '#854d0e', label: 'Pending'  },
  approved:  { bg: 'rgba(22,163,74,0.1)',   color: '#16a34a', label: 'Approved' },
  rejected:  { bg: 'rgba(220,38,38,0.1)',   color: '#dc2626', label: 'Rejected' },
  draft:     { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Draft'    },
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminCaseNotesPage() {
  const supabase = createClient()

  // Core data
  const [records,      setRecords]      = useState<CnRecord[]>([])
  const [dspStaff,     setDspStaff]     = useState<StaffUser[]>([])
  const [allClients,   setAllClients]   = useState<ClientItem[]>([])
  const [loading,      setLoading]      = useState(true)

  // Filters / UI
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [search,          setSearch]          = useState('')
  const [filterStatus,    setFilterStatus]    = useState('All')
  const [expandedId,      setExpandedId]      = useState<string | null>(null)
  const [expandedWeek,    setExpandedWeek]    = useState<string | null>(null)
  const [actioning,       setActioning]       = useState<string | null>(null)
  const [rejectingId,     setRejectingId]     = useState<string | null>(null)
  const [toast,           setToast]           = useState('')
  const [editingEntry,    setEditingEntry]    = useState<{ noteId: string; entryIndex: number; desc: string } | null>(null)
  const [downloadingWeek, setDownloadingWeek] = useState<string | null>(null)

  // Upload modal
  const [showUpload,     setShowUpload]     = useState(false)
  const [uploadFile,     setUploadFile]     = useState<File | null>(null)
  const [uploadParsing,  setUploadParsing]  = useState(false)
  const [uploadPreview,  setUploadPreview]  = useState<ParsedNote | null>(null)
  const [uploadStaffId,  setUploadStaffId]  = useState('')
  const [uploadClientId, setUploadClientId] = useState('')
  const [uploadWeekLabel,setUploadWeekLabel]= useState('')
  const [uploadSaving,   setUploadSaving]   = useState(false)
  const [uploadError,    setUploadError]    = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: cnData }, { data: usersData }, { data: clientsData }, { data: rolesData }] = await Promise.all([
      supabase.from('case_notes').select('*').neq('status', 'draft').order('submitted_at', { ascending: false }),
      supabase.from('users').select('id, first_name, last_name, role_id'),
      supabase.from('clients').select('id, full_name'),
      supabase.from('roles').select('id, name'),
    ])

    const userMap   = new Map((usersData   ?? []).map((u: any) => [u.id, { name: `${u.first_name} ${u.last_name}`, roleId: u.role_id }]))
    const clientMap = new Map((clientsData ?? []).map((c: any) => [c.id, c.full_name as string]))
    const roleMap   = new Map((rolesData   ?? []).map((r: any) => [r.id, r.name as string]))

    // DSP Staff users only
    const dsp: StaffUser[] = []
    userMap.forEach((v, id) => {
      if (roleMap.get(v.roleId) === 'DSP Staff') dsp.push({ id, name: v.name })
    })
    dsp.sort((a, b) => a.name.localeCompare(b.name))
    setDspStaff(dsp)

    const clients: ClientItem[] = (clientsData ?? []).map((c: any) => ({ id: c.id, name: c.full_name }))
    clients.sort((a, b) => a.name.localeCompare(b.name))
    setAllClients(clients)

    setRecords((cnData ?? []).map((n: any) => ({
      id: n.id, dsp_id: n.dsp_id, client_id: n.client_id,
      staff_name:  userMap.get(n.dsp_id)?.name    ?? 'Unknown staff',
      client_name: clientMap.get(n.client_id)     ?? 'Unknown client',
      week_label: n.week_label, status: n.status ?? 'submitted',
      submitted_at: n.submitted_at,
      strategies: n.strategies ?? [], entries: n.entries ?? [],
    })))
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  async function handleApprove(id: string) {
    setActioning(id)
    const { error } = await supabase.from('case_notes').update({ status: 'approved' }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Case note approved ✓'); setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r)) }
    setActioning(null)
  }

  async function handleReject(id: string) {
    setActioning(id)
    const { error } = await supabase.from('case_notes').update({ status: 'rejected' }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else { showToast('Case note rejected'); setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r)); setRejectingId(null) }
    setActioning(null)
  }

  async function saveEntryEdit(noteId: string, updatedEntries: any[]) {
    const { error } = await supabase.from('case_notes').update({ entries: updatedEntries }).eq('id', noteId)
    if (error) { showToast('Error: ' + error.message); return }
    showToast('Entry updated ✓')
    setRecords(prev => prev.map(r => r.id === noteId ? { ...r, entries: updatedEntries } : r))
    setEditingEntry(null)
  }

  // ── PDF Download ─────────────────────────────────────────────────────────

  async function downloadWeekPDF(weekLabel: string, weekRecords: CnRecord[], staffFullName: string) {
    setDownloadingWeek(weekLabel)
    try {
      const uniqueClientIds = [...new Set(weekRecords.map(r => r.client_id))]
      const ispMap: Record<string, string> = {}
      await Promise.all(uniqueClientIds.map(async (cid) => {
        try {
          const res = await fetch(`/api/client-isp-outcome?clientId=${cid}`)
          const j   = await res.json()
          ispMap[cid] = j.isp_outcome ?? ''
        } catch { ispMap[cid] = '' }
      }))

      type PageData = { clientName: string; clientId: string; ispOutcome: string; strategies: string[]; date: string; entries: any[] }
      const pages: PageData[] = []

      for (const record of weekRecords) {
        const byDate = new Map<string, any[]>()
        for (const e of record.entries) {
          const d = e.date || '_nodate'
          if (!byDate.has(d)) byDate.set(d, [])
          byDate.get(d)!.push(e)
        }
        for (const [date, dateEntries] of byDate) {
          const existing = pages.find(p => p.clientId === record.client_id && p.date === date)
          if (existing) {
            existing.entries.push(...dateEntries)
            for (const s of record.strategies) {
              if (!existing.strategies.includes(s)) existing.strategies.push(s)
            }
          } else {
            pages.push({
              clientName:  record.client_name,
              clientId:    record.client_id,
              ispOutcome:  ispMap[record.client_id] ?? '',
              strategies:  [...record.strategies],
              date, entries: [...dateEntries],
            })
          }
        }
      }
      pages.sort((a, b) => a.date.localeCompare(b.date) || a.clientName.localeCompare(b.clientName))

      if (pages.length === 0) { showToast('No entries to download'); return }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'letter' })
      const LM = 14, RM = 14, PW = 215.9
      const usable = PW - LM - RM

      // Fetch logos from /public (same-origin, no CORS)
      let njSealB64 = '', dddLogoB64 = ''
      try {
        const toB64 = async (path: string) => {
          const r = await fetch(path)
          if (!r.ok) return ''
          const buf = await r.arrayBuffer()
          return btoa(String.fromCharCode(...new Uint8Array(buf)))
        }
        ;[njSealB64, dddLogoB64] = await Promise.all([toB64('/nj-seal.jpeg'), toB64('/ddd-logo.jpeg')])
      } catch { /* logos optional — fall back to placeholders */ }

      pages.forEach((page, pageIdx) => {
        if (pageIdx > 0) doc.addPage()
        let y  = 8
        const cx = PW / 2

        // Logo boxes — NJ Seal (left) and DDD logo (right)
        if (njSealB64) {
          doc.addImage(`data:image/jpeg;base64,${njSealB64}`, 'JPEG', LM, y, 22, 22)
        } else {
          doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.25)
          doc.rect(LM, y, 22, 22, 'S')
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(130, 130, 130)
          doc.text('[NJ Seal]', LM + 11, y + 12, { align: 'center' })
        }
        // DDD logo is portrait (165×261) — display at 14×22mm to preserve ratio
        if (dddLogoB64) {
          doc.addImage(`data:image/jpeg;base64,${dddLogoB64}`, 'JPEG', PW - RM - 14, y, 14, 22)
        } else {
          doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.25)
          doc.rect(PW - RM - 14, y, 14, 22, 'S')
          doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(130, 130, 130)
          doc.text('[DDD]', PW - RM - 7, y + 12, { align: 'center' })
        }

        doc.setTextColor(0, 0, 0); doc.setFontSize(8.5)
        doc.text('New Jersey Department of Human Services', cx, y + 6, { align: 'center' })
        doc.text('Division of Developmental Disabilities',   cx, y + 11, { align: 'center' })
        doc.setTextColor(0, 0, 200)
        doc.text('www.nj.gov/humanservices/ddd', cx, y + 16, { align: 'center' })
        doc.setTextColor(0, 0, 0)

        y = 36
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
        doc.text('Community Based / Individual Supports', cx, y, { align: 'center' })
        y += 5
        doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(7)
        doc.text('(Not applicable when delivering daily rate version of Individual Supports. Only used for 15 minute unit version)', cx, y, { align: 'center', maxWidth: usable - 40 })
        y += 7

        const spYear = page.date && page.date !== '_nodate'
          ? String(new Date(page.date + 'T00:00:00').getFullYear())
          : String(new Date().getFullYear())

        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5)
        doc.text('Name:', LM, y + 3.5)
        doc.setFont('helvetica', 'normal'); doc.text(page.clientName, LM + 13, y + 3.5)
        doc.setLineWidth(0.25); doc.setDrawColor(0, 0, 0)
        doc.line(LM + 12, y + 4.5, LM + 93, y + 4.5)
        doc.setFont('helvetica', 'bold'); doc.text('Service Plan Year:', LM + 103, y + 3.5)
        doc.setFont('helvetica', 'normal'); doc.text(spYear, LM + 137, y + 3.5)
        doc.line(LM + 136, y + 4.5, PW - RM, y + 4.5)
        y += 9

        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text('ISP Outcome:', LM, y + 3.5)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
        if (page.ispOutcome) {
          const ispLines = doc.splitTextToSize(page.ispOutcome, usable - 30) as string[]
          if (ispLines.length > 0) doc.text(ispLines[0], LM + 28, y + 3.5)
        }
        doc.setLineWidth(0.25); doc.line(LM + 27, y + 4.5, PW - RM, y + 4.5)
        y += 10

        doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
        doc.text('Service Strategies (check all that apply):', LM, y); y += 5
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setLineWidth(0.25)

        STRATEGIES_PDF.forEach((fullText, si) => {
          const isChecked = page.strategies.some(s => s.trim() === STRATEGIES_TITLES[si])
          doc.setDrawColor(0, 0, 0); doc.rect(LM, y - 2.8, 3.2, 3.2, 'S')
          if (isChecked) {
            doc.setLineWidth(0.5)
            doc.line(LM + 0.4, y - 1.2, LM + 1.5, y - 0.2)
            doc.line(LM + 1.5, y - 0.2, LM + 3, y - 2.5)
            doc.setLineWidth(0.25)
          }
          const lines = doc.splitTextToSize(fullText, usable - 5) as string[]
          doc.text(lines, LM + 5, y); y += lines.length * 3.6 + 0.5
        })
        y += 2

        const C_DATE = 22, C_START = 14, C_END = 14, C_ACT = 58, C_DESC = usable - 22 - 14 - 14 - 58
        const colX = [LM, LM + C_DATE, LM + C_DATE + C_START, LM + C_DATE + C_START + C_END, LM + C_DATE + C_START + C_END + C_ACT]
        const drawCols = (ry: number, rh: number) => { for (let ci = 1; ci < colX.length; ci++) doc.line(colX[ci], ry, colX[ci], ry + rh) }

        const HDR_H = 10
        doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3)
        doc.rect(LM, y, usable, HDR_H, 'S'); drawCols(y, HDR_H)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5)
        doc.text('Date', colX[0] + C_DATE / 2, y + HDR_H / 2 + 1, { align: 'center' })
        doc.text('Start', colX[1] + C_START / 2, y + 3.5, { align: 'center' })
        doc.text('Time',  colX[1] + C_START / 2, y + 7,   { align: 'center' })
        doc.text('End',  colX[2] + C_END / 2,  y + 3.5, { align: 'center' })
        doc.text('Time', colX[2] + C_END / 2,  y + 7,   { align: 'center' })
        const actHdr = doc.splitTextToSize('Individualized Activity', C_ACT - 2) as string[]
        doc.text(actHdr, colX[3] + C_ACT / 2, y + 3, { align: 'center' })
        const descHdr = doc.splitTextToSize('Tell us about the day, and how the activities will help the individual reach the above outcome', C_DESC - 2) as string[]
        doc.text(descHdr, colX[4] + C_DESC / 2, y + 2, { align: 'center' })
        y += HDR_H

        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setLineWidth(0.2)
        doc.setTextColor(0, 0, 0)
        // Sort entries ascending by start time
        page.entries.sort((a: any, b: any) => (a.start || '').localeCompare(b.start || ''))
        const dateStr = fmtMDY(page.date)
        const ROW_H = 7.5
        const totalRows = Math.max(10, page.entries.length + 2)
        let dateRendered = false

        for (let ri = 0; ri < totalRows; ri++) {
          const entry = page.entries[ri]
          doc.setDrawColor(0, 0, 0); doc.rect(LM, y, usable, ROW_H, 'S'); drawCols(y, ROW_H)
          if (entry) {
            const midY = y + ROW_H / 2 + 1.2
            if (!dateRendered && dateStr) {
              doc.setFontSize(7.5); doc.text(dateStr, colX[0] + 1, midY); dateRendered = true
            }
            doc.setFontSize(8)
            const startTxt = formatTimePDF(entry.start ?? '')
            const endTxt   = formatTimePDF(entry.end   ?? '')
            if (startTxt) doc.text(startTxt, colX[1] + C_START / 2, midY, { align: 'center' })
            if (endTxt)   doc.text(endTxt,   colX[2] + C_END   / 2, midY, { align: 'center' })
            const actTxt = (entry.strategy ?? '').trim()
            if (actTxt) {
              const actL = doc.splitTextToSize(actTxt, C_ACT - 2) as string[]
              if (actL[0]) doc.text(actL[0], colX[3] + 1, midY)
            }
            const descTxt = (entry.desc ?? '').trim()
            if (descTxt) {
              const descL = doc.splitTextToSize(descTxt, C_DESC - 2) as string[]
              if (descL[0]) doc.text(descL[0], colX[4] + 1, midY)
            }
          }
          y += ROW_H
        }
        y += 7
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
        doc.text('Completed By:', LM, y); doc.text(staffFullName, LM + 31, y)
        doc.setLineWidth(0.3); doc.line(LM + 30, y + 1, PW - RM, y + 1)
      })

      const range = parseWeekRange(weekLabel)
      const fmtD = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      const safeName = staffFullName.replace(/\s+/g, '_')
      const weekStr  = range ? `${fmtD(range.start)}-${fmtD(range.end)}` : 'week'
      doc.save(`${safeName}_Week_${weekStr}.pdf`)
    } catch (e) {
      showToast('Failed to generate PDF'); console.error(e)
    } finally {
      setDownloadingWeek(null)
    }
  }

  // ── Upload / Parse ───────────────────────────────────────────────────────

  function resetUpload() {
    setUploadFile(null); setUploadPreview(null)
    setUploadStaffId(''); setUploadClientId(''); setUploadWeekLabel('')
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleParsePdf() {
    if (!uploadFile) return
    setUploadParsing(true); setUploadError(''); setUploadPreview(null)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      const res = await fetch('/api/admin/parse-case-note', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok || json.error) { setUploadError(json.error ?? 'Parse failed'); return }

      const parsed = json as ParsedNote & { entries: any[] }

      // Deduplicate entries within the parsed result
      const seen = new Set<string>()
      parsed.entries = (parsed.entries ?? []).filter(e => {
        const key = `${e.date}|${e.start}|${e.end}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })

      setUploadPreview(parsed)

      // Auto-match staff
      const lower = (parsed.completedBy ?? '').toLowerCase()
      const matched = dspStaff.find(s =>
        s.name.toLowerCase().includes(lower) || lower.includes(s.name.toLowerCase())
      )
      if (matched) setUploadStaffId(matched.id)

      // Auto-match client
      const cLower = (parsed.clientName ?? '').toLowerCase()
      const matchedClient = allClients.find(c =>
        c.name.toLowerCase().includes(cLower) || cLower.includes(c.name.toLowerCase())
      )
      if (matchedClient) setUploadClientId(matchedClient.id)

      // Compute week label from first entry date
      const firstDate = parsed.entries.find(e => e.date)?.date ?? ''
      if (firstDate) setUploadWeekLabel(dateToWeekLabel(firstDate))
    } catch (e: any) {
      setUploadError(e.message ?? 'Network error')
    } finally {
      setUploadParsing(false)
    }
  }

  async function handleSaveUpload() {
    if (!uploadPreview || !uploadStaffId || !uploadClientId || !uploadWeekLabel) {
      setUploadError('Please select staff, client, and verify the week label'); return
    }
    setUploadSaving(true); setUploadError('')
    try {
      // Fetch existing note for same (dsp_id, client_id, week_label)
      const { data: existing } = await supabase
        .from('case_notes')
        .select('id, entries')
        .eq('dsp_id', uploadStaffId)
        .eq('client_id', uploadClientId)
        .eq('week_label', uploadWeekLabel)
        .maybeSingle()

      let entries = uploadPreview.entries

      if (existing) {
        // Merge: only add entries not already present (by date+start+end)
        const existingKeys = new Set(
          (existing.entries ?? []).map((e: any) => `${e.date}|${e.start}|${e.end}`)
        )
        const newEntries = entries.filter(e => !existingKeys.has(`${e.date}|${e.start}|${e.end}`))
        if (newEntries.length === 0) {
          setUploadError('All entries in this PDF already exist in the database for this staff/client/week — nothing new to add.')
          return
        }
        const merged = [...(existing.entries ?? []), ...newEntries]
        const { error } = await supabase.from('case_notes')
          .update({ entries: merged, strategies: uploadPreview.strategies })
          .eq('id', existing.id)
        if (error) { setUploadError('Save error: ' + error.message); return }
        showToast(`${newEntries.length} new entr${newEntries.length === 1 ? 'y' : 'ies'} added ✓`)
      } else {
        const { error } = await supabase.from('case_notes').insert({
          dsp_id: uploadStaffId, client_id: uploadClientId,
          week_label: uploadWeekLabel,
          strategies: uploadPreview.strategies,
          entries, status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        if (error) { setUploadError('Save error: ' + error.message); return }
        showToast('Case note saved ✓')
      }

      setShowUpload(false); resetUpload(); await loadAll()
    } catch (e: any) {
      setUploadError(e.message ?? 'Unknown error')
    } finally {
      setUploadSaving(false)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────

  const filtered = records.filter(r => {
    const matchStaff  = !selectedStaffId || r.dsp_id === selectedStaffId
    const matchSearch = !search ||
      r.staff_name.toLowerCase().includes(search.toLowerCase()) ||
      r.client_name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || r.status === filterStatus
    return matchStaff && matchSearch && matchStatus
  })

  const weekGroups = filtered.reduce((acc, r) => {
    if (!acc[r.week_label]) acc[r.week_label] = []
    acc[r.week_label].push(r); return acc
  }, {} as Record<string, CnRecord[]>)

  const weeksSorted = Object.keys(weekGroups).sort((a, b) => {
    const ra = parseWeekRange(a), rb = parseWeekRange(b)
    if (!ra || !rb) return 0
    return rb.start.getTime() - ra.start.getTime()
  })

  const selectedStaffName = dspStaff.find(s => s.id === selectedStaffId)?.name ?? ''
  const pending  = records.filter(r => r.status === 'submitted').length
  const approved = records.filter(r => r.status === 'approved').length
  const rejected = records.filter(r => r.status === 'rejected').length

  // ── Render ───────────────────────────────────────────────────────────────

  const ipt: React.CSSProperties = { fontSize: 13, color: '#111', background: 'white', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 12px', outline: 'none', fontFamily: 'inherit', width: '100%' }

  return (
    <>
      {/* ── Topbar ────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Case Notes</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Review, approve, and manage DSP submissions</div>
        </div>
        <div style={{ flex: 1 }} />

        {/* Staff filter dropdown */}
        <div style={{ position: 'relative' }}>
          <select
            value={selectedStaffId}
            onChange={e => { setSelectedStaffId(e.target.value); setExpandedId(null) }}
            style={{ ...ipt, width: 210, paddingRight: 32, appearance: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            <option value="">— All staff —</option>
            {dspStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#6b7280', pointerEvents: 'none' }} />
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', border: '0.5px solid #d1d5db', borderRadius: 8, padding: '0 12px', height: 36, width: 200 }}>
          <i className="ti ti-search" style={{ fontSize: 14, color: '#9ca3af' }} />
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', fontSize: 13, color: '#111', outline: 'none', width: '100%' }} />
        </div>

        {/* Upload button */}
        <button
          onClick={() => { setShowUpload(true); resetUpload() }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#004050', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          <i className="ti ti-upload" /> Upload Case Note
        </button>
      </div>

      <div style={{ padding: '24px', background: '#f5f4ef', minHeight: 'calc(100% - 56px)' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total',          value: records.length, bg: '#fff',                color: '#111',    border: '#e5e7eb' },
            { label: 'Pending review', value: pending,        bg: 'rgba(234,179,8,0.06)', color: '#854d0e', border: 'rgba(234,179,8,0.3)' },
            { label: 'Approved',       value: approved,       bg: 'rgba(22,163,74,0.06)', color: '#16a34a', border: 'rgba(22,163,74,0.25)' },
            { label: 'Rejected',       value: rejected,       bg: 'rgba(220,38,38,0.05)', color: '#dc2626', border: 'rgba(220,38,38,0.2)' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['All', 'submitted', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                background: filterStatus === f ? '#004050' : '#fff', color: filterStatus === f ? '#fff' : '#6b7280',
                boxShadow: '0 0 0 0.5px #e5e7eb' }}>
              {f === 'All' ? 'All' : f === 'submitted' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List — always week-grouped */}
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />Loading…
          </div>
        ) : weeksSorted.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', padding: 40, textAlign: 'center', color: '#9ca3af' }}>
            <i className="ti ti-notes-off" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
            <div style={{ fontSize: 14 }}>No case notes found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {weeksSorted.map(weekLabel => {
              const weekRecords   = weekGroups[weekLabel]
              const isWeekOpen    = expandedWeek === weekLabel
              const isDownloading = downloadingWeek === weekLabel
              const pendingCount  = weekRecords.filter(r => r.status === 'submitted').length
              const staffNames    = [...new Set(weekRecords.map(r => r.staff_name))]
              const totalEntries  = weekRecords.reduce((n, r) => n + (r.entries?.length ?? 0), 0)

              return (
                <div key={weekLabel} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                  {/* Week row — clickable */}
                  <div
                    onClick={() => { setExpandedWeek(isWeekOpen ? null : weekLabel); setExpandedId(null); setRejectingId(null) }}
                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', background: isWeekOpen ? '#f9fafb' : 'white' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>{weekLabel}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>{weekRecords.length} {weekRecords.length === 1 ? 'note' : 'notes'}</span>
                        <span>·</span>
                        <span>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
                        {!selectedStaffId && (
                          <span>· {staffNames.slice(0, 2).join(', ')}{staffNames.length > 2 ? ` +${staffNames.length - 2} more` : ''}</span>
                        )}
                        {pendingCount > 0 && (
                          <span style={{ color: '#854d0e', fontWeight: 600 }}>· {pendingCount} pending review</span>
                        )}
                      </div>
                    </div>
                    {selectedStaffId && (
                      <button
                        onClick={e => { e.stopPropagation(); downloadWeekPDF(weekLabel, weekRecords, selectedStaffName) }}
                        disabled={isDownloading}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#004050', color: 'white', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: isDownloading ? 'wait' : 'pointer', opacity: isDownloading ? 0.6 : 1, fontFamily: 'inherit', flexShrink: 0 }}
                      >
                        <i className={`ti ${isDownloading ? 'ti-loader-2' : 'ti-download'}`} />
                        {isDownloading ? 'Generating…' : 'Download PDF'}
                      </button>
                    )}
                    <i className={`ti ${isWeekOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 15, color: '#9ca3af', flexShrink: 0 }} />
                  </div>

                  {/* Expanded note cards */}
                  {isWeekOpen && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa' }}>
                      {weekRecords.map(r => (
                        <NoteCard key={r.id} r={r} expandedId={expandedId} setExpandedId={setExpandedId} rejectingId={rejectingId} setRejectingId={setRejectingId} actioning={actioning} editingEntry={editingEntry} setEditingEntry={setEditingEntry} handleApprove={handleApprove} handleReject={handleReject} saveEntryEdit={saveEntryEdit} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Upload Modal ───────────────────────────────────────────────── */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={e => { if (e.target === e.currentTarget) { setShowUpload(false); resetUpload() } }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>Upload Case Note</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Upload a PDF case note — duplicate entries are automatically skipped</div>
              </div>
              <button onClick={() => { setShowUpload(false); resetUpload() }} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', padding: 4 }}>✕</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* File picker */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151', marginBottom: 8 }}>PDF File <span style={{ color: '#e24b4a' }}>*</span></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, border: '2px dashed #d1d5db', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', background: uploadFile ? 'rgba(0,64,80,0.04)' : '#fafafa', borderColor: uploadFile ? '#004050' : '#d1d5db' }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: 28, color: uploadFile ? '#004050' : '#9ca3af' }} />
                  <div style={{ flex: 1 }}>
                    {uploadFile ? (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#004050' }}>{uploadFile.name}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{(uploadFile.size / 1024).toFixed(1)} KB</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Click to select a PDF</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>NJ DDD Community Based / Individual Supports form</div>
                      </>
                    )}
                  </div>
                  {uploadFile && <button onClick={e => { e.preventDefault(); resetUpload() }} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>}
                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={e => { setUploadFile(e.target.files?.[0] ?? null); setUploadPreview(null); setUploadError('') }} />
                </label>
              </div>

              {/* Parse button */}
              {uploadFile && !uploadPreview && (
                <button onClick={handleParsePdf} disabled={uploadParsing}
                  style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: uploadParsing ? '#6b7280' : '#004050', color: 'white', fontSize: 14, fontWeight: 600, cursor: uploadParsing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginBottom: 16 }}>
                  <i className={`ti ${uploadParsing ? 'ti-loader-2' : 'ti-scan'}`} />
                  {uploadParsing ? 'Parsing PDF with AI…' : 'Parse PDF'}
                </button>
              )}

              {/* Error */}
              {uploadError && (
                <div style={{ padding: '12px 16px', borderRadius: 8, background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
                  <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />{uploadError}
                </div>
              )}

              {/* Preview */}
              {uploadPreview && (
                <div>
                  {/* Extracted info */}
                  <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      <i className="ti ti-check" style={{ marginRight: 5 }} />Extracted from PDF
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
                      <div><span style={{ color: '#6b7280' }}>Client name:</span> <strong>{uploadPreview.clientName || '—'}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Completed by:</span> <strong>{uploadPreview.completedBy || '—'}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Entries found:</span> <strong>{uploadPreview.entries.length}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Strategies:</span> <strong>{uploadPreview.strategies.length}</strong></div>
                    </div>
                    {uploadPreview.ispOutcome && (
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(22,163,74,0.15)' }}>
                        <span style={{ color: '#6b7280' }}>ISP Outcome: </span>{uploadPreview.ispOutcome}
                      </div>
                    )}
                  </div>

                  {/* Entries preview */}
                  {uploadPreview.entries.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Activity Entries</div>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        {uploadPreview.entries.map((e, i) => (
                          <div key={i} style={{ padding: '8px 12px', borderBottom: i < uploadPreview.entries.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: '#374151' }}>{e.date}</span>
                            <span style={{ color: '#9ca3af', margin: '0 6px' }}>·</span>
                            <span style={{ color: '#6b7280' }}>{e.start}–{e.end}</span>
                            {e.strategy && <><span style={{ color: '#9ca3af', margin: '0 6px' }}>·</span><span style={{ color: '#004050' }}>{e.strategy}</span></>}
                            {e.desc && <div style={{ color: '#6b7280', marginTop: 2 }}>{e.desc}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Staff + Client + Week matching */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Staff Member <span style={{ color: '#e24b4a' }}>*</span></div>
                      <div style={{ position: 'relative' }}>
                        <select value={uploadStaffId} onChange={e => setUploadStaffId(e.target.value)} style={{ ...ipt, paddingRight: 30, appearance: 'none', cursor: 'pointer' }}>
                          <option value="">— Select staff —</option>
                          {dspStaff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6b7280', pointerEvents: 'none' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Client <span style={{ color: '#e24b4a' }}>*</span></div>
                      <div style={{ position: 'relative' }}>
                        <select value={uploadClientId} onChange={e => setUploadClientId(e.target.value)} style={{ ...ipt, paddingRight: 30, appearance: 'none', cursor: 'pointer' }}>
                          <option value="">— Select client —</option>
                          {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <i className="ti ti-chevron-down" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6b7280', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Service Week Label <span style={{ color: '#e24b4a' }}>*</span></div>
                    <input value={uploadWeekLabel} onChange={e => setUploadWeekLabel(e.target.value)} placeholder="e.g. Jun 8, 2025 – Jun 14, 2025" style={ipt} />
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Auto-computed from entry dates — edit if incorrect</div>
                  </div>

                  {/* Save */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleSaveUpload} disabled={uploadSaving || !uploadStaffId || !uploadClientId || !uploadWeekLabel}
                      style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: (uploadSaving || !uploadStaffId || !uploadClientId || !uploadWeekLabel) ? '#9ca3af' : '#16a34a', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                      <i className={`ti ${uploadSaving ? 'ti-loader-2' : 'ti-database-import'}`} />
                      {uploadSaving ? 'Saving…' : 'Save to Database'}
                    </button>
                    <button onClick={() => { setUploadPreview(null); setUploadError('') }}
                      style={{ padding: '12px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Re-parse
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#004050', color: '#fff', fontSize: 13, padding: '10px 18px', borderRadius: 8, zIndex: 200, boxShadow: '0 4px 12px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✓ {toast}
        </div>
      )}
    </>
  )
}

// ── NoteCard sub-component ────────────────────────────────────────────────────

function NoteCard({ r, expandedId, setExpandedId, rejectingId, setRejectingId, actioning, editingEntry, setEditingEntry, handleApprove, handleReject, saveEntryEdit }: {
  r: CnRecord
  expandedId: string | null; setExpandedId: (id: string | null) => void
  rejectingId: string | null; setRejectingId: (id: string | null) => void
  actioning: string | null
  editingEntry: { noteId: string; entryIndex: number; desc: string } | null
  setEditingEntry: (v: any) => void
  handleApprove: (id: string) => void
  handleReject:  (id: string) => void
  saveEntryEdit: (noteId: string, entries: any[]) => void
}) {
  const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE.draft
  const isExpanded  = expandedId  === r.id
  const isActioning = actioning   === r.id
  const isRejecting = rejectingId === r.id
  const initials    = r.staff_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div onClick={() => { setExpandedId(isExpanded ? null : r.id); setRejectingId(null) }}
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#008080', flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{r.staff_name}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {r.client_name} · {r.week_label} · {r.entries.length} entr{r.entries.length !== 1 ? 'ies' : 'y'}
          </div>
        </div>
        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, fontWeight: 600, flexShrink: 0 }}>{ss.label}</span>
        <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
        </div>
        <i className={`ti ${isExpanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: '#9ca3af', flexShrink: 0 }} />
      </div>

      {isExpanded && (
        <div style={{ borderTop: '0.5px solid #f3f4f6', padding: '16px 20px 20px' }}>
          {r.strategies.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Strategies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.strategies.map(s => (
                  <span key={s} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(0,64,80,0.08)', color: '#004050', fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {r.entries.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Activity Log</div>
              {r.entries.map((e: any, ei: number) => {
                const isEditingThis = editingEntry?.noteId === r.id && editingEntry?.entryIndex === ei
                return (
                  <div key={ei} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 8, border: `1px solid ${isEditingThis ? '#008080' : '#e5e7eb'}` }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                      </span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{e.start} – {e.end}</span>
                      {e.strategy && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(0,64,80,0.07)', color: '#004050' }}>{e.strategy}</span>}
                      {!isEditingThis && (
                        <button onClick={ev => { ev.stopPropagation(); setEditingEntry({ noteId: r.id, entryIndex: ei, desc: e.desc ?? '' }) }}
                          style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 9px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="ti ti-pencil" style={{ fontSize: 11 }} /> Edit
                        </button>
                      )}
                    </div>
                    {isEditingThis ? (
                      <div>
                        <textarea autoFocus value={editingEntry.desc}
                          onChange={ev => setEditingEntry((prev: any) => prev ? { ...prev, desc: ev.target.value } : prev)}
                          rows={3}
                          style={{ width: '100%', fontSize: 13, color: '#374151', lineHeight: 1.6, border: '1px solid #008080', borderRadius: 6, padding: '8px 10px', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                          <button onClick={() => { const u = r.entries.map((ent: any, i: number) => i === ei ? { ...ent, desc: editingEntry.desc } : ent); saveEntryEdit(r.id, u) }}
                            style={{ fontSize: 12, padding: '5px 14px', borderRadius: 6, border: 'none', background: '#008080', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Save</button>
                          <button onClick={() => setEditingEntry(null)}
                            style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '0.5px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      e.desc && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{e.desc}</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {r.status === 'submitted' && (
            isRejecting ? (
              <div style={{ background: '#fff8f8', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginBottom: 10 }}>Confirm rejection?</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => handleReject(r.id)} disabled={!!isActioning}
                    style={{ fontSize: 13, padding: '7px 18px', borderRadius: 7, border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 600, opacity: isActioning ? 0.6 : 1 }}>
                    {isActioning ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                  <button onClick={() => setRejectingId(null)} style={{ fontSize: 13, padding: '7px 14px', borderRadius: 7, border: '0.5px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleApprove(r.id)} disabled={!!isActioning}
                  style={{ fontSize: 13, padding: '8px 20px', borderRadius: 7, border: 'none', background: '#16a34a', color: 'white', cursor: isActioning ? 'wait' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: isActioning ? 0.6 : 1 }}>
                  <i className="ti ti-circle-check" /> {isActioning ? 'Approving…' : 'Approve'}
                </button>
                <button onClick={() => setRejectingId(r.id)}
                  style={{ fontSize: 13, padding: '8px 20px', borderRadius: 7, border: '1px solid #fca5a5', background: 'white', color: '#dc2626', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="ti ti-x" /> Reject
                </button>
              </div>
            )
          )}
          {r.status === 'approved' && <span style={{ fontSize: 13, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-circle-check" /> Approved</span>}
          {r.status === 'rejected' && <span style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-x" /> Rejected</span>}
        </div>
      )}
    </div>
  )
}
