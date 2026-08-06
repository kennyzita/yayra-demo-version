'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── PDF helpers ──────────────────────────────────────────────────────────────

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

function parseWeekRange(label: string): { start: Date; end: Date } | null {
  const parts = label.split('–').map(s => s.trim())
  if (parts.length !== 2) return null
  const start = new Date(parts[0]), end = new Date(parts[1])
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
  return { start, end }
}

function formatTimePDF(t: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}.${String(m).padStart(2, '0')}`
}

function fmtMDY(dateStr: string): string {
  if (!dateStr || dateStr === '_nodate') return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
}

// ── Types ────────────────────────────────────────────────────────────────────

type ClientCnRecord = {
  id: string; dsp_id: string; staff_name: string
  week_label: string; status: string; submitted_at: string | null
  strategies: string[]; entries: any[]
}

const NJ_COUNTIES = ['Atlantic','Bergen','Burlington','Camden','Cape May','Cumberland','Essex','Gloucester','Hudson','Hunterdon','Mercer','Middlesex','Monmouth','Morris','Ocean','Passaic','Salem','Somerset','Sussex','Union','Warren']

const EMPTY_FORM = { full_name: '', dob: '', sex: '', county: '', medicaid_id: '', dx: '', isp_outcome: '' }

interface ClientRow {
  id: string
  full_name: string
  dob: string | null
  created_at: string
  sex: string
  county: string
  medicaid_id: string
  dx: string
  isp_outcome: string
  isp_doc_path: string
  source: 'Intake Form' | 'Admin Console'
}

interface IntakeRow {
  id: string
  client_name: string | null
  client_email: string | null
  submitted_at: string
  status: string
  form_data: Record<string, any>
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

function fmtDob(dob: string | null) {
  if (!dob) return '—'
  return new Date(dob + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusPill({ status }: { status: string }) {
  const cfg =
    status === 'approved' ? { bg: 'rgba(48,176,96,0.1)',  color: '#30B060', icon: 'ti-check',  label: 'Approved' } :
    status === 'rejected' ? { bg: 'rgba(226,75,74,0.1)',  color: '#E24B4A', icon: 'ti-x',      label: 'Rejected' } :
                            { bg: 'rgba(186,117,23,0.1)', color: '#BA7517', icon: 'ti-clock',  label: 'Pending'  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10, background: cfg.bg, color: cfg.color }}>
      <i className={`ti ${cfg.icon}`} />{cfg.label}
    </span>
  )
}

// ── Intake form field renderer ─────────────────────────────────────────────────

function IntakeField({ label, value }: { label: string; value: any }) {
  if (value === '' || value === null || value === undefined) return null
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#111', fontWeight: 400, lineHeight: 1.5 }}>{display}</div>
    </div>
  )
}

function IntakeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#008080', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #f0f0f0' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
        {children}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const supabase = createClient()

  // ── Clients state ────────────────────────────────────────────────────────────
  const [clients,      setClients]      = useState<ClientRow[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [sourceFilter, setSourceFilter] = useState<'' | 'Intake Form' | 'Admin Console'>('')
  const [view,         setView]         = useState<'list' | 'create' | 'edit'>('list')
  const [selected,     setSelected]     = useState<ClientRow | null>(null)
  const [viewModal,    setViewModal]    = useState<ClientRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null)
  const [form,          setForm]          = useState({ ...EMPTY_FORM })
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [error,         setError]         = useState('')
  const [ispFile,       setIspFile]       = useState<File | null>(null)
  const [ispPreview,    setIspPreview]    = useState<string | null>(null)
  const [ispUploading,  setIspUploading]  = useState(false)
  const [ispActionId,   setIspActionId]   = useState<string | null>(null)
  const ispInputRef = useRef<HTMLInputElement>(null)

  // ── Intakes state ────────────────────────────────────────────────────────────
  const [activeTab,      setActiveTab]      = useState<'clients' | 'intakes'>('clients')
  const [intakes,        setIntakes]        = useState<IntakeRow[]>([])
  const [loadingIntakes, setLoadingIntakes] = useState(true)
  const [viewIntake,     setViewIntake]     = useState<IntakeRow | null>(null)
  const [intakeSearch,   setIntakeSearch]   = useState('')
  const [statusFilter,   setStatusFilter]   = useState<'' | 'pending' | 'approved' | 'rejected'>('')
  const [approvingId,    setApprovingId]    = useState<string | null>(null)
  const [rejectingId,    setRejectingId]    = useState<string | null>(null)

  // ── Case notes modal ─────────────────────────────────────────────────────────
  const [cnModal,         setCnModal]         = useState<ClientRow | null>(null)
  const [cnNotes,         setCnNotes]         = useState<ClientCnRecord[]>([])
  const [cnLoading,       setCnLoading]       = useState(false)
  const [cnExpandedWeek,  setCnExpandedWeek]  = useState<string | null>(null)
  const [cnDownloadingWk, setCnDownloadingWk] = useState<string | null>(null)

  // ── Shared ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  async function openCnModal(client: ClientRow) {
    setCnModal(client); setCnNotes([]); setCnLoading(true); setCnExpandedWeek(null)
    const [{ data: notesData }, { data: usersData }] = await Promise.all([
      supabase.from('case_notes').select('id, dsp_id, week_label, status, submitted_at, strategies, entries').eq('client_id', client.id).order('submitted_at', { ascending: false }),
      supabase.from('users').select('id, first_name, last_name'),
    ])
    const nameMap = new Map((usersData ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`]))
    setCnNotes((notesData ?? []).map((n: any) => ({
      id: n.id, dsp_id: n.dsp_id,
      staff_name: nameMap.get(n.dsp_id) ?? 'Unknown staff',
      week_label: n.week_label, status: n.status ?? 'submitted',
      submitted_at: n.submitted_at,
      strategies: n.strategies ?? [], entries: n.entries ?? [],
    })))
    setCnLoading(false)
  }

  async function downloadClientWeekPDF(weekLabel: string, weekRecords: ClientCnRecord[], client: ClientRow) {
    setCnDownloadingWk(weekLabel)
    try {
      type PageData = { staffName: string; date: string; strategies: string[]; entries: any[] }
      const pages: PageData[] = []

      for (const record of weekRecords) {
        const byDate = new Map<string, any[]>()
        for (const e of record.entries) {
          const d = e.date || '_nodate'
          if (!byDate.has(d)) byDate.set(d, [])
          byDate.get(d)!.push(e)
        }
        for (const [date, dateEntries] of byDate) {
          const existing = pages.find(p => p.staffName === record.staff_name && p.date === date)
          if (existing) {
            existing.entries.push(...dateEntries)
            for (const s of record.strategies) { if (!existing.strategies.includes(s)) existing.strategies.push(s) }
          } else {
            pages.push({ staffName: record.staff_name, date, strategies: [...record.strategies], entries: [...dateEntries] })
          }
        }
      }
      pages.sort((a, b) => a.date.localeCompare(b.date) || a.staffName.localeCompare(b.staffName))
      for (const p of pages) p.entries.sort((a: any, b: any) => (a.start || '').localeCompare(b.start || ''))

      if (pages.length === 0) { showToast('No entries to download'); return }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'letter' })
      const LM = 14, RM = 14, PW = 215.9, usable = PW - LM - RM

      let njSealB64 = '', dddLogoB64 = ''
      try {
        const toB64 = async (path: string) => {
          const r = await fetch(path); if (!r.ok) return ''
          const buf = await r.arrayBuffer()
          return btoa(String.fromCharCode(...new Uint8Array(buf)))
        }
        ;[njSealB64, dddLogoB64] = await Promise.all([toB64('/nj-seal.jpeg'), toB64('/ddd-logo.jpeg')])
      } catch {}

      pages.forEach((page, idx) => {
        if (idx > 0) doc.addPage()
        let y = 8; const cx = PW / 2

        if (njSealB64) { doc.addImage(`data:image/jpeg;base64,${njSealB64}`, 'JPEG', LM, y, 22, 22) }
        else { doc.setDrawColor(150,150,150); doc.setLineWidth(0.25); doc.rect(LM,y,22,22,'S'); doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(130,130,130); doc.text('[NJ Seal]',LM+11,y+12,{align:'center'}) }
        if (dddLogoB64) { doc.addImage(`data:image/jpeg;base64,${dddLogoB64}`, 'JPEG', PW-RM-14, y, 14, 22) }
        else { doc.setDrawColor(150,150,150); doc.setLineWidth(0.25); doc.rect(PW-RM-14,y,14,22,'S'); doc.setFont('helvetica','normal'); doc.setFontSize(6); doc.setTextColor(130,130,130); doc.text('[DDD]',PW-RM-7,y+12,{align:'center'}) }

        doc.setTextColor(0,0,0); doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        doc.text('New Jersey Department of Human Services', cx, y+6, {align:'center'})
        doc.text('Division of Developmental Disabilities', cx, y+11, {align:'center'})
        doc.setTextColor(0,0,200); doc.text('www.nj.gov/humanservices/ddd', cx, y+16, {align:'center'})
        doc.setTextColor(0,0,0)

        y = 36
        doc.setFont('helvetica','bold'); doc.setFontSize(12)
        doc.text('Community Based / Individual Supports', cx, y, {align:'center'}); y += 5
        doc.setFont('helvetica','bolditalic'); doc.setFontSize(7)
        doc.text('(Not applicable when delivering daily rate version of Individual Supports. Only used for 15 minute unit version)', cx, y, {align:'center', maxWidth: usable-40}); y += 7

        const spYear = page.date && page.date !== '_nodate' ? String(new Date(page.date+'T00:00:00').getFullYear()) : String(new Date().getFullYear())
        doc.setFont('helvetica','bold'); doc.setFontSize(9.5)
        doc.text('Name:', LM, y+3.5)
        doc.setFont('helvetica','normal'); doc.text(client.full_name, LM+13, y+3.5)
        doc.setLineWidth(0.25); doc.setDrawColor(0,0,0)
        doc.line(LM+12, y+4.5, LM+93, y+4.5)
        doc.setFont('helvetica','bold'); doc.text('Service Plan Year:', LM+103, y+3.5)
        doc.setFont('helvetica','normal'); doc.text(spYear, LM+137, y+3.5)
        doc.line(LM+136, y+4.5, PW-RM, y+4.5); y += 9

        doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.text('ISP Outcome:', LM, y+3.5)
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5)
        if (client.isp_outcome) {
          const isp = doc.splitTextToSize(client.isp_outcome, usable-30) as string[]
          if (isp[0]) doc.text(isp[0], LM+28, y+3.5)
        }
        doc.setLineWidth(0.25); doc.line(LM+27, y+4.5, PW-RM, y+4.5); y += 10

        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text('Service Strategies (check all that apply):', LM, y); y += 5
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setLineWidth(0.25)
        STRATEGIES_PDF.forEach((fullText, si) => {
          const isChecked = page.strategies.some(s => s.trim() === STRATEGIES_TITLES[si])
          doc.setDrawColor(0,0,0); doc.rect(LM, y-2.8, 3.2, 3.2, 'S')
          if (isChecked) { doc.setLineWidth(0.5); doc.line(LM+0.4,y-1.2,LM+1.5,y-0.2); doc.line(LM+1.5,y-0.2,LM+3,y-2.5); doc.setLineWidth(0.25) }
          const lines = doc.splitTextToSize(fullText, usable-5) as string[]
          doc.text(lines, LM+5, y); y += lines.length*3.6+0.5
        }); y += 2

        const C_DATE=22, C_START=14, C_END=14, C_ACT=58, C_DESC=usable-22-14-14-58
        const colX = [LM, LM+C_DATE, LM+C_DATE+C_START, LM+C_DATE+C_START+C_END, LM+C_DATE+C_START+C_END+C_ACT]
        const drawCols = (ry: number, rh: number) => { for (let ci=1;ci<colX.length;ci++) doc.line(colX[ci],ry,colX[ci],ry+rh) }

        const HDR_H = 10
        doc.setDrawColor(0,0,0); doc.setLineWidth(0.3); doc.rect(LM,y,usable,HDR_H,'S'); drawCols(y,HDR_H)
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5)
        doc.text('Date', colX[0]+C_DATE/2, y+HDR_H/2+1, {align:'center'})
        doc.text('Start', colX[1]+C_START/2, y+3.5, {align:'center'}); doc.text('Time', colX[1]+C_START/2, y+7, {align:'center'})
        doc.text('End',  colX[2]+C_END/2,  y+3.5, {align:'center'}); doc.text('Time', colX[2]+C_END/2,  y+7, {align:'center'})
        const actHdr = doc.splitTextToSize('Individualized Activity', C_ACT-2) as string[]
        doc.text(actHdr, colX[3]+C_ACT/2, y+3, {align:'center'})
        const descHdr = doc.splitTextToSize('Tell us about the day, and how the activities will help the individual reach the above outcome', C_DESC-2) as string[]
        doc.text(descHdr, colX[4]+C_DESC/2, y+2, {align:'center'})
        y += HDR_H

        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setLineWidth(0.2); doc.setTextColor(0,0,0)
        const dateStr = fmtMDY(page.date)
        const ROW_H = 7.5, totalRows = Math.max(10, page.entries.length+2)
        let dateRendered = false
        for (let ri=0; ri<totalRows; ri++) {
          const entry = page.entries[ri]
          doc.setDrawColor(0,0,0); doc.rect(LM,y,usable,ROW_H,'S'); drawCols(y,ROW_H)
          if (entry) {
            const midY = y+ROW_H/2+1.2
            if (!dateRendered && dateStr) { doc.setFontSize(7.5); doc.text(dateStr,colX[0]+1,midY); dateRendered=true }
            doc.setFontSize(8)
            const st=formatTimePDF(entry.start??''), et=formatTimePDF(entry.end??'')
            if (st) doc.text(st, colX[1]+C_START/2, midY, {align:'center'})
            if (et) doc.text(et, colX[2]+C_END/2,   midY, {align:'center'})
            const actTxt=(entry.strategy??'').trim()
            if (actTxt) { const al=doc.splitTextToSize(actTxt,C_ACT-2) as string[]; if(al[0]) doc.text(al[0],colX[3]+1,midY) }
            const descTxt=(entry.desc??'').trim()
            if (descTxt) { const dl=doc.splitTextToSize(descTxt,C_DESC-2) as string[]; if(dl[0]) doc.text(dl[0],colX[4]+1,midY) }
          }
          y += ROW_H
        }
        y += 7
        doc.setFont('helvetica','normal'); doc.setFontSize(9)
        doc.text('Completed By:', LM, y); doc.text(page.staffName, LM+31, y)
        doc.setLineWidth(0.3); doc.line(LM+30, y+1, PW-RM, y+1)
      })

      const range = parseWeekRange(weekLabel)
      const fmtD = (d: Date) => `${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
      const safeName = client.full_name.replace(/\s+/g, '_')
      const weekStr = range ? `${fmtD(range.start)}-${fmtD(range.end)}` : 'week'
      doc.save(`${safeName}_Week_${weekStr}.pdf`)
    } catch (e) { showToast('Failed to generate PDF'); console.error(e) }
    finally { setCnDownloadingWk(null) }
  }

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // ── Load clients ─────────────────────────────────────────────────────────────

  async function loadClients() {
    setLoading(true)
    const [clientsRes, bcdRes, intakesRes] = await Promise.all([
      supabase.from('clients').select('id, full_name, dob, created_at').order('full_name'),
      supabase.from('billing_client_data').select('client_id, data'),
      supabase.from('client_intakes').select('client_name'),
    ])

    const rows = clientsRes.data
    if (!rows) { setLoading(false); return }

    const bcdMap = new Map(
      ((bcdRes.data ?? []) as { client_id: string; data: Record<string, unknown> }[])
        .map(b => [b.client_id, b.data])
    )

    const intakeNames = new Set(
      (intakesRes.data ?? []).map(i => (i.client_name ?? '').toLowerCase().trim())
    )

    const merged: ClientRow[] = rows.map(r => {
      const d = bcdMap.get(r.id) ?? {}
      const storedSource = d.source as string | undefined
      let source: 'Intake Form' | 'Admin Console'
      if (storedSource === 'Intake Form' || storedSource === 'Admin Console') {
        source = storedSource
      } else {
        source = intakeNames.has(r.full_name.toLowerCase().trim()) ? 'Intake Form' : 'Admin Console'
      }
      return {
        id: r.id,
        full_name: r.full_name,
        dob: r.dob,
        created_at: r.created_at,
        sex:         String(d.sex ?? ''),
        county:      String(d.county ?? ''),
        medicaid_id: String(d.mid ?? ''),
        dx:          String(d.dx ?? ''),
        isp_outcome:  String(d.isp_outcome  ?? ''),
        isp_doc_path: String(d.isp_doc_path ?? ''),
        source,
      }
    })

    setClients(merged)
    setLoading(false)
  }

  // ── Load intakes ─────────────────────────────────────────────────────────────

  async function loadIntakes() {
    setLoadingIntakes(true)
    const { data } = await supabase
      .from('client_intakes')
      .select('id, client_name, client_email, submitted_at, status, form_data')
      .order('submitted_at', { ascending: false })
    setIntakes((data ?? []) as IntakeRow[])
    setLoadingIntakes(false)
  }

  useEffect(() => {
    loadClients()
    loadIntakes()
  }, [])

  // ── Approve intake → create client ───────────────────────────────────────────

  async function approveIntake(intake: IntakeRow) {
    setApprovingId(intake.id)
    try {
      const fd = intake.form_data ?? {}
      const name = intake.client_name || fd.name || 'Unknown'

      const { data: row, error: err } = await supabase
        .from('clients')
        .insert({ full_name: name, dob: fd.dob || null })
        .select('id')
        .single()
      if (err) throw err

      await supabase.from('billing_client_data').insert({
        client_id: row.id,
        data: {
          id:   row.id,
          name,
          dob:  fd.dob ?? '',
          sex:  '',
          county: '',
          mid:  '',
          dx:   '',
          isp_outcome: '',
          source: 'Intake Form',
          locked: false,
          pin: '1234',
          services: [],
          intake_form_data: fd,
        },
        archived: false,
      })

      await supabase.from('client_intakes').update({ status: 'approved' }).eq('id', intake.id)
      await Promise.all([loadClients(), loadIntakes()])
      setViewIntake(null)
      showToast(`${name} approved and added to Clients.`)
    } catch (err: unknown) {
      showToast('Approve failed: ' + ((err as Error)?.message ?? 'Unknown error'))
    } finally {
      setApprovingId(null)
    }
  }

  // ── Reject intake ────────────────────────────────────────────────────────────

  async function rejectIntake(intake: IntakeRow) {
    setRejectingId(intake.id)
    try {
      await supabase.from('client_intakes').update({ status: 'rejected' }).eq('id', intake.id)
      await loadIntakes()
      if (viewIntake?.id === intake.id) setViewIntake(prev => prev ? { ...prev, status: 'rejected' } : null)
      showToast(`${intake.client_name ?? 'Intake'} marked as rejected.`)
    } catch (err: unknown) {
      showToast('Reject failed: ' + ((err as Error)?.message ?? 'Unknown error'))
    } finally {
      setRejectingId(null)
    }
  }

  // ── Client CRUD ───────────────────────────────────────────────────────────────

  function openCreate() {
    setForm({ ...EMPTY_FORM }); setError('')
    setIspFile(null); setIspPreview(null)
    setView('create')
  }

  function openEdit(c: ClientRow) {
    setSelected(c)
    setForm({ full_name: c.full_name, dob: c.dob ?? '', sex: c.sex, county: c.county, medicaid_id: c.medicaid_id, dx: c.dx, isp_outcome: c.isp_outcome })
    setIspFile(null); setIspPreview(c.isp_doc_path ? 'existing' : null)
    setError(''); setView('edit')
  }

  function cancelForm() { setView('list'); setSelected(null); setError(''); setIspFile(null); setIspPreview(null) }

  function onIspSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIspFile(file); setIspPreview('new')
  }

  async function uploadIspDoc(clientId: string): Promise<string | null> {
    if (!ispFile) return null
    setIspUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', ispFile)
      fd.append('clientId', clientId)
      const res = await fetch('/api/admin/upload-client-isp', { method: 'POST', body: fd })
      const j   = await res.json()
      if (!res.ok) { showToast(j.error ?? 'ISP upload failed'); return null }
      return j.path as string
    } catch {
      showToast('ISP upload failed'); return null
    } finally {
      setIspUploading(false)
    }
  }

  async function openIspAction(clientId: string, action: 'view' | 'download' | 'print', clientName: string) {
    setIspActionId(clientId)
    try {
      const res = await fetch(`/api/admin/client-isp-url?clientId=${clientId}`)
      const j   = await res.json()
      if (!res.ok) { showToast(j.error ?? 'Could not load ISP document'); return }
      const url = j.signedUrl as string
      if (action === 'view') {
        window.open(url, '_blank')
      } else if (action === 'download') {
        const a = document.createElement('a')
        a.href = url; a.download = `ISP_${clientName.replace(/\s+/g, '_')}`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      } else {
        const w = window.open(url, '_blank')
        if (w) { w.focus(); setTimeout(() => w.print(), 1200) }
      }
    } catch {
      showToast('Failed to load ISP document')
    } finally {
      setIspActionId(null)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Client name is required.'); return }
    setSaving(true); setError('')
    try {
      const { data: intakeMatch } = await supabase
        .from('client_intakes').select('id, client_name, status')
        .ilike('client_name', form.full_name.trim()).eq('status', 'pending').limit(1)
      if (intakeMatch && intakeMatch.length > 0) {
        const m = intakeMatch[0]
        setError(`"${m.client_name}" already has a pending intake submission. Review it in the Intake Submissions tab.`)
        setSaving(false); return
      }

      const { data: row, error: err } = await supabase
        .from('clients').insert({ full_name: form.full_name.trim(), dob: form.dob || null }).select('id').single()
      if (err) throw err

      const { error: bcdInsertErr } = await supabase.from('billing_client_data').upsert(
        { client_id: row.id, data: { id: row.id, name: form.full_name.trim(), dob: form.dob, sex: form.sex, county: form.county, mid: form.medicaid_id, dx: form.dx, isp_outcome: form.isp_outcome, source: 'Admin Console', locked: false, pin: '1234', services: [] }, archived: false },
        { onConflict: 'client_id' }
      )
      if (bcdInsertErr) throw bcdInsertErr
      if (ispFile) await uploadIspDoc(row.id)
      await loadClients(); setView('list'); showToast(`${form.full_name.trim()} added successfully.`)
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to create client.')
    } finally { setSaving(false) }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim() || !selected) { setError('Client name is required.'); return }
    setSaving(true); setError('')
    try {
      const { error: err } = await supabase.from('clients').update({ full_name: form.full_name.trim(), dob: form.dob || null }).eq('id', selected.id)
      if (err) throw err
      const { data: existing } = await supabase.from('billing_client_data').select('data').eq('client_id', selected.id).maybeSingle()
      const { error: bcdErr } = await supabase.from('billing_client_data').upsert(
        { client_id: selected.id, data: { ...((existing?.data as Record<string, unknown>) ?? {}), name: form.full_name.trim(), dob: form.dob, sex: form.sex, county: form.county, mid: form.medicaid_id, dx: form.dx, isp_outcome: form.isp_outcome } },
        { onConflict: 'client_id' }
      )
      if (bcdErr) throw bcdErr
      if (ispFile) await uploadIspDoc(selected.id)
      await loadClients(); setView('list'); showToast(`${form.full_name.trim()} updated successfully.`)
    } catch (err: unknown) {
      setError((err as Error)?.message ?? 'Failed to update client.')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await supabase.from('billing_client_data').delete().eq('client_id', deleteTarget.id)
      await supabase.from('clients').delete().eq('id', deleteTarget.id)
      await loadClients(); setDeleteTarget(null); showToast(`${deleteTarget.full_name} deleted.`)
    } catch (err: unknown) {
      showToast('Delete failed: ' + ((err as Error)?.message ?? 'Unknown error')); setDeleteTarget(null)
    } finally { setDeleting(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    const matchesSearch = !q || c.full_name.toLowerCase().includes(q) || c.medicaid_id.toLowerCase().includes(q) || c.county.toLowerCase().includes(q) || c.dx.toLowerCase().includes(q)
    const matchesSource = !sourceFilter || c.source === sourceFilter
    return matchesSearch && matchesSource
  })

  const filteredIntakes = intakes.filter(i => {
    const q = intakeSearch.toLowerCase()
    const matchesSearch = !q || (i.client_name ?? '').toLowerCase().includes(q) || (i.client_email ?? '').toLowerCase().includes(q)
    const matchesStatus = !statusFilter || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const pendingCount = intakes.filter(i => i.status === 'pending').length

  // ── Styles ────────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = { width: '100%', padding: '8px 11px', fontSize: 13, borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#111', outline: 'none', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
  const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }

  // ── Create / edit form ────────────────────────────────────────────────────────

  if (view === 'create' || view === 'edit') {
    const isEdit = view === 'edit'
    return (
      <>
        {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>{toast}</div>}
        <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <button onClick={cancelForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 18, display: 'flex', alignItems: 'center', padding: 4 }}>
            <i className="ti ti-arrow-left" />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{isEdit ? `Edit: ${selected?.full_name}` : 'Create new client'}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{isEdit ? 'Update client profile' : 'Add a new client profile to the system'}</div>
          </div>
        </div>
        <div style={{ padding: '24px', maxWidth: 640 }}>
          <form onSubmit={isEdit ? handleEdit : handleCreate}>
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008080', fontSize: 16 }}>
                  <i className={isEdit ? 'ti ti-user-edit' : 'ti ti-user-plus'} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Patient information</span>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={lbl}>Full name <span style={{ color: '#E24B4A' }}>*</span></label>
                  <input style={inp} value={form.full_name} onChange={e => setField('full_name', e.target.value)} placeholder="e.g. Johnson, Mary" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Date of birth</label>
                    <input type="date" style={inp} value={form.dob} onChange={e => setField('dob', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Sex</label>
                    <select style={sel} value={form.sex} onChange={e => setField('sex', e.target.value)}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={lbl}>Medicaid ID</label>
                    <input style={inp} value={form.medicaid_id} onChange={e => setField('medicaid_id', e.target.value)} placeholder="e.g. NJ12345678" />
                  </div>
                  <div>
                    <label style={lbl}>County</label>
                    <select style={sel} value={form.county} onChange={e => setField('county', e.target.value)}>
                      <option value="">Select county</option>
                      {NJ_COUNTIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Primary diagnosis (ICD-10)</label>
                  <input style={inp} value={form.dx} onChange={e => setField('dx', e.target.value)} placeholder="e.g. F84.0" />
                </div>
                <div>
                  <label style={lbl}>ISP outcome</label>
                  <textarea style={{ ...inp, resize: 'vertical', minHeight: 90, fontFamily: 'inherit', lineHeight: 1.5 }} value={form.isp_outcome} onChange={e => setField('isp_outcome', e.target.value)} placeholder="Enter the client's Individualized Support Plan outcome goals…" />
                </div>
              </div>
            </div>

            {/* ISP Document Upload */}
            <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,128,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008080', fontSize: 16 }}>
                  <i className="ti ti-file-upload" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>ISP Document</span>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>PDF, Word, or image — max 20 MB</span>
              </div>
              <div style={{ padding: 16 }}>
                <input
                  ref={ispInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={onIspSelect}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => ispInputRef.current?.click()}
                    style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    <i className="ti ti-upload" /> {ispPreview === 'existing' ? 'Replace ISP doc' : 'Choose ISP file'}
                  </button>
                  {ispPreview === 'existing' && !ispFile && (
                    <span style={{ fontSize: 12, color: '#008080', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <i className="ti ti-circle-check" /> ISP document uploaded
                    </span>
                  )}
                  {ispFile && (
                    <span style={{ fontSize: 12, color: '#374151' }}>
                      <strong>{ispFile.name}</strong> ({(ispFile.size / 1024).toFixed(0)} KB) — will upload on save
                    </span>
                  )}
                </div>
              </div>
            </div>

            {error && <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(226,75,74,0.08)', border: '0.5px solid rgba(226,75,74,0.4)', fontSize: 13, color: '#E24B4A' }}>{error}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={saving} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#008080', color: '#fff', fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {saving ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><i className="ti ti-check" /> {isEdit ? 'Save changes' : 'Create client'}</>}
              </button>
              <button type="button" onClick={cancelForm} style={{ padding: '9px 20px', borderRadius: 8, border: '0.5px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────────

  return (
    <>
      {toast && <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}>{toast}</div>}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Clients</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
            {activeTab === 'clients'
              ? `${clients.length} client${clients.length !== 1 ? 's' : ''} total`
              : `${intakes.length} intake submission${intakes.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        {activeTab === 'clients' && (
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: '#008080', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            <i className="ti ti-user-plus" /> New client
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px', display: 'flex', gap: 0 }}>
        {([
          { key: 'clients' as const, label: 'Clients',            count: clients.length, badge: false },
          { key: 'intakes' as const, label: 'Intake Submissions', count: pendingCount,   badge: pendingCount > 0 },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#008080' : '#6b7280',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.key ? '2px solid #008080' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit',
              marginBottom: -1,
            }}
          >
            {tab.label}
            {tab.badge && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(186,117,23,0.15)', color: '#BA7517' }}>
                {pendingCount}
              </span>
            )}
            {!tab.badge && (
              <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: '#f3f4f6', color: '#6b7280' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1100 }}>

        {/* ── Clients tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <>
            {/* Search + source filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, Medicaid ID, county, or diagnosis…" style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as typeof sourceFilter)} style={{ fontSize: 13, padding: '9px 32px 9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: sourceFilter ? '#111' : '#6b7280', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: 160, fontFamily: 'inherit' }}>
                <option value="">All sources</option>
                <option value="Intake Form">Intake Form</option>
                <option value="Admin Console">Admin Console</option>
              </select>
            </div>

            {/* Clients table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.8fr 80px 156px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                {['Name', 'Medicaid ID', 'Date of Birth', 'County', 'Sex', 'Diagnosis', 'ISP', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>
              {loading ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  Loading clients…
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  <i className="ti ti-users" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                  {search ? 'No clients match your search.' : 'No clients yet. Click "New client" to add one.'}
                </div>
              ) : (
                filtered.map((c, i) => (
                  <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 0.8fr 0.8fr 80px 156px', padding: '13px 20px', borderBottom: i < filtered.length - 1 ? '1px solid #f9fafb' : 'none', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(c.full_name)}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Added {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: c.medicaid_id ? '#111' : '#d1d5db', fontFamily: 'monospace' }}>{c.medicaid_id || '—'}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{fmtDob(c.dob)}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{c.county || '—'}</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{c.sex === 'M' ? 'Male' : c.sex === 'F' ? 'Female' : '—'}</div>
                    <div style={{ fontSize: 12, color: c.dx ? '#374151' : '#d1d5db', fontFamily: 'monospace' }}>{c.dx || '—'}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(() => {
                        const hasDoc = !!c.isp_doc_path
                        const busy   = ispActionId === c.id
                        const baseStyle = (active: boolean): React.CSSProperties => ({
                          width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                          border:  active ? '1px solid rgba(0,128,128,0.3)' : '1px solid #e5e7eb',
                          background: active ? 'rgba(0,128,128,0.06)' : '#f9fafb',
                          color:  active ? '#008080' : '#d1d5db',
                          cursor: active && !busy ? 'pointer' : 'not-allowed',
                          opacity: busy ? 0.6 : 1,
                        })
                        return (
                          <>
                            <button onClick={() => hasDoc && openIspAction(c.id, 'view', c.full_name)} disabled={!hasDoc || busy} title={hasDoc ? 'View ISP' : 'No ISP uploaded'} style={baseStyle(hasDoc)}>
                              {busy ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-eye" />}
                            </button>
                            <button onClick={() => hasDoc && openIspAction(c.id, 'download', c.full_name)} disabled={!hasDoc || busy} title={hasDoc ? 'Download ISP' : 'No ISP uploaded'} style={baseStyle(hasDoc)}>
                              <i className="ti ti-download" />
                            </button>
                            <button onClick={() => hasDoc && openIspAction(c.id, 'print', c.full_name)} disabled={!hasDoc || busy} title={hasDoc ? 'Print ISP' : 'No ISP uploaded'} style={baseStyle(hasDoc)}>
                              <i className="ti ti-printer" />
                            </button>
                          </>
                        )
                      })()}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setViewModal(c)} title="View profile" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}><i className="ti ti-eye" /></button>
                      <button onClick={() => openCnModal(c)} title="View case notes" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(0,64,80,0.25)', background: 'rgba(0,64,80,0.05)', color: '#004050', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}><i className="ti ti-notes" /></button>
                      <button onClick={() => openEdit(c)} title="Edit" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#008080', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}><i className="ti ti-edit" /></button>
                      <button onClick={() => setDeleteTarget(c)} title="Delete" style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}><i className="ti ti-trash" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            </div>
          </>
        )}

        {/* ── Intake submissions tab ───────────────────────────────────────────── */}
        {activeTab === 'intakes' && (
          <>
            {/* Search + status filter */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                <i className="ti ti-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9ca3af', pointerEvents: 'none' }} />
                <input type="text" value={intakeSearch} onChange={e => setIntakeSearch(e.target.value)} placeholder="Search by name or email…" style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)} style={{ fontSize: 13, padding: '9px 32px 9px 12px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: statusFilter ? '#111' : '#6b7280', outline: 'none', cursor: 'pointer', appearance: 'none', minWidth: 150, fontFamily: 'inherit' }}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Intakes table */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ minWidth: 680 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.8fr 1fr 1fr 140px', padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                {['Name', 'Email', 'Date of Birth', 'Submitted', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>

              {loadingIntakes ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  Loading submissions…
                </div>
              ) : filteredIntakes.length === 0 ? (
                <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  <i className="ti ti-file-off" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                  {intakeSearch || statusFilter ? 'No submissions match your filter.' : 'No intake submissions yet.'}
                </div>
              ) : (
                filteredIntakes.map((intake, i) => {
                  const fd = intake.form_data ?? {}
                  const isApproving = approvingId === intake.id
                  const isRejecting = rejectingId === intake.id
                  const isPending = intake.status === 'pending'
                  return (
                    <div key={intake.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.8fr 1fr 1fr 140px', padding: '13px 20px', borderBottom: i < filteredIntakes.length - 1 ? '1px solid #f9fafb' : 'none', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#4a7da4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {initials(intake.client_name ?? '?')}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{intake.client_name || '—'}</div>
                          <StatusPill status={intake.status} />
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: intake.client_email ? '#374151' : '#d1d5db' }}>{intake.client_email || '—'}</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{fmtDob(fd.dob ?? null)}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{fmtDate(intake.submitted_at)}</div>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button onClick={() => setViewIntake(intake)} title="View details" style={{ height: 30, padding: '0 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'inherit' }}>
                          <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                        </button>
                        {isPending && (
                          <button
                            onClick={() => approveIntake(intake)} disabled={isApproving || isRejecting} title="Approve — add to Clients"
                            style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(48,176,96,0.3)', background: 'rgba(48,176,96,0.08)', color: '#30B060', cursor: isApproving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: isApproving ? 0.6 : 1 }}
                          >
                            {isApproving ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-check" />}
                          </button>
                        )}
                        {isPending && (
                          <button
                            onClick={() => rejectIntake(intake)} disabled={isApproving || isRejecting} title="Reject"
                            style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', color: '#dc2626', cursor: isRejecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, opacity: isRejecting ? 0.6 : 1 }}
                          >
                            {isRejecting ? <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> : <i className="ti ti-x" />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            </div>
          </>
        )}
      </div>

      {/* ── Client view modal ────────────────────────────────────────────────── */}
      {viewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={() => setViewModal(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials(viewModal.full_name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{viewModal.full_name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Client profile</div>
              </div>
              <button onClick={() => setViewModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
            </div>
            <div style={{ padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Source</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 11px', borderRadius: 10, background: viewModal.source === 'Intake Form' ? 'rgba(0,128,128,0.1)' : 'rgba(0,64,80,0.1)', color: viewModal.source === 'Intake Form' ? '#008080' : '#004050' }}>
                  <i className={`ti ${viewModal.source === 'Intake Form' ? 'ti-file-text' : 'ti-layout-dashboard'}`} />
                  {viewModal.source}
                </span>
              </div>
              {([['Full name', viewModal.full_name], ['Medicaid ID', viewModal.medicaid_id || '—'], ['Date of birth', fmtDob(viewModal.dob)], ['Sex', viewModal.sex === 'M' ? 'Male' : viewModal.sex === 'F' ? 'Female' : '—'], ['County', viewModal.county || '—'], ['Diagnosis', viewModal.dx || '—'], ['Added', new Date(viewModal.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })]] as const).map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
              {viewModal.isp_outcome && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>ISP Outcome</div>
                  <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{viewModal.isp_outcome}</div>
                </div>
              )}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setViewModal(null); openEdit(viewModal) }} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #008080', background: 'rgba(0,128,128,0.06)', color: '#008080', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-edit" /> Edit
              </button>
              <button onClick={() => setViewModal(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Intake view modal ────────────────────────────────────────────────── */}
      {viewIntake && (() => {
        const fd = viewIntake.form_data ?? {}
        const isPending = viewIntake.status === 'pending'
        const isApproving = approvingId === viewIntake.id
        const isRejecting = rejectingId === viewIntake.id
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={() => setViewIntake(null)}>
            <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 660, maxHeight: '88vh', boxShadow: '0 20px 60px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#4a7da4', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials(viewIntake.client_name ?? '?')}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{viewIntake.client_name || '—'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <StatusPill status={viewIntake.status} />
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>Submitted {fmtDate(viewIntake.submitted_at)}</span>
                  </div>
                </div>
                <button onClick={() => setViewIntake(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
              </div>

              {/* Scrollable body */}
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                <IntakeSection title="Client Information">
                  <IntakeField label="Full name"   value={fd.name} />
                  <IntakeField label="Date of birth" value={fmtDob(fd.dob ?? null)} />
                  <IntakeField label="Phone"        value={fd.phone} />
                  <IntakeField label="Home phone"   value={fd.homePhone} />
                  <IntakeField label="Email"        value={fd.email} />
                  <IntakeField label="Address"      value={fd.address} />
                  <IntakeField label="Guardian"     value={fd.guardian} />
                  <IntakeField label="Date"         value={fd.date} />
                </IntakeSection>

                <IntakeSection title="Service & Team">
                  <IntakeField label="Service type"        value={fd.serviceType} />
                  <IntakeField label="Support coordinator" value={fd.supportCoord} />
                  <IntakeField label="Agency"              value={fd.agency} />
                  <IntakeField label="Preferred schedule"  value={fd.schedule} />
                  <IntakeField label="Weekly hours"        value={fd.weeklyHours} />
                  <IntakeField label="Anticipated start"   value={fd.startDate} />
                </IntakeSection>

                <IntakeSection title="Preferences & Goals">
                  <div style={{ gridColumn: '1 / -1' }}><IntakeField label="Ideal day" value={fd.idealDay} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><IntakeField label="Desired DSP qualities" value={fd.dspTraits} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><IntakeField label="Things to learn" value={fd.learn} /></div>
                </IntakeSection>

                <IntakeSection title="Service Agreement">
                  <IntakeField label="Agreement hours/week" value={fd.agreementHours} />
                  <IntakeField label="Agreement days/week"  value={fd.agreementDays} />
                  <IntakeField label="Bill of rights acknowledged" value={fd.billOfRights} />
                  <IntakeField label="Signature"             value={fd.signature} />
                  <IntakeField label="Signature date"        value={fd.signatureDate} />
                  <IntakeField label="Representative name"   value={fd.repName} />
                  <IntakeField label="Rep. relationship"     value={fd.repRelation} />
                </IntakeSection>

                <IntakeSection title="Emergency Preparedness">
                  <IntakeField label="Acuity level"  value={fd.acuity} />
                  <IntakeField label="OEM disclosure" value={fd.oem} />
                  <IntakeField label="EP acknowledged" value={fd.epAck} />
                  <IntakeField label="Caregiver name" value={fd.caregiverName} />
                  <IntakeField label="Caregiver relationship" value={fd.caregiverRel} />
                </IntakeSection>

                {/* Risk assessment — only shown if any risk data present */}
                {(['aggression','depression','paranoia','anxiety','voices','changes','meds'] as const).some(k => fd[`risk_${k}`]) && (
                  <IntakeSection title="Risk Assessment">
                    {(['aggression','depression','paranoia','anxiety','voices','changes','meds'] as const).map(k => fd[`risk_${k}`] ? (
                      <div key={k} style={{ gridColumn: '1 / -1' }}>
                        <IntakeField label={k.charAt(0).toUpperCase() + k.slice(1)} value={`${fd[`risk_${k}`]}${fd[`risk_${k}_c`] ? ` — ${fd[`risk_${k}_c`]}` : ''}`} />
                      </div>
                    ) : null)}
                  </IntakeSection>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0, background: '#fafafa' }}>
                {isPending && (
                  <>
                    <button
                      onClick={() => approveIntake(viewIntake)} disabled={isApproving || isRejecting}
                      style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: isApproving ? '#6b7280' : '#30B060', color: '#fff', fontSize: 13, fontWeight: 600, cursor: isApproving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isApproving ? 0.7 : 1 }}
                    >
                      {isApproving ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Approving…</> : <><i className="ti ti-user-plus" /> Approve & add to Clients</>}
                    </button>
                    <button
                      onClick={() => rejectIntake(viewIntake)} disabled={isApproving || isRejecting}
                      style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: '#dc2626', fontSize: 13, fontWeight: 500, cursor: isRejecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', opacity: isRejecting ? 0.7 : 1 }}
                    >
                      {isRejecting ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Rejecting…</> : <><i className="ti ti-x" /> Reject</>}
                    </button>
                  </>
                )}
                <button onClick={() => setViewIntake(null)} style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Client case notes modal ─────────────────────────────────────────── */}
      {cnModal && (() => {
        const cnWeekGroups = cnNotes.reduce((acc, n) => {
          if (!acc[n.week_label]) acc[n.week_label] = []
          acc[n.week_label].push(n); return acc
        }, {} as Record<string, ClientCnRecord[]>)
        const cnWeeksSorted = Object.keys(cnWeekGroups).sort((a, b) => {
          const ra = parseWeekRange(a), rb = parseWeekRange(b)
          if (!ra || !rb) return 0
          return rb.start.getTime() - ra.start.getTime()
        })
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={() => setCnModal(null)}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 740, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.28)' }} onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#004050', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>{initials(cnModal.full_name)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{cnModal.full_name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {cnLoading ? 'Loading case notes…' : `${cnNotes.length} case note${cnNotes.length !== 1 ? 's' : ''} across ${cnWeeksSorted.length} week${cnWeeksSorted.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
                <button onClick={() => setCnModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, display: 'flex', alignItems: 'center' }}><i className="ti ti-x" /></button>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', background: '#f5f5f2' }}>
                {cnLoading ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>
                    <i className="ti ti-loader-2" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />Loading case notes…
                  </div>
                ) : cnNotes.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center', color: '#9ca3af' }}>
                    <i className="ti ti-notes-off" style={{ fontSize: 36, display: 'block', marginBottom: 10 }} />
                    <div style={{ fontSize: 14 }}>No case notes found for this client.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {cnWeeksSorted.map(weekLabel => {
                      const weekRecords = cnWeekGroups[weekLabel]
                      const isOpen = cnExpandedWeek === weekLabel
                      const isDownloading = cnDownloadingWk === weekLabel
                      const totalEntries = weekRecords.reduce((n, r) => n + (r.entries?.length ?? 0), 0)
                      const staffNames = [...new Set(weekRecords.map(r => r.staff_name))]

                      return (
                        <div key={weekLabel} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                          {/* Week row */}
                          <div
                            onClick={() => setCnExpandedWeek(isOpen ? null : weekLabel)}
                            style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', background: isOpen ? '#f9fafb' : 'white' }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 3 }}>{weekLabel}</div>
                              <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <span>{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span>
                                <span>·</span>
                                <span>{staffNames.slice(0, 2).join(', ')}{staffNames.length > 2 ? ` +${staffNames.length - 2} more` : ''}</span>
                              </div>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); downloadClientWeekPDF(weekLabel, weekRecords, cnModal) }}
                              disabled={isDownloading}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#004050', color: 'white', border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: isDownloading ? 'wait' : 'pointer', opacity: isDownloading ? 0.6 : 1, fontFamily: 'inherit', flexShrink: 0 }}
                            >
                              <i className={`ti ${isDownloading ? 'ti-loader-2' : 'ti-download'}`} />
                              {isDownloading ? 'Generating…' : 'Download PDF'}
                            </button>
                            <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: '#9ca3af', flexShrink: 0 }} />
                          </div>

                          {/* Expanded notes */}
                          {isOpen && (
                            <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 14px', background: '#fafafa' }}>
                              {weekRecords.map(r => (
                                <div key={r.id} style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e5e7eb', padding: '12px 16px', marginBottom: 10 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: r.entries.length > 0 ? 10 : 0 }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,64,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#004050', flexShrink: 0 }}>
                                      {initials(r.staff_name)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{r.staff_name}</div>
                                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.entries.length} {r.entries.length === 1 ? 'entry' : 'entries'}</div>
                                    </div>
                                    <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, fontWeight: 600,
                                      background: r.status === 'approved' ? 'rgba(22,163,74,0.1)' : r.status === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(234,179,8,0.12)',
                                      color: r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#854d0e' }}>
                                      {r.status === 'approved' ? 'Approved' : r.status === 'rejected' ? 'Rejected' : 'Pending'}
                                    </span>
                                  </div>
                                  {r.entries.map((e: any, ei: number) => (
                                    <div key={ei} style={{ background: '#f9fafb', borderRadius: 8, padding: '9px 12px', marginBottom: 6, border: '0.5px solid #e5e7eb' }}>
                                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: e.desc ? 5 : 0 }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                                          {e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                                        </span>
                                        <span style={{ fontSize: 12, color: '#6b7280' }}>{e.start} – {e.end}</span>
                                        {e.strategy && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(0,64,80,0.07)', color: '#004050' }}>{e.strategy.split('Assistance with ')[1] ?? e.strategy}</span>}
                                      </div>
                                      {e.desc && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{e.desc}</div>}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', flexShrink: 0, background: '#fafafa' }}>
                <button onClick={() => setCnModal(null)} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Delete confirmation modal ────────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }} onClick={() => !deleting && setDeleteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', padding: '28px 28px 22px' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#dc2626', margin: '0 0 16px' }}><i className="ti ti-trash" /></div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 8 }}>Delete client?</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 22 }}>
              This will permanently delete <strong>{deleteTarget.full_name}</strong> and all associated data. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {deleting ? <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</> : 'Yes, delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}
