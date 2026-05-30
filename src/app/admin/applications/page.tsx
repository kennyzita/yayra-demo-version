'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AppFormState } from '@/app/staff/application/page'
import type { StaffDocFile } from '@/app/api/list-staff-documents/route'

const BUCKET = 'staff-documents'

interface AppRecord {
  staffId: string
  name: string
  email: string
  phone: string
  role: string
  submittedAt: string
  status: string
  createdAt: string
  formData: AppFormState | null
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function avatarColor(name: string) {
  const colors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777']
  const idx = (name.charCodeAt(0) || 0) % colors.length
  return colors[idx]
}

function formatDate(iso: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: 'rgba(217,119,6,0.12)',  color: '#92400e', label: 'Pending'  },
    approved: { bg: 'rgba(16,185,129,0.12)', color: '#065f46', label: 'Approved' },
    rejected: { bg: 'rgba(220,38,38,0.12)',  color: '#991b1b', label: 'Rejected' },
  }
  const s = map[status] ?? map['pending']
  return (
    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

export default function HiringPage() {
  const supabase = createClient()
  const [records,    setRecords]    = useState<AppRecord[]>([])
  const [statusMap,  setStatusMap]  = useState<Record<string, string>>({})
  const [search,     setSearch]     = useState('')
  const [filter,     setFilter]     = useState('All')
  const [loading,    setLoading]    = useState(true)
  const [toast,      setToast]      = useState<string | null>(null)
  const [viewingId,  setViewingId]  = useState<string | null>(null)
  const [docUrls,    setDocUrls]    = useState<Record<string, string>>({})
  const [docsViewingId,  setDocsViewingId]  = useState<string | null>(null)
  const [docFiles,       setDocFiles]       = useState<StaffDocFile[]>([])
  const [docsLoading,    setDocsLoading]    = useState(false)
  const [progressId,       setProgressId]       = useState<string | null>(null)
  const [progressData,     setProgressData]     = useState<{ formsSigned: boolean; formsSignedAt: string | null; eadUploaded: boolean } | null>(null)
  const [progressLoading,  setProgressLoading]  = useState(false)
  const [sendingReminder,  setSendingReminder]  = useState(false)
  const [ssnCountdown,     setSsnCountdown]     = useState(0)
  const ssnTimerRef = useRef<number | null>(null)

  function revealSsn() {
    setSsnCountdown(10)
    if (ssnTimerRef.current) window.clearInterval(ssnTimerRef.current)
    ssnTimerRef.current = window.setInterval(() => {
      setSsnCountdown(prev => {
        if (prev <= 1) {
          window.clearInterval(ssnTimerRef.current!)
          ssnTimerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function hideSsn() {
    setSsnCountdown(0)
    if (ssnTimerRef.current) { window.clearInterval(ssnTimerRef.current); ssnTimerRef.current = null }
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const [usersRes, staffDataRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name, email, phone, created_at, role:roles(name)'),
        supabase.from('billing_staff_data').select('staff_id, data'),
      ])

      const users = usersRes.data ?? []
      const staffRows = staffDataRes.data ?? []

      const submitted = staffRows.filter(row => (row.data as Record<string, string>)?.application_submitted === 'true')

      const built: AppRecord[] = submitted.map(row => {
        const data = row.data as Record<string, string>
        const user = users.find((u: { id: string }) => u.id === row.staff_id)
        const firstName = (user as { first_name?: string } | undefined)?.first_name ?? ''
        const lastName = (user as { last_name?: string } | undefined)?.last_name ?? ''
        const email = (user as { email?: string } | undefined)?.email ?? ''
        const phone = (user as { phone?: string } | undefined)?.phone ?? ''
        const createdAt = (user as { created_at?: string } | undefined)?.created_at ?? ''
        const roleObj = (user as { role?: unknown } | undefined)?.role
        const roleName = (roleObj as { name?: string } | null)?.name ?? 'DSP'
        return {
          staffId: row.staff_id,
          name: `${firstName} ${lastName}`.trim() || 'Unknown',
          email,
          phone,
          role: roleName,
          submittedAt: data.application_submitted_at ?? '',
          status: data.application_status ?? 'pending',
          createdAt,
          formData: (data.form as unknown as AppFormState | null) ?? null,
        }
      })

      setRecords(built)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!viewingId) return
    const r = records.find(x => x.staffId === viewingId)
    if (!r?.formData) return
    const fd = r.formData
    const docPaths: Record<string, string> = {
      Resume: fd.docResume, 'DL Front': fd.docDLFront, 'DL Back': fd.docDLBack,
      'SSN Card': fd.docSSN, 'EAD Front': fd.docEADFront, 'EAD Back': fd.docEADBack,
      'CPR Cert': fd.docCPR,
    }
    setDocUrls({})
    Promise.all(
      Object.entries(docPaths)
        .filter(([, path]) => !!path)
        .map(async ([label, path]) => {
          const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
          return [label, data?.signedUrl ?? ''] as [string, string]
        })
    ).then(pairs => setDocUrls(Object.fromEntries(pairs.filter(([, url]) => url))))
  }, [viewingId])

  // Reset SSN reveal when the user changes or closes the application view
  useEffect(() => { hideSsn() }, [viewingId])

  useEffect(() => {
    if (!docsViewingId) return
    setDocFiles([])
    setDocsLoading(true)
    fetch(`/api/list-staff-documents?staffId=${docsViewingId}`)
      .then(r => r.json())
      .then(json => { setDocFiles(json.files ?? []); setDocsLoading(false) })
      .catch(() => setDocsLoading(false))
  }, [docsViewingId])

  useEffect(() => {
    if (!progressId) { setProgressData(null); return }
    setProgressLoading(true)
    Promise.all([
      supabase.from('billing_staff_data').select('data').eq('staff_id', progressId).maybeSingle(),
      fetch(`/api/list-staff-documents?staffId=${progressId}`).then(r => r.json()).catch(() => ({ files: [] })),
    ]).then(([{ data }, docsJson]) => {
      const extra = (data?.data ?? {}) as Record<string, unknown>
      const signed = extra.onboarding_forms_signed === 'true'
      const formData = extra.form as AppFormState | undefined
      const allFiles: { folder: string }[] = (docsJson as any).files ?? []
      setProgressData({
        formsSigned: signed,
        formsSignedAt: signed ? ((extra.onboarding_forms_signed_at as string) ?? null) : null,
        eadUploaded: !!(formData?.docEADFront) || allFiles.some(f => f.folder === 'EAD / Green card'),
      })
      setProgressLoading(false)
    })
  }, [progressId])

  async function sendReminder(name: string, email: string) {
    setSendingReminder(true)
    const html = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#004050;padding:24px 28px;border-radius:8px 8px 0 0">
          <h2 style="color:white;margin:0;font-size:18px">Reliance Care Services</h2>
          <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Action Required</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px;background:#fff">
          <p style="margin:0 0 16px;font-size:15px">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">
            This is a friendly reminder that your onboarding process with Reliance Care Services is not yet complete.
            Please log in to the portal and complete your outstanding items as soon as possible.
          </p>
          <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/staff/onboarding"
             style="display:inline-block;padding:12px 24px;background:#008080;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin-bottom:20px">
            Complete Onboarding
          </a>
          <p style="margin:0;font-size:13px;color:#9ca3af">
            If you have any questions, reply to this email or contact us at
            <a href="mailto:admin@reliancecareservicesllc.com" style="color:#008080">admin@reliancecareservicesllc.com</a>.
          </p>
        </div>
      </div>`
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: email, subject: 'Action Required: Complete Your Onboarding — Reliance Care Services', html }),
    })
    if (res.ok) showToast(`Reminder sent to ${name}`)
    else showToast('Failed to send reminder email')
    setSendingReminder(false)
  }

  async function updateStatus(staffId: string, newStatus: string) {
    const { data: existing } = await supabase
      .from('billing_staff_data')
      .select('data')
      .eq('staff_id', staffId)
      .maybeSingle()

    const merged = {
      ...((existing?.data as Record<string, string>) ?? {}),
      application_status: newStatus,
    }

    const { error } = await supabase
      .from('billing_staff_data')
      .upsert({ staff_id: staffId, data: merged })

    if (error) {
      showToast('Error updating status. Please try again.')
    } else {
      setStatusMap(prev => ({ ...prev, [staffId]: newStatus }))
      showToast(`Application ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully.`)
    }
  }

  const filtered = records.filter(r => {
    const effectiveStatus = statusMap[r.staffId] ?? r.status
    const matchFilter = filter === 'All' || effectiveStatus === filter.toLowerCase()
    const q = search.toLowerCase()
    const matchSearch = r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const counts = {
    total: records.length,
    pending:  records.filter(r => (statusMap[r.staffId] ?? r.status) === 'pending').length,
    approved: records.filter(r => (statusMap[r.staffId] ?? r.status) === 'approved').length,
    rejected: records.filter(r => (statusMap[r.staffId] ?? r.status) === 'rejected').length,
  }

  const summaryCards = [
    { label: 'Total applications', value: counts.total,    iconBg: 'rgba(79,70,229,0.1)',  iconColor: '#4f46e5', icon: 'ti-users'       },
    { label: 'Pending review',     value: counts.pending,  iconBg: 'rgba(217,119,6,0.1)',  iconColor: '#d97706', icon: 'ti-clock'       },
    { label: 'Approved',           value: counts.approved, iconBg: 'rgba(16,185,129,0.1)', iconColor: '#059669', icon: 'ti-circle-check' },
    { label: 'Rejected',           value: counts.rejected, iconBg: 'rgba(220,38,38,0.1)',  iconColor: '#dc2626', icon: 'ti-x'           },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#111', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>Hiring</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>DSP application submissions</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: '#f4f5f7' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {summaryCards.map(card => (
            <div key={card.label} style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: card.iconColor, flexShrink: 0 }}>
                <i className={`ti ${card.icon}`} />
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111', lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 15 }} />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, color: '#111', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#008080' : '#fff', color: filter === f ? '#fff' : '#374151', borderColor: filter === f ? '#008080' : '#e5e7eb' }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table or states */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#9ca3af', fontSize: 14 }}>
            Loading applications…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#9ca3af', gap: 12 }}>
            <i className="ti ti-inbox" style={{ fontSize: 40 }} />
            <span style={{ fontSize: 14 }}>No applications found.</span>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Name', 'Email', 'Role', 'Applied', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const effectiveStatus = statusMap[r.staffId] ?? r.status
                  return (
                    <tr key={r.staffId} style={{ borderBottom: i < filtered.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: avatarColor(r.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                            {initials(r.name)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{r.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#6b7280' }}>{r.email}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 600, background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}>{r.role}</span>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>{formatDate(r.submittedAt)}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusPill status={effectiveStatus} />
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => setViewingId(r.staffId)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #008080', background: 'transparent', color: '#008080', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-eye" style={{ fontSize: 13 }} /> View application
                          </button>
                          <button onClick={() => setDocsViewingId(r.staffId)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-folder-open" style={{ fontSize: 13 }} /> View Docs
                          </button>
                          <button onClick={() => setProgressId(r.staffId)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid #0d9488', background: 'transparent', color: '#0d9488', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <i className="ti ti-chart-bar" style={{ fontSize: 13 }} /> View Progress
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents modal */}
      {docsViewingId && (() => {
        const r = records.find(x => x.staffId === docsViewingId)
        if (!r) return null

        const grouped = docFiles.reduce<Record<string, StaffDocFile[]>>((acc, f) => {
          ;(acc[f.folder] ??= []).push(f)
          return acc
        }, {})

        function fmtSize(b: number) {
          if (!b) return ''
          if (b < 1024) return `${b} B`
          if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
          return `${(b / (1024 * 1024)).toFixed(1)} MB`
        }
        function fmtDate(iso: string) {
          if (!iso) return ''
          try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '' }
        }
        function fileIcon(name: string) {
          const ext = name.split('.').pop()?.toLowerCase()
          if (ext === 'pdf') return { icon: 'ti-file-type-pdf', color: '#dc2626' }
          if (['jpg','jpeg','png','gif','webp'].includes(ext ?? '')) return { icon: 'ti-photo', color: '#0d9488' }
          if (['doc','docx'].includes(ext ?? '')) return { icon: 'ti-file-word', color: '#2563eb' }
          return { icon: 'ti-file', color: '#6b7280' }
        }
        function formatDocName(folder: string, staffName: string, raw: string): string {
          const withoutPrefix = raw.replace(/^\d+_/, '')
          const withoutExt = withoutPrefix.replace(/\.[^.]+$/, '')
          const label = withoutExt || withoutPrefix
          return staffName ? `${folder} - ${staffName} - ${label}` : `${folder} - ${label}`
        }

        const folderLabel: Record<string, string> = { application: 'Application Uploads' }

        return (
          <>
            <div onClick={() => setDocsViewingId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#fff', zIndex: 50, boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#6366f1', flexShrink: 0 }}>
                  <i className="ti ti-folder-open" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Uploaded Documents</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{r.name}</div>
                </div>
                <button onClick={() => setDocsViewingId(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {docsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#9ca3af', fontSize: 14, gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                    Loading documents…
                  </div>
                ) : docFiles.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#9ca3af', gap: 12, textAlign: 'center' }}>
                    <i className="ti ti-folder" style={{ fontSize: 40 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 4 }}>No documents found</div>
                      <div style={{ fontSize: 13 }}>This candidate hasn't uploaded any documents yet.</div>
                    </div>
                  </div>
                ) : (
                  Object.entries(grouped).map(([folder, files]) => (
                    <div key={folder} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <i className="ti ti-folder" style={{ fontSize: 15, color: '#6366f1' }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                          {folderLabel[folder] ?? folder}
                        </span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 600 }}>
                          {files.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {files.map(f => {
                          const fi = fileIcon(f.name)
                          return (
                            <div key={f.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: fi.color }}>
                                <i className={`ti ${fi.icon}`} />
                              </div>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatDocName(f.folder, r.name, f.name)}
                                </div>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                  {[fmtSize(f.size), fmtDate(f.createdAt)].filter(Boolean).join(' · ')}
                                </div>
                              </div>
                              {f.signedUrl && (
                                <a
                                  href={f.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, color: '#374151', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 500, whiteSpace: 'nowrap' }}
                                >
                                  <i className="ti ti-external-link" style={{ fontSize: 13 }} /> Open
                                </a>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  {docsLoading ? 'Loading…' : `${docFiles.length} file${docFiles.length !== 1 ? 's' : ''} found`}
                </span>
                <button onClick={() => setDocsViewingId(null)} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Close
                </button>
              </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </>
        )
      })()}

      {/* Onboarding Progress drawer */}
      {progressId && (() => {
        const r = records.find(x => x.staffId === progressId)
        if (!r) return null

        const pd = progressData
        const formsSigned  = pd?.formsSigned  ?? false
        const formsSignedAt = pd?.formsSignedAt ?? null
        const eadUploaded  = pd?.eadUploaded  ?? false

        const signedDate = formsSignedAt
          ? new Date(formsSignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : null

        const onboardItems = [
          { done: true,                              label: 'DSP application submitted'   },
          { done: formsSigned, warn: !formsSigned,   label: 'W4 completed'                },
          { done: formsSigned, warn: !formsSigned,   label: 'Form I-9 submitted'          },
          { done: true,                              label: "Driver's license uploaded"   },
          { done: true,                              label: 'CPR certificate uploaded'    },
          { done: formsSigned, warn: !formsSigned,   label: 'CRO consent signed'          },
          { done: formsSigned, warn: !formsSigned,   label: 'Direct deposit form'         },
          { done: formsSigned, warn: !formsSigned,   label: 'NJ W4'                       },
          { done: formsSigned, warn: !formsSigned,   label: "Danielle's Law sign-off"     },
          { done: formsSigned, warn: !formsSigned,   label: "Stephen Komnino's Law"       },
          { done: formsSigned, warn: !formsSigned,   label: 'Appendix A'                  },
          { done: eadUploaded, warn: !eadUploaded,   label: 'Work authorization uploaded' },
        ]

        const completedCount = onboardItems.filter(i => i.done).length
        const obPct = Math.round((completedCount / onboardItems.length) * 100)

        const effectiveStatus = statusMap[r.staffId] ?? r.status

        return (
          <>
            <div onClick={() => setProgressId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, background: '#fff', zIndex: 50, boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ background: '#0d2d5e', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Onboarding Progress</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{r.name}</div>
                </div>
                {formsSigned && signedDate && (
                  <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 10, background: 'rgba(48,176,96,0.25)', color: '#4ade80', fontWeight: 600 }}>
                    Forms signed {signedDate}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{obPct}%</span>
                <button onClick={() => setProgressId(null)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {progressLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64, color: '#9ca3af', fontSize: 14, gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                    Loading progress…
                  </div>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#374151' }}>Overall progress</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#008080' }}>{obPct}%</span>
                      </div>
                      <div style={{ height: 9, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'linear-gradient(90deg,#008080,#30B060)', borderRadius: 5, width: `${obPct}%`, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'rgba(48,176,96,0.1)', color: '#30B060', fontWeight: 500 }}>{completedCount} completed</span>
                        <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 10, background: 'rgba(186,117,23,0.1)', color: '#BA7517', fontWeight: 500 }}>{onboardItems.length - completedCount} pending</span>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                      {onboardItems.map((item, i) => {
                        const iconBg    = item.done ? 'rgba(48,176,96,0.1)'  : 'miss' in item && item.miss ? 'rgba(226,75,74,0.1)'  : 'rgba(186,117,23,0.1)'
                        const iconColor = item.done ? '#30B060'              : 'miss' in item && item.miss ? '#E24B4A'              : '#BA7517'
                        const icon      = item.done ? 'ti-check'             : 'miss' in item && item.miss ? 'ti-x'                 : 'ti-clock'
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', border: `1px solid ${item.done ? 'rgba(48,176,96,0.2)' : '#e5e7eb'}`, borderRadius: 8, background: item.done ? 'rgba(48,176,96,0.04)' : '#fff' }}>
                            <div style={{ width: 21, height: 21, borderRadius: '50%', background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
                              <i className={`ti ${icon}`} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: item.done ? '#15803d' : '#111' }}>{item.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {(effectiveStatus === 'pending' || effectiveStatus === 'rejected') && (
                  <button
                    onClick={() => { updateStatus(r.staffId, 'approved'); setProgressId(null) }}
                    style={{ padding: '8px 16px', borderRadius: 7, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <i className="ti ti-check" /> Approve
                  </button>
                )}
                {effectiveStatus === 'approved' && (
                  <button
                    onClick={() => { updateStatus(r.staffId, 'pending'); setProgressId(null) }}
                    style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Revoke
                  </button>
                )}
                <button
                  onClick={() => sendReminder(r.name, r.email)}
                  disabled={sendingReminder}
                  style={{ padding: '8px 16px', borderRadius: 7, border: '1px solid #3b82f6', background: 'transparent', color: '#2563eb', fontSize: 13, fontWeight: 500, cursor: sendingReminder ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 5, opacity: sendingReminder ? 0.7 : 1 }}
                >
                  <i className={`ti ${sendingReminder ? 'ti-loader-2' : 'ti-mail'}`} />
                  {sendingReminder ? 'Sending…' : 'Send Reminder Email'}
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setProgressId(null)} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Close
                </button>
              </div>
            </div>
          </>
        )
      })()}

      {/* Application detail drawer */}
      {viewingId && (() => {
        const r = records.find(x => x.staffId === viewingId)
        if (!r) return null
        const effectiveStatus = statusMap[r.staffId] ?? r.status

        const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#6b7280', flexShrink: 0 }}>
              <i className={`ti ${icon}`} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>{label}</div>
              <div style={{ fontSize: 13, color: '#111', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
            </div>
          </div>
        )

        return (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setViewingId(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40 }}
            />
            {/* Drawer */}
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 420, background: '#fff', zIndex: 50, boxShadow: '-4px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* Drawer header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>Application Details</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>Submitted {formatDate(r.submittedAt)}</div>
                </div>
                <button
                  onClick={() => setViewingId(null)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#6b7280' }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Drawer body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

                {/* Applicant card */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', background: '#f9fafb', borderRadius: 12, marginBottom: 20, border: '1px solid #e5e7eb' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarColor(r.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(r.name)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{r.email}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: 'rgba(79,70,229,0.1)', color: '#4f46e5' }}>{r.role}</span>
                      <StatusPill status={effectiveStatus} />
                    </div>
                  </div>
                </div>

                {r.formData ? (() => {
                  const fd = r.formData!

                  const Section = ({ title }: { title: string }) => (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8, marginTop: 4 }}>{title}</div>
                  )
                  const Card = ({ children }: { children: React.ReactNode }) => (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px', marginBottom: 16 }}>{children}</div>
                  )
                  const Row = ({ label, value }: { label: string; value?: string | boolean | string[] }) => {
                    const display = Array.isArray(value) ? (value.length ? value.join(', ') : '—') : value === true ? 'Yes' : value === false ? 'No' : value || '—'
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 12, color: '#111', wordBreak: 'break-word' }}>{display}</span>
                      </div>
                    )
                  }

                  return (
                    <>
                      <Section title="Personal Information" />
                      <Card>
                        <Row label="Full name" value={[fd.firstName, fd.middleName, fd.lastName].filter(Boolean).join(' ')} />
                        <Row label="Email" value={fd.email} />
                        <Row label="Phone" value={fd.phone} />
                        <Row label="Date of birth" value={fd.dob} />
                        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, padding: '5px 0', borderBottom: '1px solid #f9fafb' }}>
                          {docUrls['SSN Card'] && ssnCountdown === 0 ? (
                            <button onClick={revealSsn} style={{ fontSize: 11, color: '#0891b2', fontWeight: 600, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              SSN (Click to view)
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>SSN</span>
                          )}
                          <div>
                            {docUrls['SSN Card'] ? (
                              ssnCountdown > 0 ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Visible for {ssnCountdown}s…</span>
                                    <button onClick={hideSsn} style={{ fontSize: 11, color: '#dc2626', background: 'none', border: '1px solid #fca5a5', borderRadius: 4, padding: '1px 7px', cursor: 'pointer', fontFamily: 'inherit' }}>Hide now</button>
                                  </div>
                                  <iframe src={docUrls['SSN Card']} title="SSN Card" style={{ width: '100%', height: 200, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                                </div>
                              ) : null
                            ) : (
                              <span style={{ fontSize: 12, color: '#111' }}>{fd.ssnProvided ? 'Provided ✓' : 'Not provided'}</span>
                            )}
                          </div>
                        </div>
                        <Row label="Address" value={[fd.address1, fd.address2, fd.city, fd.state, fd.zip].filter(Boolean).join(', ')} />
                      </Card>

                      <Section title="Availability" />
                      <Card>
                        <Row label="Allergies" value={fd.allergies} />
                        <Row label="Work holidays" value={fd.canWorkHolidays} />
                        <Row label="Days available" value={fd.daysAvailable} />
                        <Row label="Preferred shifts" value={fd.preferredShifts} />
                        <Row label="Start date" value={fd.dateAvailable} />
                        <Row label="Heard about us" value={fd.heardAbout} />
                        <Row label="Position" value={fd.positionApplying} />
                        <Row label="Assignment type" value={fd.assignmentType} />
                      </Card>

                      <Section title="Eligibility" />
                      <Card>
                        <Row label="US citizen" value={fd.isCitizen} />
                        {fd.isCitizen === 'No' && <Row label="Authorized to work" value={fd.isAuthorizedWork} />}
                        <Row label="Worked here before" value={fd.workedBefore} />
                        {fd.workedBefore === 'Yes' && <Row label="When" value={fd.workedBeforeWhen} />}
                        <Row label="BG check consent" value={fd.bgCheck} />
                        {fd.bgCheckExplain && <Row label="BG explanation" value={fd.bgCheckExplain} />}
                        <Row label="Malpractice ins." value={fd.malpractice} />
                        {fd.malpracticeCarrier && <Row label="Carrier" value={fd.malpracticeCarrier} />}
                      </Card>

                      {fd.schools?.length > 0 && (
                        <>
                          <Section title="Education History" />
                          {fd.schools.filter(s => s.name).map((s, i) => (
                            <Card key={i}>
                              <Row label="School" value={s.name} />
                              <Row label="Period" value={`${s.from || '?'} – ${s.to || '?'}`} />
                              <Row label="Graduated" value={s.graduated} />
                              <Row label="Diploma / GED" value={s.diploma} />
                              <Row label="Degree" value={s.degree} />
                            </Card>
                          ))}
                        </>
                      )}

                      {fd.employers?.length > 0 && (
                        <>
                          <Section title="Employment History" />
                          {fd.employers.filter(e => e.company).map((e, i) => (
                            <Card key={i}>
                              <Row label="Company" value={e.company} />
                              <Row label="Title" value={e.title} />
                              <Row label="Supervisor" value={e.supervisor} />
                              <Row label="Responsibilities" value={e.responsibilities} />
                              <Row label="Reason left" value={e.reasonLeaving} />
                              <Row label="Can contact" value={e.canContact} />
                            </Card>
                          ))}
                        </>
                      )}

                      {fd.references?.length > 0 && (
                        <>
                          <Section title="References" />
                          <Card>
                            {fd.references.filter(r => r.name).map((r, i) => (
                              <Row key={i} label={`Ref ${i + 1}`} value={`${r.name} · ${r.years}`} />
                            ))}
                          </Card>
                        </>
                      )}

                      <Section title="Emergency Contact" />
                      <Card>
                        <Row label="Name" value={fd.emergencyName} />
                        <Row label="Relationship" value={fd.emergencyRelationship} />
                        <Row label="Phone" value={fd.emergencyPhone} />
                      </Card>

                      <Section title="Document Expiry Dates" />
                      <Card>
                        <Row label="DL expiry" value={fd.dlExpiry} />
                        <Row label="EAD expiry" value={fd.eadExpiry} />
                        <Row label="CPR expiry" value={fd.cprExpiry} />
                      </Card>

                      <Section title="Uploaded Documents" />
                      <Card>
                        {Object.entries(docUrls).length === 0 && !fd.docResume && !fd.docDLFront && !fd.docCPR ? (
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>No documents uploaded.</div>
                        ) : Object.entries(docUrls).length === 0 ? (
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>Generating links…</div>
                        ) : (
                          Object.entries(docUrls).map(([label, url]) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{label}</span>
                              <a href={url} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: '#008080', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', border: '1px solid rgba(0,128,128,0.3)', borderRadius: 6 }}>
                                <i className="ti ti-download" style={{ fontSize: 12 }} /> Open
                              </a>
                            </div>
                          ))
                        )}
                      </Card>

                      <Section title="Signature" />
                      <Card>
                        <Row label="Signed name" value={fd.signatureName} />
                        <Row label="Date signed" value={fd.signatureDate} />
                        {fd.signatureData && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 4 }}>DRAWN SIGNATURE</div>
                            <img
                              src={fd.signatureData}
                              alt="Applicant signature"
                              style={{ maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', display: 'block' }}
                            />
                          </div>
                        )}
                      </Card>

                      <Section title="Timeline" />
                      <Card>
                        <Row label="Account created" value={formatDate(r.createdAt)} />
                        <Row label="App submitted" value={formatDate(r.submittedAt)} />
                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, padding: '5px 0' }}>
                          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Status</span>
                          <StatusPill status={effectiveStatus} />
                        </div>
                      </Card>
                    </>
                  )
                })() : (
                  <>
                    <DetailRow icon="ti-mail"      label="Email"            value={r.email} />
                    <DetailRow icon="ti-phone"     label="Phone"            value={r.phone} />
                    <DetailRow icon="ti-user-plus" label="Account created"  value={formatDate(r.createdAt)} />
                    <DetailRow icon="ti-send"      label="App submitted"    value={formatDate(r.submittedAt)} />
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 12, textAlign: 'center' }}>
                      Full application data not yet available — candidate may not have submitted via the new form.
                    </div>
                  </>
                )}

              </div>

              {/* Drawer footer actions */}
              <div style={{ padding: '14px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {effectiveStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => { updateStatus(r.staffId, 'approved'); setViewingId(null) }}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <i className="ti ti-check" /> Approve
                    </button>
                    <button
                      onClick={() => { updateStatus(r.staffId, 'rejected'); setViewingId(null) }}
                      style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <i className="ti ti-x" /> Reject
                    </button>
                  </>
                )}
                {effectiveStatus === 'approved' && (
                  <button
                    onClick={() => { updateStatus(r.staffId, 'pending'); setViewingId(null) }}
                    style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Revoke approval
                  </button>
                )}
                {effectiveStatus === 'rejected' && (
                  <button
                    onClick={() => { updateStatus(r.staffId, 'approved'); setViewingId(null) }}
                    style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                  >
                    <i className="ti ti-check" /> Approve
                  </button>
                )}
                <button
                  onClick={() => setViewingId(null)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )
      })()}
    </div>
  )
}
